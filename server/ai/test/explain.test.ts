import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildApp } from "../src/app.js";
import { EXPLAIN_STABLE_BLOCK } from "../src/prompt.js";
import { explainBody, makeConfig, makeToken, parsedExplain, takeResponse, TAKE_DAY } from "./helpers.js";

function mockFetch(handler: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (url: any, init: any) => handler(String(url), init)));
}

function rpcCalls() {
  return (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([url, init]) => ({
    url: String(url),
    body: JSON.parse(String((init as RequestInit).body)),
  }));
}

function successParse() {
  mockParse.mockResolvedValue({
    stop_reason: "end_turn",
    parsed_output: parsedExplain,
    usage: { input_tokens: 10, output_tokens: 20 },
  });
}

async function post(app: any, payload: any, token?: string) {
  return app.inject({
    method: "POST",
    url: "/v1/explain",
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload,
  });
}

describe("POST /v1/explain kimlik ve doğrulama", () => {
  beforeEach(() => {
    mockParse.mockReset();
    successParse();
    mockFetch(() => takeResponse(1));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("token yoksa 401 auth (Claude ve kota çağrılmaz)", async () => {
    const app = buildApp(makeConfig());
    const res = await post(app, explainBody);
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
    expect(mockParse).not.toHaveBeenCalled();
    expect(rpcCalls()).toHaveLength(0);
  });

  it("geçersiz gövde 400 bad_request", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, { ...explainBody, prompt: "x".repeat(401) }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("bilinmeyen kurs 400 bad_request", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, { ...explainBody, courseId: "tr-xx" }, token);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("bad_request");
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("ANAHTAR YOKSA 503 not_configured ve Claude çağrılmaz", async () => {
    const cfg = makeConfig({ anthropicApiKey: "" });
    cfg.claude.apiKey = "";
    const app = buildApp(cfg);
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("not_configured");
    expect(mockParse).not.toHaveBeenCalled();
  });
});

describe("POST /v1/explain kota ve Claude çağrısı", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("limit doluysa 429 limit, remaining 0, Claude çağrılmaz", async () => {
    mockFetch(() => takeResponse(-1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("limit");
    expect(res.json().remaining).toBe(0);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("başarıda { explanation, tip, remaining } döner ve tokenlar kaydedilir", async () => {
    successParse();
    mockFetch(() => takeResponse(3));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      explanation: parsedExplain.explanation,
      tip: parsedExplain.tip,
      remaining: 30 - 3,
    });
    expect(mockParse).toHaveBeenCalledTimes(1);
    const params = mockParse.mock.calls[0][0] as any;
    const systemText = params.system.map((b: any) => b.text).join("\n");
    // Türkçe konuşan öğrenciye nazik öğretmen; reşit olmayan güvenliği ve
    // enjeksiyon savunması kararlı blokta; kurs bloğu sonradan gelir.
    expect(systemText.toLowerCase()).toContain("turkish");
    expect(systemText.toLowerCase()).toContain("minor");
    expect(systemText.toLowerCase()).toContain("untrusted");
    expect(systemText).toContain("select_translation");
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.system[0].text).toBe(EXPLAIN_STABLE_BLOCK);
    // Kullanıcı cevabı ve doğru cevap kullanıcı mesajına girer.
    const userContent = params.messages[0].content;
    expect(userContent).toContain(explainBody.userAnswer);
    expect(userContent).toContain(explainBody.correctAnswer);
    expect(userContent).toContain(explainBody.prompt);
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body).toMatchObject({
      p_day: TAKE_DAY,
      p_input: 10,
      p_output: 20,
      p_refund: false,
    });
  });

  it("tip yoksa null döner", async () => {
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { explanation: "Kısa bir açıklama." },
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(200);
    expect(res.json().tip).toBeNull();
    expect(res.json().explanation).toBe("Kısa bir açıklama.");
  });

  it("stop_reason refusal → 502 upstream ve kota iadesi", async () => {
    mockParse.mockResolvedValue({
      stop_reason: "refusal",
      parsed_output: null,
      usage: { input_tokens: 2, output_tokens: 0 },
    });
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream");
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body.p_refund).toBe(true);
    expect(records[0].body.p_day).toBe(TAKE_DAY);
  });

  it("boş parsed_output → 502 upstream ve kota iadesi", async () => {
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: null,
      usage: { input_tokens: 2, output_tokens: 0 },
    });
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream");
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body.p_refund).toBe(true);
  });

  it("Claude hatasında 502 upstream ve kota iadesi", async () => {
    mockParse.mockRejectedValue(new Error("API error 500"));
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await post(app, explainBody, token);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream");
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body.p_refund).toBe(true);
  });
});
