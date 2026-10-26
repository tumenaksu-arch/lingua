import { describe, expect, it } from "vitest";

import { ChatBodySchema, ChatReplySchema } from "../src/schema.js";

const validReply = {
  reply: "Nice to meet you!",
  replyTr: "Tanıştığımıza sevindim!",
  correction: null,
  done: false,
};

describe("ChatReplySchema uzunluk sınırları", () => {
  it("sınır içi yanıt geçer", () => {
    expect(ChatReplySchema.safeParse(validReply).success).toBe(true);
  });

  it("1000 karakterden uzun reply/replyTr reddedilir (sınırsız metin istemciye aynen iletilirdi)", () => {
    expect(ChatReplySchema.safeParse({ ...validReply, reply: "x".repeat(1001) }).success).toBe(false);
    expect(ChatReplySchema.safeParse({ ...validReply, replyTr: "x".repeat(1001) }).success).toBe(false);
    expect(ChatReplySchema.safeParse({ ...validReply, reply: "x".repeat(1000) }).success).toBe(true);
  });

  it("300 karakterden uzun explanationTr reddedilir", () => {
    const correction = { original: "i would like a coffee", corrected: "I would like a coffee.", explanationTr: "x".repeat(301) };
    expect(ChatReplySchema.safeParse({ ...validReply, correction }).success).toBe(false);
    expect(
      ChatReplySchema.safeParse({ ...validReply, correction: { ...correction, explanationTr: "x".repeat(300) } }).success,
    ).toBe(true);
  });
});

describe("ChatBodySchema (mevcut sınırlar korunur)", () => {
  it("message ve history sınırları aynen işler", () => {
    expect(
      ChatBodySchema.safeParse({
        courseId: "tr-en",
        scenarioId: "tanisma",
        history: [],
        message: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});
