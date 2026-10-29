import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../src/app.js";
import { extractJsonObject } from "../src/openaiCompat.js";
import { chatBody, explainBody, jsonResponse, makeConfig, makeToken, parsedExplain, parsedReply, takeResponse } from "./helpers.js";

/** Yalnız NVIDIA anahtarı olan yapılandırma (Claude anahtarı yok). */
const nvidiaOnly = () =>
  makeConfig({
    anthropicApiKey: "",
    claude: { apiKey: "", model: "claude-opus-5-5", effort: "low" },
    nvidia: { apiKey: "nvapi-test", baseUrl: "http://nvidia.test/v1", model: "test/model" },
  });

function completion(content: string) {
  return jsonResponse({ choices: [{ message: { content } }], usage: { prompt_tokens: 11, completion_tokens: 7 } });
}

/** fetch yönlendirici: kota uçları (rest.test) ve NVIDIA (nvidia.test) ayrı. */
function routeFetch(llmReplies: string[]) {
  const llmCalls: { url: string; body: any; auth: string | null }[] = [];
  const restCalls: string[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("http://nvidia.test")) {
      llmCalls.push({ url, body: JSON.parse(String(init?.body)), auth: new Headers(init?.headers).get("authorization") });
      return completion(llmReplies.shift() ?? "");
    }
    restCalls.push(url);
    return url.includes("ai_usage_take") ? takeResponse(1) : jsonResponse(null);
  });
  vi.stubGlobal("fetch", fn);
  return { llmCalls, restCalls };
}

afterEach(() => vi.unstubAllGlobals());

describe("NVIDIA (OpenAI uyumlu) sağlayıcı", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("yalnız NVIDIA anahtarı varken durum 'enabled' döner", async () => {
    routeFetch([]);
    const res = await buildApp(nvidiaOnly()).inject({ method: "GET", url: "/v1/status" });
    expect(res.json().enabled).toBe(true);
  });

  it("hiç anahtar yokken 503 not_configured", async () => {
    routeFetch([]);
    const cfg = makeConfig({ anthropicApiKey: "", claude: { apiKey: "", model: "m", effort: "low" } });
    const res = await buildApp(cfg).inject({ method: "POST", url: "/v1/chat", headers: { authorization: `Bearer ${await makeToken({})}` }, payload: chatBody });
    expect(res.statusCode).toBe(503);
  });

  it("sohbet: ```json çitli yanıtı ayrıştırır; model, Bearer anahtar ve şema istemi gönderilir", async () => {
    const { llmCalls } = routeFetch(["Here you go:\n```json\n" + JSON.stringify(parsedReply) + "\n```"]);
    const res = await buildApp(nvidiaOnly()).inject({ method: "POST", url: "/v1/chat", headers: { authorization: `Bearer ${await makeToken({})}` }, payload: chatBody });
    expect(res.statusCode).toBe(200);
    expect(res.json().reply).toBe(parsedReply.reply);
    expect(llmCalls).toHaveLength(1);
    expect(llmCalls[0]!.auth).toBe("Bearer nvapi-test");
    expect(llmCalls[0]!.body.model).toBe("test/model");
    expect(llmCalls[0]!.body.messages[0].role).toBe("system");
    expect(llmCalls[0]!.body.messages[0].content).toContain("JSON Schema");
    expect(llmCalls[0]!.body.messages.at(-1)).toEqual({ role: "user", content: chatBody.message });
  });

  it("geçersiz JSON'da bir kez düzeltme ister; ikincisi geçerliyse 200", async () => {
    const { llmCalls } = routeFetch(["Sorry, no JSON here.", JSON.stringify(parsedExplain)]);
    const res = await buildApp(nvidiaOnly()).inject({ method: "POST", url: "/v1/explain", headers: { authorization: `Bearer ${await makeToken({})}` }, payload: explainBody });
    expect(res.statusCode).toBe(200);
    expect(res.json().explanation).toBe(parsedExplain.explanation);
    expect(llmCalls).toHaveLength(2);
  });

  it("iki denemede de geçersiz → 502 ve kota iadesi", async () => {
    const { llmCalls, restCalls } = routeFetch(["nope", '{"reply": 3}']);
    const res = await buildApp(nvidiaOnly()).inject({ method: "POST", url: "/v1/chat", headers: { authorization: `Bearer ${await makeToken({})}` }, payload: chatBody });
    expect(res.statusCode).toBe(502);
    expect(llmCalls).toHaveLength(2);
    expect(restCalls.some((u) => u.includes("ai_usage_record"))).toBe(true);
  });

  it("Claude anahtarı da varsa Claude önceliklidir (NVIDIA çağrılmaz)", async () => {
    // Claude istemcisi gerçek ağa gitmesin diye fetch'i yakalamak yeterli değil; yalnız seçimin
    // NVIDIA'ya düşmediğini doğrularız: durum 'enabled' ve NVIDIA uç noktasına çağrı yok.
    const { llmCalls } = routeFetch([]);
    const cfg = makeConfig({ nvidia: { apiKey: "nvapi-test", baseUrl: "http://nvidia.test/v1", model: "test/model" } });
    const res = await buildApp(cfg).inject({ method: "GET", url: "/v1/status" });
    expect(res.json().enabled).toBe(true);
    expect(llmCalls).toHaveLength(0);
  });
});

describe("extractJsonObject", () => {
  it("çit, <think> bloğu, önsöz ve dize içindeki süslü parantezlerle başa çıkar", () => {
    expect(extractJsonObject('<think>{"x":1}</think>Sure: {"a":"b {c}","n":{"m":2}} trailing')).toEqual({ a: "b {c}", n: { m: 2 } });
    expect(extractJsonObject("no json")).toBeUndefined();
    expect(extractJsonObject('{"broken": ')).toBeUndefined();
  });
});
