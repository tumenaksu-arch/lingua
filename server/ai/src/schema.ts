import { z } from "zod/v4";

// Claude'dan zorunlu kılınan yapılandırılmış yanıt şeması
// (client.messages.parse + zodOutputFormat ile kullanılır).
export const ChatReplySchema = z.object({
  // Uzunluk sınırları: zodOutputFormat yalnızca tipleri zorunlu kılar; başıboş
  // bir yanıt istemciye aynen iletilip faturalanır. 1-3 kısa cümle kuralıyla
  // tutarlı zarfsal üst sınırlar.
  reply: z.string().max(1000),
  replyTr: z.string().max(1000),
  correction: z
    .object({
      original: z.string(),
      corrected: z.string(),
      explanationTr: z.string().max(300),
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

// "Cevabımı açıkla" ucunun Claude'dan zorunlu kılınan yapılandırılmış yanıtı.
export const ExplainOutputSchema = z.object({
  // Türkçe, en fazla ~4 kısa cümle kuralıyla tutarlı zarfsal üst sınırlar.
  explanation: z.string().max(1000),
  tip: z.string().max(300).optional(),
});

export type ExplainOutput = z.infer<typeof ExplainOutputSchema>;

export const ExplainBodySchema = z.object({
  courseId: z.string().min(1).max(20),
  exerciseType: z.string().min(1).max(40),
  prompt: z.string().min(1).max(400),
  userAnswer: z.string().min(1).max(400),
  correctAnswer: z.string().min(1).max(400),
});
