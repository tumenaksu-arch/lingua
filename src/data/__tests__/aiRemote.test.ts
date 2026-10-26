/**
 * Thin client for the /ai conversation service (roadmap item 6): token from
 * the Supabase session, JSON error bodies mapped to Turkish AiErrors with
 * stable codes, and fetch/abort failures mapped to the network message.
 * fetch is fully mocked — no server is ever contacted.
 */
import { getSupabase } from '@/data/remote/supabase';
import { aiChat, aiScenarios, aiStatus, AiError } from '@/data/remote/ai';

jest.mock('@/data/remote/supabase', () => ({ getSupabase: jest.fn() }));

const getSupabaseMock = getSupabase as jest.Mock;
const fetchMock = jest.fn();

function sessionClient(token: string | null) {
  return {
    auth: {
      getSession: jest.fn(async () => ({ data: { session: token ? { access_token: token } : null } })),
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://ankaxai.ai/lovevox-api';
  getSupabaseMock.mockReturnValue(sessionClient('test-token'));
  fetchMock.mockResolvedValue(jsonResponse(200, {}));
});

describe('ai remote client', () => {
  it('aiStatus sends the Bearer token and parses the limit window', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { enabled: true, limit: 30, remaining: 7 }));
    const status = await aiStatus();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ankaxai.ai/lovevox-api/ai/v1/status',
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    );
    expect(status).toEqual({ enabled: true, limit: 30, remaining: 7 });
  });

  it('treats a null remaining as null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { enabled: true, limit: 30, remaining: null }));
    expect((await aiStatus()).remaining).toBeNull();
  });

  it('aiScenarios passes the course id as a query param', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        scenarios: [
          { id: 's1', titleTr: 'Kafe', descriptionTr: 'Sipariş ver.', level: 'A2', goalTr: 'Sipariş', opener: 'Hi!' },
        ],
      }),
    );
    const scenarios = await aiScenarios('tr-en');
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/ai/v1/scenarios?courseId=tr-en');
    expect(scenarios[0]).toMatchObject({ id: 's1', level: 'A2', opener: 'Hi!' });
  });

  it('aiChat posts the request body and maps correction/done', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        reply: 'Great!',
        replyTr: 'Harika!',
        correction: { original: 'i am fine', corrected: 'I am fine.', explanationTr: 'I büyük harfle başlar.' },
        done: true,
        remaining: 3,
      }),
    );
    const res = await aiChat({
      courseId: 'tr-en',
      scenarioId: 's1',
      history: [{ role: 'assistant', text: 'Hi!' }],
      message: 'i am fine',
    });
    const init = fetchMock.mock.calls[0]![1] as { body: string; headers: Record<string, string> };
    expect(JSON.parse(init.body)).toEqual({
      courseId: 'tr-en',
      scenarioId: 's1',
      history: [{ role: 'assistant', text: 'Hi!' }],
      message: 'i am fine',
    });
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(res.correction).toEqual({ original: 'i am fine', corrected: 'I am fine.', explanationTr: 'I büyük harfle başlar.' });
    expect(res).toMatchObject({ reply: 'Great!', replyTr: 'Harika!', done: true, remaining: 3 });
  });

  it('maps a 429 body to a limit AiError with the server message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { error: 'limit', message: 'Bugünlük konuşma hakkın doldu. Yarın tekrar gel!' }));
    const err = await aiChat({ courseId: 'tr-en', scenarioId: 's1', history: [], message: 'hi' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect((err as AiError).code).toBe('limit');
    expect((err as Error).message).toBe('Bugünlük konuşma hakkın doldu. Yarın tekrar gel!');
  });

  it('maps fetch failures to the Turkish network message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const err = await aiStatus().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect((err as AiError).code).toBe('network');
    expect((err as Error).message).toBe('Bağlantı yok. İnternetini kontrol et.');
  });

  it('maps an abort (timeout) to the network error too', async () => {
    const abort = new Error('The operation was aborted.');
    abort.name = 'AbortError';
    fetchMock.mockRejectedValue(abort);
    const err = await aiStatus().catch((e: unknown) => e);
    expect((err as AiError).code).toBe('network');
  });

  it('maps a 502 body to the upstream code', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { error: 'upstream', message: 'Yapay zekâ servisi şu anda meşgul.' }));
    const err = await aiStatus().catch((e: unknown) => e);
    expect((err as AiError).code).toBe('upstream');
    expect((err as Error).message).toBe('Yapay zekâ servisi şu anda meşgul.');
  });

  it('rejects with auth when there is no session', async () => {
    getSupabaseMock.mockReturnValue(sessionClient(null));
    const err = await aiStatus().catch((e: unknown) => e);
    expect((err as AiError).code).toBe('auth');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects with not_configured when Supabase is unavailable', async () => {
    getSupabaseMock.mockReturnValue(null);
    const err = await aiStatus().catch((e: unknown) => e);
    expect((err as AiError).code).toBe('not_configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
