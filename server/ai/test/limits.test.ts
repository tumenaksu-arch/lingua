import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildApp } from "../src/app.js";
import { chatBody, makeConfig, makeToken, parsedReply, takeResponse, TAKE_DAY } from "./helpers.js";

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
    parsed_output: parsedReply,
    usage: { input_tokens: 42, output_tokens: 17 },
  });
}

async function chat(app: any, token: string) {
  return app.inject({
    method: "POST",
    url: "/v1/chat",
    headers: { authorization: `Bearer ${token}` },
    payload: chatBody,
  });
}

describe("günlük limit ve kullanım sayacı", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ai_usage_take -1 dönerse 429 limit ve Claude ÇAĞRILMAZ", async () => {
    mockFetch(() => takeResponse(-1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await chat(app, token);
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toBe("limit");
    expect(res.json().remaining).toBe(0);
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("başarıda tokenlar refund=false ile kaydedilir, remaining azalır", async () => {
    successParse();
    mockFetch(() => takeResponse(7)); // 7. mesaj rezerve edildi
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await chat(app, token);
    expect(res.statusCode).toBe(200);
    expect(res.json().remaining).toBe(30 - 7);
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body).toMatchObject({
      p_day: TAKE_DAY,
      p_input: 42,
      p_output: 17,
      p_refund: false,
    });
  });

  it("Claude hatasında 502 upstream ve iade (refund=true, take'in günü)", async () => {
    mockParse.mockRejectedValue(new Error("API error 500"));
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await chat(app, token);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream");
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body.p_refund).toBe(true);
    expect(records[0].body.p_day).toBe(TAKE_DAY);
  });

  it("stop_reason refusal → 502 upstream ve iade", async () => {
    mockParse.mockResolvedValue({
      stop_reason: "refusal",
      parsed_output: null,
      usage: { input_tokens: 3, output_tokens: 0 },
    });
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await chat(app, token);
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("upstream");
    const records = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_record"));
    expect(records).toHaveLength(1);
    expect(records[0].body.p_refund).toBe(true);
  });

  it("take çağrısı limit ve global_cap ile yapılır", async () => {
    successParse();
    mockFetch(() => takeResponse(1));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    await chat(app, token);
    const takes = rpcCalls().filter((c) => c.url.endsWith("/rpc/ai_usage_take"));
    expect(takes).toHaveLength(1);
    expect(takes[0].body).toMatchObject({ p_limit: 30, p_global_cap: 3000 });
  });

  it("ANAHTAR YOKSA 503 not_configured ve status.enabled=false", async () => {
    const cfg = makeConfig({ anthropicApiKey: "" });
    cfg.claude.apiKey = "";
    const app = buildApp(cfg);
    const status = await app.inject({ method: "GET", url: "/v1/status" });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toEqual({ enabled: false, limit: 30, remaining: null });
    const token = await makeToken({});
    const res = await chat(app, token);
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("not_configured");
    expect(mockParse).not.toHaveBeenCalled();
  });
});
