import { beforeEach, describe, expect, it, vi } from "vitest";

// Claude SDK'sı her zaman taklit edilir; bu dosya yalnızca PostgREST'e karşı
// gerçek entegrasyon testi yapar (yerel prototip, asla production değil).
const { mockParse } = vi.hoisted(() => ({ mockParse: vi.fn() }));
vi.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: class MockAnthropic {
    messages = { parse: mockParse };
  },
}));

import { buildApp } from "../src/app.js";
import { istanbulToday } from "../src/usage.js";

const SUPA_URL = (process.env.SUPA_URL ?? "").replace(/\/$/, "");
const SUPA_ANON = process.env.SUPA_ANON ?? "";
const SUPA_SERVICE = process.env.SUPA_SERVICE ?? "";
// PROTOTYPE ONLY — scratchpad/supa/PROTO.md'deki yerel prototip JWT secret'ı.
const SUPA_JWT_SECRET = "cP5L4mOXXOvRFjcyHlYn6vZlmmMsFKLVe4upqmA2s-vZmg5f-OzBvVyekjHAsuSr";

const describeIntegration = SUPA_URL ? describe : describe.skip;

async function signupUser(): Promise<{ email: string; password: string; accessToken: string }> {
  const email = `m6-it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = "test-pass-12345";
  const headers = { apikey: SUPA_ANON, "Content-Type": "application/json" };
  const signup = await fetch(`${SUPA_URL}/auth/v1/signup`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  if (!signup.ok) throw new Error(`signup failed: HTTP ${signup.status}`);
  const token = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  });
  if (!token.ok) throw new Error(`token failed: HTTP ${token.status}`);
  const session = (await token.json()) as { access_token: string };
  return { email, password, accessToken: session.access_token };
}

describeIntegration("prototip PostgREST ile ai_usage entegrasyonu", () => {
  beforeEach(() => {
    mockParse.mockReset();
    mockParse.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: {
        reply: "Hello!",
        replyTr: "Merhaba!",
        correction: null,
        done: false,
      },
      usage: { input_tokens: 2, output_tokens: 2 },
    });
  });

  it("yeni kullanıcı için sayaç 30 limitini uygular ve tokenları yazar", async () => {
    const user = await signupUser();
    const app = buildApp({
      port: 8080,
      anthropicApiKey: "test-key",
      jwtSecret: SUPA_JWT_SECRET,
      usage: {
        restUrl: `${SUPA_URL}/rest/v1`,
        serviceKey: SUPA_SERVICE,
        dailyLimit: 30,
        globalCap: 3000,
      },
      claude: { apiKey: "test-key", model: "claude-opus-5-5", effort: "low" },
    });

    const payload = {
      courseId: "tr-en",
      scenarioId: "tanisma",
      history: [],
      message: "Hello!",
    };

    // 30 mesaja kadar başarılı; remaining 29'dan 0'a iner.
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/v1/chat",
        headers: { authorization: `Bearer ${user.accessToken}` },
        payload,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().remaining).toBe(29 - i);
    }

    // 31. mesaj limiti aşar.
    const blocked = await app.inject({
      method: "POST",
      url: "/v1/chat",
      headers: { authorization: `Bearer ${user.accessToken}` },
      payload,
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().error).toBe("limit");
    expect(blocked.json().remaining).toBe(0);
    expect(mockParse).toHaveBeenCalledTimes(30);

    // Sayaç satırı doğrudan doğrulanır: 30 mesaj, tokenlar yazılmış.
    const rowRes = await fetch(
      `${SUPA_URL}/rest/v1/ai_usage?select=messages,input_tokens,output_tokens&day=eq.${istanbulToday()}`,
      { headers: { apikey: SUPA_SERVICE, Authorization: `Bearer ${SUPA_SERVICE}` } },
    );
    expect(rowRes.ok).toBe(true);
    const rows = (await rowRes.json()) as Array<{
      messages: number;
      input_tokens: number;
      output_tokens: number;
    }>;
    const row = rows.find((r) => r.messages === 30);
    expect(row).toBeDefined();
    expect(row!.input_tokens).toBeGreaterThanOrEqual(60); // 30 x 2 input
    expect(row!.output_tokens).toBeGreaterThanOrEqual(60);
  }, 120_000);
});
