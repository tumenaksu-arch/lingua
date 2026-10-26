import { SignJWT } from "jose";
import type { AppConfig } from "../src/app.js";

export const TEST_JWT_SECRET = "test-jwt-secret-0123456789abcdef";
export const TEST_USER_ID = "11111111-2222-3333-4444-555555555555";

export async function makeToken(opts: {
  secret?: string;
  sub?: string;
  aud?: string;
  expired?: boolean;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const signer = new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(opts.sub ?? TEST_USER_ID)
    .setAudience(opts.aud ?? "authenticated")
    .setIssuer("supabase")
    .setIssuedAt(opts.expired ? now - 7200 : now)
    .setExpirationTime(opts.expired ? now - 3600 : now + 3600);
  return signer.sign(new TextEncoder().encode(opts.secret ?? TEST_JWT_SECRET));
}

export function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 8080,
    anthropicApiKey: "test-anthropic-key",
    jwtSecret: TEST_JWT_SECRET,
    usage: {
      restUrl: "http://rest.test/v1",
      serviceKey: "test-service-key",
      dailyLimit: 30,
      globalCap: 3000,
    },
    claude: {
      apiKey: "test-anthropic-key",
      model: "claude-opus-5-5",
      effort: "low",
    },
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const chatBody = {
  courseId: "tr-en",
  scenarioId: "tanisma",
  history: [{ role: "assistant", text: "Hi! Nice to meet you." }],
  message: "Hello, my name is Ayse.",
};

export const parsedReply = {
  reply: "Nice to meet you, Ayse!",
  replyTr: "Tanıştığımıza sevindim, Ayşe!",
  correction: null,
  done: false,
};
