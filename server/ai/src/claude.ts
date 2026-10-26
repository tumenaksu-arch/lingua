import Anthropic from "@anthropic-ai/sdk";
import type { ParsedMessage } from "@anthropic-ai/sdk/lib/parser";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ChatReplySchema, type ChatReply } from "./schema.js";

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  effort: "low" | "medium" | "high" | "xhigh" | "max";
}

export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
}

/**
 * client.messages.parse + output_config.format (zodOutputFormat) kullanır.
 *
 * NOT (server-side refusal fallback): Dokümanlardaki `fallbacks: "default"`
 * parametresi yalnızca beta istek gövdesinde (`client.beta.messages.create`,
 * `betas: ["server-side-fallback-2026-07-01"]`) tanımlıdır; kararlı
 * `messages.parse` yardımcısı bu parametreyi/beta başlığını taşıyamaz
 * (SDK tiplerinde yok). Bu yüzden fallback bu sürümde atlanır; red
 * durumunda stop_reason === "refusal" 502 olarak ele alınır.
 *
 * Sıcaklık/top-p/top-k ASLA gönderilmez (model ailesi bunları reddeder).
 */
export async function chatOnce(
  client: Anthropic,
  cfg: ClaudeConfig,
  system: Anthropic.TextBlockParam[],
  messages: Anthropic.MessageParam[],
): Promise<ParsedMessage<ChatReply>> {
  return client.messages.parse({
    model: cfg.model,
    max_tokens: 2000,
    system,
    messages,
    output_config: {
      effort: cfg.effort,
      format: zodOutputFormat(ChatReplySchema),
    },
  });
}
