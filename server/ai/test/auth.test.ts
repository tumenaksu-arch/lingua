import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildApp } from "../src/app.js";
import { jsonResponse, chatBody, makeConfig, makeToken } from "./helpers.js";

function fetchOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => jsonResponse(1)), // ai_usage_take → 1 mesaj rezerve edildi
  );
}

describe("kimlik doğrulama", () => {
  beforeEach(() => {
    fetchOk();
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: {
        reply: "Hi!",
        replyTr: "Selam!",
        correction: null,
        done: false,
      },
      usage: { input_tokens: 5, output_tokens: 3 },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("token yoksa 401 auth döner", async () => {
    const app = buildApp(makeConfig());
    const res = await app.inject({ method: "POST", url: "/v1/chat", payload: chatBody });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
    expect(mockParse).not.toHaveBeenCalled();
  });

  it("bozuk token 401 auth döner", async () => {
    const app = buildApp(makeConfig());
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: "Bearer not.a.jwt" },
      payload: chatBody,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
  });

  it("süresi dolmuş token 401 auth döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({ expired: true });
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: chatBody,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
  });

  it("yanlış gizli anahtarla imzalanmış token 401 auth döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({ secret: "another-secret-0123456789abcdef" });
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: chatBody,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
  });

  it("yanlış audience 401 auth döner", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({ aud: "anon" });
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: chatBody,
    });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe("auth");
  });

  it("geçerli token işlemi sub ile sürdürür (200)", async () => {
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: `Bearer ${token}` },
      payload: chatBody,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().reply).toBe("Hi!");
    expect(mockParse).toHaveBeenCalledTimes(1);
  });
});
