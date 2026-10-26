import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../src/app.js";
import { buildApp } from "../src/app.js";
import { makeConfig, makeToken } from "./helpers.js";

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal("fetch", vi.fn(async (url: any, init: any) => handler(String(url), init)));
}

describe("/v1/status remaining (usageRemaining bağlantısı)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("geçerli token + ai_usage satırı sayısal remaining döner", async () => {
    mockFetch((url) => {
      expect(url).toContain("/ai_usage?");
      expect(url).toContain("select=messages");
      return new Response(JSON.stringify([{ messages: 7 }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await app.inject({ method: "GET", url: "/v1/status", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    // usageRemaining devrede: 30 - 7 = 23. Kaldırılırsa (remaining hep null) bu test düşer.
    expect(res.json().remaining).toBe(23);
    expect(res.json().enabled).toBe(true);
    expect(res.json().limit).toBe(30);
  });

  it("kayıt yoksa remaining günlük limitin kendisidir", async () => {
    mockFetch(() => new Response(JSON.stringify([]), { status: 200 }));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await app.inject({ method: "GET", url: "/v1/status", headers: { authorization: `Bearer ${token}` } });
    expect(res.json().remaining).toBe(30);
  });

  it("sayacı okuma başarısızsa remaining null düşer (istek yine 200)", async () => {
    mockFetch(() => new Response("boom", { status: 500 }));
    const app = buildApp(makeConfig());
    const token = await makeToken({});
    const res = await app.inject({ method: "GET", url: "/v1/status", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().remaining).toBeNull();
  });
});

describe("loadConfig AI_EFFORT doğrulaması", () => {
  it("beyaz listedeki değerler aynen geçer", () => {
    expect(loadConfig({ AI_EFFORT: "medium" } as NodeJS.ProcessEnv).claude.effort).toBe("medium");
    expect(loadConfig({ AI_EFFORT: "xhigh" } as NodeJS.ProcessEnv).claude.effort).toBe("xhigh");
  });

  it("tanımsızsa 'low' varsayılır", () => {
    expect(loadConfig({} as NodeJS.ProcessEnv).claude.effort).toBe("low");
  });

  it("beyaz listede olmayan değer 'low'a düşer ve uyarır — API 400/502 zinciri kırılmaz", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cfg = loadConfig({ AI_EFFORT: "luow" } as NodeJS.ProcessEnv);
    expect(cfg.claude.effort).toBe("low");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
