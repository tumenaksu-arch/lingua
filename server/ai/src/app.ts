import { createHash } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { verifyUserId } from "./auth.js";
import { chatOnce, createClaudeClient, type ClaudeConfig } from "./claude.js";
import { buildMessages, buildSystemBlocks } from "./prompt.js";
import { COURSES, getCourse, getScenario } from "./scenarios.js";
import { ChatBodySchema } from "./schema.js";
import { usageRecord, usageRemaining, usageTake, type UsageConfig } from "./usage.js";

export interface AppConfig {
  port: number;
  anthropicApiKey: string;
  jwtSecret: string;
  usage: UsageConfig;
  claude: ClaudeConfig;
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
      effort: (env.AI_EFFORT ?? "low") as ClaudeConfig["effort"],
    },
  };
}

function userHash(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function buildApp(cfg: AppConfig): FastifyInstance {
  const app = Fastify({ logger: true });
  const claudeClient = cfg.anthropicApiKey ? createClaudeClient(cfg.anthropicApiKey) : null;

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
    return { enabled: cfg.anthropicApiKey.length > 0, limit: cfg.usage.dailyLimit, remaining };
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

    // 1) Doğrulama
    const parsed = ChatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(400, "bad_request", "Geçersiz istek: courseId, scenarioId, history (≤ 20 öğe, öğe başına ≤ 600 karakter) ve message (1-500 karakter) gerekli.");
    }
    const body = parsed.data;

    // 2) Yapılandırma / senaryo kontrolü
    if (!claudeClient) {
      return fail(503, "not_configured", "Yapay zekâ özelliği şu anda yapılandırılmamış.");
    }
    const course = getCourse(body.courseId);
    const scenario = course && getScenario(body.courseId, body.scenarioId);
    if (!course || !scenario) {
      return fail(400, "bad_request", "Bilinmeyen kurs veya senaryo.");
    }

    // 3) Kimlik doğrulama
    const auth = await verifyUserId(req.headers.authorization, cfg.jwtSecret);
    if (!auth.ok || !auth.userId) {
      return fail(401, "auth", "Oturum doğrulanamadı, lütfen tekrar giriş yap.");
    }
    const userId = auth.userId;
    logUser = userHash(userId);

    // 4) Günlük sınır: bir mesaj rezerve et
    let usedAfterTake: number;
    try {
      usedAfterTake = await usageTake(cfg.usage, userId);
    } catch (err) {
      req.log.error({ err, user: logUser }, "usage_take_failed");
      return fail(502, "upstream", "Kullanım sayacına ulaşılamadı, lütfen tekrar dene.");
    }
    if (usedAfterTake < 0) {
      return fail(429, "limit", "Bugünlük yapay zekâ mesaj limitin doldu, yarın tekrar dene.", {
        remaining: 0,
      });
    }

    // 5) Claude çağrısı
    const system = buildSystemBlocks(course, scenario);
    const messages = buildMessages(body.history, body.message);
    try {
      const response = await chatOnce(claudeClient, cfg.claude, system, messages);
      if (response.stop_reason === "refusal") {
        await usageRecord(cfg.usage, userId, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Bu konuda şu anda yardımcı olamıyorum, konuyu değiştirelim.");
      }
      const output = response.parsed_output;
      if (!output) {
        await usageRecord(cfg.usage, userId, 0, 0, true).catch((err) =>
          req.log.error({ err, user: logUser }, "usage_refund_failed"),
        );
        return fail(502, "upstream", "Yanıt alınamadı, lütfen tekrar dene.");
      }
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      await usageRecord(cfg.usage, userId, inputTokens, outputTokens, false).catch((err) =>
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
        remaining: Math.max(0, cfg.usage.dailyLimit - usedAfterTake),
      };
    } catch (err) {
      await usageRecord(cfg.usage, userId, 0, 0, true).catch((refundErr) =>
        req.log.error({ err: refundErr, user: logUser }, "usage_refund_failed"),
      );
      req.log.warn({ err, user: logUser, status: 502, latencyMs: Date.now() - startedAt }, "chat_upstream_error");
      return fail(502, "upstream", "Beklenmedik bir hata oluştu, lütfen tekrar dene.");
    }
  });

  return app;
}

export { COURSES };
