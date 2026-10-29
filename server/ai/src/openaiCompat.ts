import type Anthropic from "@anthropic-ai/sdk";
import { z, type ZodType } from "zod/v4";
import { ChatReplySchema, ExplainOutputSchema, type ChatReply, type ExplainOutput } from "./schema.js";

/**
 * OpenAI uyumlu sağlayıcı (NVIDIA build.nvidia.com: https://integrate.api.nvidia.com/v1).
 * Claude yoluyla AYNI istem bloklarını ve zod şemalarını kullanır; yanıtı Claude'un
 * `ParsedMessage` biçiminin app.ts'nin okuduğu alt kümesine çevirir, böylece uçlar
 * (kota, iade, günlük) sağlayıcıdan bağımsız kalır.
 *
 * Yapılandırılmış çıktı: katalogdaki modellerin hepsi `response_format`/guided JSON
 * desteklemediği için şema sistem istemine JSON Schema olarak yazılır, yanıt metnindeki
 * JSON nesnesi ayıklanıp zod ile doğrulanır; geçersizse bir kez düzeltme istenir.
 */
export interface OpenAICompatConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  /**
   * Akıl yürüten modeller (ör. Mistral Large 4) önce `reasoning_content` üretir; sınırsızken
   * max_tokens'ı tüketip `content: null` döndürür. "low" bunu kısaltır; boş dize = gönderme
   * (bu parametreyi tanımayan modeller için).
   */
  reasoningEffort?: string;
  /** Toplam süre bütçesi (tüm denemeler); istemci 55 s bekler. */
  timeoutMs?: number;
}

/** app.ts'nin okuduğu alanlar (Claude `ParsedMessage` ile aynı adlar). */
export interface CompatResult<T> {
  stop_reason: "end_turn" | "refusal";
  parsed_output: T | null;
  usage: { input_tokens: number; output_tokens: number };
}

type OAMessage = { role: "system" | "user" | "assistant"; content: string };

function blockText(content: Anthropic.MessageParam["content"]): string {
  if (typeof content === "string") return content;
  return content.map((b) => ("text" in b && typeof b.text === "string" ? b.text : "")).join("\n");
}

/** Yanıt metninden ilk dengeli JSON nesnesini çıkarır (```json çitleri, <think> blokları, önsöz atlanır). */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const start = cleaned.indexOf("{");
  if (start < 0) return undefined;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(cleaned.slice(start, i + 1));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function jsonInstruction(schema: ZodType): string {
  return `Output format: respond with ONE JSON object only — no prose, no markdown fences — that validates against this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
}

async function complete(cfg: OpenAICompatConfig, messages: OAMessage[], budgetMs: number): Promise<{ text: string; inTok: number; outTok: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), budgetMs);
  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        // akıl yürütme + yanıt birlikte sığsın (yanıtın kendisi şema gereği kısa)
        max_tokens: 2500,
        temperature: 0.4,
        stream: false,
        ...(cfg.reasoningEffort ? { reasoning_effort: cfg.reasoningEffort } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    const data = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      inTok: data.usage?.prompt_tokens ?? 0,
      outTok: data.usage?.completion_tokens ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function parseOnce<T>(
  cfg: OpenAICompatConfig,
  schema: ZodType<T>,
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
): Promise<CompatResult<T>> {
  const convo: OAMessage[] = [
    { role: "system", content: `${system.map((b) => b.text).join("\n\n")}\n\n${jsonInstruction(schema)}` },
    ...messages.map((m) => ({ role: m.role, content: blockText(m.content) }) as OAMessage),
  ];
  let inTok = 0;
  let outTok = 0;
  // En fazla iki deneme: ikincisinde modelden geçerli JSON'u yeniden yazması istenir.
  // Bütçe paylaşımı: yavaş ama geçerli ilk yanıt tüm bütçeyi kullanabilir; düzeltme denemesi
  // yalnız en az 8 s kaldıysa yapılır.
  const deadline = Date.now() + (cfg.timeoutMs ?? 50_000);
  for (let attempt = 0; attempt < 2; attempt++) {
    const left = deadline - Date.now();
    if (attempt > 0 && left < 8_000) break;
    const r = await complete(cfg, convo, left);
    inTok += r.inTok;
    outTok += r.outTok;
    const parsed = schema.safeParse(extractJsonObject(r.text));
    if (parsed.success) return { stop_reason: "end_turn", parsed_output: parsed.data, usage: { input_tokens: inTok, output_tokens: outTok } };
    // Boş yanıt (yalnız akıl yürütme, içerik null): boş bir asistan mesajı eklemek API'de 400
    // verir — aynı isteği yeniden dene.
    if (!r.text.trim()) continue;
    convo.push(
      { role: "assistant", content: r.text.slice(0, 2000) },
      { role: "user", content: "That was not valid. Reply again with ONLY the JSON object matching the schema." },
    );
  }
  return { stop_reason: "end_turn", parsed_output: null, usage: { input_tokens: inTok, output_tokens: outTok } };
}

export function compatChatOnce(
  cfg: OpenAICompatConfig,
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
): Promise<CompatResult<ChatReply>> {
  return parseOnce(cfg, ChatReplySchema, system, messages);
}

export function compatExplainOnce(
  cfg: OpenAICompatConfig,
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
): Promise<CompatResult<ExplainOutput>> {
  return parseOnce(cfg, ExplainOutputSchema, system, messages);
}
