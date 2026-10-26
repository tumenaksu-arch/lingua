import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildApp } from "../src/app.js";
import { buildMessages, buildSystemBlocks, STABLE_SYSTEM_BLOCK } from "../src/prompt.js";
import { getCourse, getScenario } from "../src/scenarios.js";
import { chatBody, jsonResponse, makeConfig, makeToken, parsedReply } from "./helpers.js";

async function post(app: any, payload: any, token: string) {
  return app.inject({
    method: "POST",
    url: "/v1/chat",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

describe("istek doğrulama (400 bad_request)", () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: parsedReply,
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(1)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("500 karakterden uzun mesaj 400 döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, { ...chatBody, message: "x".repeat(501) }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
  });

  it("20 öğeden uzun geçmiş 400 döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const history = Array.from({ length: 21 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      text: `msg ${i}`,
    }));
    const res = await post(app, { ...chatBody, history }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
  });

  it("600 karakterden uzun geçmiş öğesi 400 döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(
      app,
      { ...chatBody, history: [{ role: "user", text: "x".repeat(601) }] },
      token,
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
  });

  it("bilinmeyen senaryo 400 döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, { ...chatBody, scenarioId: "yok-boyle" }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
  });

  it("bilinmeyen kurs 400 döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, { ...chatBody, courseId: "tr-xx" }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
  });
});

describe("sistem komutu ve geçmiş", () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: parsedReply,
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(1)));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sistem komutu seviye, senaryo ve reşit olmayan güvenliği kurallarını içerir", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    await post(app, { ...chatBody, scenarioId: "doktor" }, token);
    expect(mockParse).toHaveBeenCalledTimes(1);
    const params = mockParse.mock.calls[0][0] as any;
    const systemText = params.system.map((b: any) => b.text).join("\n");
    expect(systemText).toContain("B1");
    expect(systemText).toContain("Doktorda");
    expect(systemText.toLowerCase()).toContain("minor");
    expect(systemText).toContain("personal data");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.system[0].text).toBe(STABLE_SYSTEM_BLOCK);
    expect(params.max_tokens).toBe(2000);
    expect(params.output_config.effort).toBe("low");
    expect(params.temperature).toBeUndefined();
  });

  it("geçmiş son 20 öğeye kısaltılır", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: "user" as const,
      text: `msg ${i}`,
    }));
    const messages = buildMessages(history, "son mesaj");
    expect(messages).toHaveLength(21);
    expect(messages[0]).toEqual({ role: "user", content: "msg 5" });
    expect(messages[20]).toEqual({ role: "user", content: "son mesaj" });
  });

  it("buildMessages açılış asistan mesajını (baştaki ardışık asistanı) atar", () => {
    const messages = buildMessages(
      [
        { role: "assistant", text: "opener" },
        { role: "user", text: "hi" },
      ],
      "merhaba",
    );
    expect(messages[0].role).toBe("user");
    expect(messages).toHaveLength(2);
  });

  it("buildSystemBlocks kararlı bloğu ephemeral ile işaretler ve senaryo bloğunu sona koyar", () => {
    const course = getCourse("tr-de")!;
    const scenario = getScenario("tr-de", "kafe")!;
    const blocks = buildSystemBlocks(course, scenario);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" });
    expect(blocks[0].text).toBe(STABLE_SYSTEM_BLOCK);
    expect(blocks[1].text).toContain("A1");
    expect(blocks[1].text).toContain("German");
  });
});
