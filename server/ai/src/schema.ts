import { z } from "zod/v4";

// Claude'dan zorunlu kılınan yapılandırılmış yanıt şeması
// (client.messages.parse + zodOutputFormat ile kullanılır).
export const ChatReplySchema = z.object({
  reply: z.string(),
  replyTr: z.string(),
  correction: z
    .object({
      original: z.string(),
      corrected: z.string(),
      explanationTr: z.string(),
    })
    .nullable(),
  done: z.boolean(),
});

export type ChatReply = z.infer<typeof ChatReplySchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(600),
});

export const ChatBodySchema = z.object({
  courseId: z.string().min(1).max(20),
  scenarioId: z.string().min(1).max(40),
  history: z.array(ChatMessageSchema).max(20),
  message: z.string().min(1).max(500),
});
