import { createHash } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { verifyUserId } from "./auth.js";
import { chatOnce, createClaudeClient, explainOnce, type ClaudeConfig } from "./claude.js";
import { compatChatOnce, compatExplainOnce, type OpenAICompatConfig } from "./openaiCompat.js";
import { buildExplainBlocks, buildExplainMessages, buildMessages, buildSystemBlocks } from "./prompt.js";
import { COURSES, getCourse, getScenario } from "./scenarios.js";
import { ChatBodySchema, ExplainBodySchema } from "./schema.js";
import { usageRecord, usageRemaining, usageTake, type UsageConfig, type UsageTakeResult } from "./usage.js";

export interface AppConfig {
  port: number;
  anthropicApiKey: string;
  jwtSecret: string;
  usage: UsageConfig;
  claude: ClaudeConfig;
  /** OpenAI uyumlu yedek sağlayıcı (NVIDIA). Claude anahtarı varsa Claude önceliklidir. */
  nvidia: OpenAICompatConfig;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 8080) || 8080,
    anthropicApiKey: env.ANTHROPIC_API_KEY ?? "",
    jwtSecret: env.SUPABASE_JWT_SECRET ?? "",
    usage: {
      restUrl: (env.SUPABASE_REST_URL ?? "").replace(/\/$/, ""),
      serviceKey: env.SUPABASE_SERVICE_KEY ?? "",
      dailyLimit: Number(env.AI_DAILY_LIMIT ?? 30) || 30,
      globalCap: Number(env.AI_GLOBAL_DAILY_CAP ?? 3000) || 3000,
    },
    claude: {
      apiKey: env.ANTHROPIC_API_KEY ?? "",
      model: env.AI_MODEL ?? "claude-opus-5-5",
      effort: parseEffort(env.AI_EFFORT),
    },
    nvidia: {
      apiKey: env.NVIDIA_API_KEY ?? "",
      baseUrl: env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
      model: env.NVIDIA_MODEL ?? "mistralai/mistral-large-4-1t-a52b",
    },
  };
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;

/**
 * AI_EFFORT beyaz liste ile doğrulanır: yazım hatası bir değer (ör. "LOW")
 * her Claude çağrısını API 400 ile kalıcı 502'ye çevirir. Geçersizde "low"a
 * düşülür ve bir uyarı verilir.
 */
function parseEffort(raw: string | undefined): ClaudeConfig["effort"] {
  if (!raw) return "low";
  const value = raw.toLowerCase();
  if ((EFFORTS as readonly string[]).includes(value)) return value as ClaudeConfig["effort"];
  console.warn(`[ai] Geçersiz AI_EFFORT "${raw}", "low" kullanılıyor.`);
  return "low";
}

function userHash(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function buildApp(cfg: AppConfig): FastifyInstance {
  const app = Fastify({ logger: true });
  const claudeClient = cfg.anthropicApiKey ? createClaudeClient(cfg.anthropicApiKey) : null;
  // Tek giriş noktası: Claude anahtarı varsa Claude, yoksa NVIDIA (OpenAI uyumlu), ikisi de yoksa null (503).
  const nvidia = cfg.nvidia;
  const llm = claudeClient
    ? {
        chat: (system: Parameters<typeof chatOnce>[2], messages: Parameters<typeof chatOnce>[3]) =>
          chatOnce(claudeClient, cfg.claude, system, messages),
        explain: (system: Parameters<typeof explainOnce>[2], messages: Parameters<typeof explainOnce>[3]) =>
          explainOnce(claudeClient, cfg.claude, system, messages),
      }
    : nvidia.apiKey
      ? {
          chat: (system: Parameters<typeof chatOnce>[2], messages: Parameters<typeof chatOnce>[3]) =>
            compatChatOnce(nvidia, system, messages),
          explain: (system: Parameters<typeof explainOnce>[2], messages: Parameters<typeof explainOnce>[3]) =>
            compatExplainOnce(nvidia, system, messages),
        }
      : null;

  // CORS: aynı kaynak yayın; kimlik bilgisi içermeyen minimal yanıt.
  app.addHook("onRequest", (req, reply, done) => {
    reply.header("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      reply
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .status(204)
        .send();
      return;
    }
    done();
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/v1/status", async (req) => {
    const auth = await verifyUserId(req.headers.authorization, cfg.jwtSecret);
    let remaining: number | null = null;
    if (auth.ok && auth.userId) {
      try {
        remaining = await usageRemaining(cfg.usage, auth.userId);
      } catch (err) {
        req.log.warn({ err }, "usage_remaining_failed");
      }
    }
    return { enabled: llm !== null, limit: cfg.usage.dailyLimit, remaining };
  });

  app.get("/v1/scenarios", async (req, reply) => {
    const { courseId } = req.query as { courseId?: string };
    const course = courseId ? getCourse(courseId) : undefined;
    if (!course) {
      return reply
        .status(400)
        .send({ error: "bad_request", message: "Bilinmeyen kurs (courseId)." });
    }
    return { scenarios: course.scenarios };
  });

  app.post("/v1/chat", async (req, reply) => {
    const startedAt = Date.now();
    let logUser = "-";
    const fail = (status: number, error: string, message: string, extra?: object) =>
      reply.status(status).send({ error, message, ...extra });

    // 1) Kimlik doğrulama — her zaman ilk: doğrulanamayan çağıran gövde/
    // yapılandırma durumundan bağımsız olarak her zaman 401 alır.
    const auth = await verifyUserId(req.headers.authorization, cfg.jwtSecret);
    if (!auth.ok || !auth.userId) {
      return fail(401, "auth", "Oturum doğrulanamadı, lütfen tekrar giriş yap.");
    }
    const userId = auth.userId;
    logUser = userHash(userId);

    // 2) Doğrulama
    const parsed = ChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(400, "bad_request", "Geçersiz istek: courseId, scenarioId, history (≤ 20 öğe, öğe başına ≤ 600 karakter) ve message (1-500 karakter) gerekli.");
    }
    const body = parsed.data;

    // 3) Yapılandırma / senaryo kontrolü (doğrulanmış çağrana 503)
    if (!llm) {
      return fail(503, "not_configured", "Yapay zekâ özelliği şu anda yapılandırılmamış.");
    }
    const course = getCourse(body.courseId);
    const scenario = course && getScenario(body.courseId, body.scenarioId);
    if (!course || !scenario) {
      return fail(400, "bad_request", "Bilinmeyen kurs veya senaryo.");
    }

    // 4) Günlük sınır: bir mesaj rezerve et
    let take: UsageTakeResult;
    try {
      take = await usageTake(cfg.usage, userId);
    } catch (err) {
      req.log.error({ err, user: logUser }, "usage_take_failed");
      return fail(502, "upstream", "Kullanım sayacına ulaşılamadı, lütfen tekrar dene.");
    }
    if (take.used < 0) {
      return fail(429, "limit", "Bugünlük yapay zekâ mesaj limitin doldu, yarın tekrar dene.", {
        remaining: 0,
      });
    }

    // 5) Claude çağrısı
    const system = buildSystemBlocks(course, scenario);
    const messages = buildMessages(body.history, body.message);
    try {
      const response = await llm.chat(system, messages);
      if (response.stop_reason === "refusal") {
        await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Bu konuda şu anda yardımcı olamıyorum, konuyu değiştirelim.");
      }
      const output = response.parsed_output;
      if (!output) {
        await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Yanıt alınamadı, lütfen tekrar dene.");
      }
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      await usageRecord(cfg.usage, userId, take.day, inputTokens, outputTokens, false).catch((err) =>
        req.log.error({ err, user: logUser }, "usage_record_failed"),
      );
      req.log.info(
        { user: logUser, status: 200, latencyMs: Date.now() - startedAt, inputTokens, outputTokens },
        "chat_ok",
      );
      return {
        reply: output.reply,
        replyTr: output.replyTr,
        correction: output.correction ?? null,
        done: output.done,
        remaining: Math.max(0, cfg.usage.dailyLimit - take.used),
      };
    } catch (err) {
      await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((refundErr) =>
        req.log.error({ err: refundErr, user: logUser }, "usage_refund_failed"),
      );
      req.log.warn({ err, user: logUser, status: 502, latencyMs: Date.now() - startedAt }, "chat_upstream_error");
      return fail(502, "upstream", "Beklenmedik bir hata oluştu, lütfen tekrar dene.");
    }
  });

  app.post("/v1/explain", async (req, reply) => {
    const startedAt = Date.now();
    let logUser = "-";
    const fail = (status: number, error: string, message: string, extra?: object) =>
      reply.status(status).send({ error, message, ...extra });

    // 1) Kimlik doğrulama — /v1/chat ile aynı sıra: doğrulanamayan çağrılan
    // her zaman 401 alır.
    const auth = await verifyUserId(req.headers.authorization, cfg.jwtSecret);
    if (!auth.ok || !auth.userId) {
      return fail(401, "auth", "Oturum doğrulanamadı, lütfen tekrar giriş yap.");
    }
    const userId = auth.userId;
    logUser = userHash(userId);

    // 2) Doğrulama
    const parsed = ExplainBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(400, "bad_request", "Geçersiz istek: courseId, exerciseType, prompt (≤ 400), userAnswer (≤ 400) ve correctAnswer (≤ 400) gerekli.");
    }
    const body = parsed.data;

    // 3) Yapılandırma / kurs kontrolü (doğrulanmış çağrana 503)
    if (!llm) {
      return fail(503, "not_configured", "Yapay zekâ özelliği şu anda yapılandırılmamış.");
    }
    const course = getCourse(body.courseId);
    if (!course) {
      return fail(400, "bad_request", "Bilinmeyen kurs (courseId).");
    }

    // 4) Günlük sınır: bir açıklama da 1 mesaj sayılır (aynı sayaç)
    let take: UsageTakeResult;
    try {
      take = await usageTake(cfg.usage, userId);
    } catch (err) {
      req.log.error({ err, user: logUser }, "usage_take_failed");
      return fail(502, "upstream", "Kullanım sayacına ulaşılamadı, lütfen tekrar dene.");
    }
    if (take.used < 0) {
      return fail(429, "limit", "Bugünlük yapay zekâ mesaj limitin doldu, yarın tekrar dene.", {
        remaining: 0,
      });
    }

    // 5) Claude çağrısı — günlükte metin YOK (yalnız kullanıcı hash'i, durum,
    // süre, token).
    const system = buildExplainBlocks(course, body.exerciseType);
    const messages = buildExplainMessages(body);
    try {
      const response = await llm.explain(system, messages);
      if (response.stop_reason === "refusal") {
        await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Bu konuda şu anda yardımcı olamıyorum, lütfen tekrar dene.");
      }
      const output = response.parsed_output;
      if (!output) {
        await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Yanıt alınamadı, lütfen tekrar dene.");
      }
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      await usageRecord(cfg.usage, userId, take.day, inputTokens, outputTokens, false).catch((err) =>
        req.log.error({ err, user: logUser }, "usage_record_failed"),
      );
      req.log.info(
        { user: logUser, status: 200, latencyMs: Date.now() - startedAt, inputTokens, outputTokens },
        "explain_ok",
      );
      return {
        explanation: output.explanation,
        tip: output.tip ?? null,
        remaining: Math.max(0, cfg.usage.dailyLimit - take.used),
      };
    } catch (err) {
      await usageRecord(cfg.usage, userId, take.day, 0, 0, true).catch((refundErr) =>
        req.log.error({ err: refundErr, user: logUser }, "usage_refund_failed"),
      );
      req.log.warn({ err, user: logUser, status: 502, latencyMs: Date.now() - startedAt }, "explain_upstream_error");
      return fail(502, "upstream", "Beklenmedik bir hata oluştu, lütfen tekrar dene.");
    }
  });

  return app;
}

export { COURSES };
