import { jwtVerify } from "jose";

export interface AuthResult {
  ok: boolean;
  userId?: string;
}

/**
 * Supabase erişim jetonunu doğrular (HS256, SUPABASE_JWT_SECRET, aud 'authenticated';
 * jose exp kontrolünü otomatik yapar). Anonim kullanıcılar (is_anonymous) de geçerlidir.
 * Kullanıcı kimliği = sub.
 */
export async function verifyUserId(
  authHeader: string | undefined,
  jwtSecret: string,
): Promise<AuthResult> {
  const match = /^Bearer\s+(.+)$/i.exec(authHeader ?? "");
  if (!match || !jwtSecret) return { ok: false };
  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(jwtSecret), {
      algorithms: ["HS256"],
      audience: "authenticated",
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) return { ok: false };
    return { ok: true, userId: payload.sub };
  } catch {
    return { ok: false };
  }
}
