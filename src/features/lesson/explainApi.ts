import { getSupabase } from '@/data/remote/supabase';
import { AiError } from '@/features/conversation';

/**
 * Thin client for POST /v1/explain ("Cevabımı açıkla"): the wrong-answer
 * explanation endpoint of the lovevox-api AI service (same nginx
 * /lovevox-api/ai prefix, same Supabase Bearer contract and Turkish AiError
 * codes as the conversation client in data/remote/ai). That module's
 * authenticated fetch helper is private, so the exact same request shape is
 * mirrored here: no session → `auth` before the network, offline/abort →
 * fixed Turkish network message, non-2xx → the server's Turkish message.
 */

export interface AiExplainRequest {
  courseId: string;
  exerciseType: string;
  /** Exercise prompt as shown to the learner. */
  prompt: string;
  /** What the learner answered. */
  userAnswer: string;
  /** The accepted answer shown in the feedback sheet. */
  correctAnswer: string;
}

export interface AiExplainResponse {
  explanation: string;
  tip: string | null;
  remaining: number;
}

// 55 s: NVIDIA (akıl yürüten model + tek düzeltme denemesi) 10–40 s sürebilir; sunucu deneme başına 25 s, en fazla iki deneme.
const TIMEOUT_MS = 55_000;
const NETWORK_MESSAGE = 'Bağlantı yok. İnternetini kontrol et.';

interface AiErrorBody {
  error?: unknown;
  message?: unknown;
}

function isNetworkFailure(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === 'AbortError' ||
    /failed to fetch|networkerror|network request failed|aborted|timeout/i.test(e.message)
  );
}

function normalizeCode(raw: unknown): AiError['code'] {
  return raw === 'bad_request' || raw === 'auth' || raw === 'limit' || raw === 'not_configured' || raw === 'upstream'
    ? raw
    : 'upstream';
}

async function explainFetch(path: string, body: string): Promise<Response> {
  const sb = getSupabase();
  if (!sb) {
    throw new AiError('not_configured', 'Yapay zekâ servisi şu anda kullanılamıyor.');
  }
  let token: string | null = null;
  try {
    const { data } = await sb.auth.getSession();
    token = data.session?.access_token ?? null;
  } catch {
    token = null;
  }
  if (!token) {
    throw new AiError('auth', 'Oturumun geçersiz. Lütfen tekrar giriş yap.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/ai${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    if (!res.ok) {
      let code: AiError['code'] = 'upstream';
      let message = 'Bir sorun oluştu. Lütfen tekrar dene.';
      try {
        const errBody = (await res.json()) as AiErrorBody;
        code = normalizeCode(errBody.error);
        if (typeof errBody.message === 'string' && errBody.message) message = errBody.message;
      } catch {
        /* non-JSON error body: keep the defaults */
      }
      throw new AiError(code, message);
    }
    return res;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (isNetworkFailure(e)) throw new AiError('network', NETWORK_MESSAGE);
    throw new AiError('upstream', 'Bir sorun oluştu. Lütfen tekrar dene.');
  } finally {
    clearTimeout(timer);
  }
}

// Aynı alıştırma + cevap için ikinci istek atılmaz: sonuç bellekte tutulur.
// Başarısızlık önbellekte kalmaz ki "Tekrar dene" gerçekten yeniden denesin.
const explainCache = new Map<string, Promise<AiExplainResponse>>();

function cacheKey(req: AiExplainRequest): string {
  return JSON.stringify([req.courseId, req.exerciseType, req.prompt, req.userAnswer, req.correctAnswer]);
}

/** Kişiye özel yanlış-cevap açıklaması; aynı istek bellekten döner. */
export function aiExplain(req: AiExplainRequest): Promise<AiExplainResponse> {
  const key = cacheKey(req);
  let pending = explainCache.get(key);
  if (!pending) {
    pending = explainFetch('/v1/explain', JSON.stringify(req)).then(async (res) => {
      const body = (await res.json()) as { explanation?: unknown; tip?: unknown; remaining?: unknown };
      return {
        explanation: String(body.explanation ?? ''),
        tip: typeof body.tip === 'string' ? body.tip : null,
        remaining: Number(body.remaining ?? 0) || 0,
      };
    });
    explainCache.set(key, pending);
    pending.catch(() => explainCache.delete(key));
  }
  return pending;
}

/** Test hook: clear the in-memory explain cache. */
export function clearExplainCache(): void {
  explainCache.clear();
}
