import { getSupabase } from './supabase';

/**
 * Thin client for the lovevox-api AI conversation service (roadmap item 6),
 * served under EXPO_PUBLIC_SUPABASE_URL/ai (nginx: /lovevox-api/ai). Every
 * request carries the Supabase access token (the server verifies the JWT and
 * enforces the per-user daily limit server-side; the Claude key never leaves
 * the server). Failures resolve as Turkish AiErrors with a stable machine
 * code the screens branch on (`limit`, `upstream`, `network`, ...), mirroring
 * the classes.ts thin-client style.
 */

export type AiErrorCode =
  | 'bad_request'
  | 'auth'
  | 'limit'
  | 'not_configured'
  | 'upstream'
  | 'network';

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

export interface AiStatus {
  enabled: boolean;
  limit: number;
  remaining: number | null;
}

export interface AiScenario {
  id: string;
  titleTr: string;
  descriptionTr: string;
  level: 'A1' | 'A2' | 'B1';
  goalTr: string;
  /** First assistant line, in the course's target language. */
  opener: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AiCorrection {
  original: string;
  corrected: string;
  explanationTr: string;
}

export interface AiChatRequest {
  courseId: string;
  scenarioId: string;
  /** Previous turns, opener first; at most 20 entries of at most 600 chars each. */
  history: ChatTurn[];
  message: string;
}

export interface AiChatResponse {
  reply: string;
  replyTr: string;
  correction: AiCorrection | null;
  done: boolean;
  remaining: number;
}

/** Server-side contract: { error, message } with statuses 400/401/429/502/503. */
interface AiErrorBody {
  error?: unknown;
  message?: unknown;
}

const TIMEOUT_MS = 20_000;
const NETWORK_MESSAGE = 'Bağlantı yok. İnternetini kontrol et.';

function aiBaseUrl(): string {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return `${url}/ai`;
}

function isNetworkFailure(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return (
    e.name === 'AbortError' ||
    /failed to fetch|networkerror|network request failed|aborted|timeout/i.test(e.message)
  );
}

function normalizeCode(raw: unknown): AiErrorCode {
  return raw === 'bad_request' || raw === 'auth' || raw === 'limit' || raw === 'not_configured' || raw === 'upstream'
    ? raw
    : 'upstream';
}

/**
 * Authenticated fetch against /ai with a 20 s timeout. A missing session is an
 * `auth` error before the network is touched; fetch failures (offline, abort)
 * map to the fixed Turkish network message; a non-2xx answers with the server's
 * Turkish message and machine code.
 */
async function aiFetch(path: string, init: { method: 'GET' | 'POST'; body?: string }): Promise<Response> {
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
    const res = await fetch(`${aiBaseUrl()}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body,
      signal: controller.signal,
    });
    if (!res.ok) {
      let code: AiErrorCode = 'upstream';
      let message = 'Bir sorun oluştu. Lütfen tekrar dene.';
      try {
        const body = (await res.json()) as AiErrorBody;
        code = normalizeCode(body.error);
        if (typeof body.message === 'string' && body.message) message = body.message;
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

/** Feature flag + daily limit window of the AI service. */
export async function aiStatus(): Promise<AiStatus> {
  const res = await aiFetch('/v1/status', { method: 'GET' });
  const body = (await res.json()) as { enabled?: unknown; limit?: unknown; remaining?: unknown };
  return {
    enabled: body.enabled === true,
    limit: Number(body.limit ?? 0) || 0,
    remaining: body.remaining === null || body.remaining === undefined ? null : Number(body.remaining),
  };
}

/** Role-play scenarios for a course (kafe, otel, doktor ...), in Turkish meta text. */
export async function aiScenarios(courseId: string): Promise<AiScenario[]> {
  const res = await aiFetch(`/v1/scenarios?courseId=${encodeURIComponent(courseId)}`, { method: 'GET' });
  const body = (await res.json()) as { scenarios?: unknown };
  if (!Array.isArray(body.scenarios)) return [];
  return body.scenarios.map((s) => {
    const row = s as Partial<AiScenario>;
    return {
      id: String(row.id ?? ''),
      titleTr: String(row.titleTr ?? ''),
      descriptionTr: String(row.descriptionTr ?? ''),
      level: row.level === 'A2' || row.level === 'B1' ? row.level : 'A1',
      goalTr: String(row.goalTr ?? ''),
      opener: String(row.opener ?? ''),
    };
  });
}

/** Sends one user message; the reply (Turkish translation + optional correction) comes back. */
export async function aiChat(req: AiChatRequest): Promise<AiChatResponse> {
  const res = await aiFetch('/v1/chat', { method: 'POST', body: JSON.stringify(req) });
  const body = (await res.json()) as {
    reply?: unknown;
    replyTr?: unknown;
    correction?: unknown;
    done?: unknown;
    remaining?: unknown;
  };
  const c = body.correction as Partial<AiCorrection> | null | undefined;
  return {
    reply: String(body.reply ?? ''),
    replyTr: String(body.replyTr ?? ''),
    correction:
      c && typeof c.original === 'string' && typeof c.corrected === 'string'
        ? { original: c.original, corrected: c.corrected, explanationTr: String(c.explanationTr ?? '') }
        : null,
    done: body.done === true,
    remaining: Number(body.remaining ?? 0) || 0,
  };
}
