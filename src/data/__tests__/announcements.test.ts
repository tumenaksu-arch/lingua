import { deleteAnnouncement, listAnnouncements, postAnnouncement } from '@/data/remote/classes';
import { getSupabase } from '@/data/remote/supabase';

jest.mock('@/data/remote/supabase', () => ({ getSupabase: jest.fn() }));

/**
 * Same minimal PostgREST chain mock as classes.test.ts: builder methods return
 * the builder, awaiting it resolves to the queued/current table result, and
 * calls are recorded for assertions.
 */
interface Chain {
  calls: Record<string, unknown[][]>;
  single: jest.Mock;
  then: (resolve: (v: unknown) => void) => void;
  [method: string]: unknown;
}

function makeBuilder(getResult: () => { data?: unknown; error?: unknown }): Chain {
  const builder = { calls: {} } as Chain;
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      (builder.calls[method] ??= []).push(args);
      return builder;
    };
  }
  builder.single = jest.fn(async () => getResult());
  builder.then = (resolve) => resolve(getResult());
  return builder;
}

const builder = makeBuilder(() => result);
let result: { data?: unknown; error?: unknown } = { data: null, error: null };

const auth = {
  getSession: jest.fn(async () => ({ data: { session: { user: { id: 'u1' } } }, error: null })),
  getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
};
const client = { from: jest.fn(() => builder), rpc: jest.fn(), auth };

beforeEach(() => {
  jest.clearAllMocks();
  result = { data: null, error: null };
  builder.calls = {};
  client.from.mockReturnValue(builder);
  jest.mocked(getSupabase).mockReturnValue(client as never);
});

describe('unconfigured Supabase', () => {
  it('returns null / [] / false without touching the client', async () => {
    jest.mocked(getSupabase).mockReturnValue(null);
    await expect(listAnnouncements('c1')).resolves.toEqual([]);
    await expect(postAnnouncement('c1', 'Merhaba')).resolves.toBeNull();
    await expect(deleteAnnouncement('a1')).resolves.toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('listAnnouncements', () => {
  it('lists newest first, capped at the given limit', async () => {
    result = {
      data: [
        { id: 'a2', class_id: 'c1', metin: 'İkinci', created_at: '2026-10-26T10:00:00Z' },
        { id: 'a1', class_id: 'c1', metin: 'Birinci', created_at: '2026-10-25T10:00:00Z' },
      ],
      error: null,
    };
    await expect(listAnnouncements('c1')).resolves.toEqual([
      { id: 'a2', classId: 'c1', metin: 'İkinci', createdAt: '2026-10-26T10:00:00Z' },
      { id: 'a1', classId: 'c1', metin: 'Birinci', createdAt: '2026-10-25T10:00:00Z' },
    ]);
    expect(builder.calls.eq).toEqual([['class_id', 'c1']]);
    expect(builder.calls.order).toEqual([['created_at', { ascending: false }]]);
    expect(builder.calls.limit).toEqual([[50]]);
  });

  it('a read error degrades to []', async () => {
    result = { data: null, error: { message: 'nope' } };
    await expect(listAnnouncements('c1')).resolves.toEqual([]);
  });
});

describe('postAnnouncement', () => {
  it('trims the text and inserts it', async () => {
    result = { data: { id: 'a9', class_id: 'c1', metin: 'Yarın sınav yok', created_at: '2026-10-26T12:00:00Z' }, error: null };
    await expect(postAnnouncement('c1', '  Yarın sınav yok  ')).resolves.toEqual({
      id: 'a9',
      classId: 'c1',
      metin: 'Yarın sınav yok',
      createdAt: '2026-10-26T12:00:00Z',
    });
    expect(builder.calls.insert).toEqual([[{ class_id: 'c1', metin: 'Yarın sınav yok' }]]);
  });

  it('rejects empty text with a Turkish error before any request', async () => {
    await expect(postAnnouncement('c1', '   ')).rejects.toThrow('Duyuru boş olamaz.');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('rejects over-long text with a Turkish error before any request', async () => {
    await expect(postAnnouncement('c1', 'a'.repeat(501))).rejects.toThrow('Duyuru en çok 500 karakter olabilir.');
    expect(client.from).not.toHaveBeenCalled();
  });

  it('accepts exactly 500 chars after trimming', async () => {
    result = { data: { id: 'a9', class_id: 'c1', metin: 'a'.repeat(500), created_at: '' }, error: null };
    await expect(postAnnouncement('c1', ` ${'a'.repeat(500)} `)).resolves.toMatchObject({ metin: 'a'.repeat(500) });
  });

  it('an API failure surfaces as a Turkish Error', async () => {
    result = { data: null, error: new Error('failed to fetch') };
    await expect(postAnnouncement('c1', 'Selam')).rejects.toThrow('Bağlantı yok. İnternetini kontrol edip tekrar dene.');
  });
});

describe('deleteAnnouncement', () => {
  it('deletes by id', async () => {
    result = { data: null, error: null };
    await expect(deleteAnnouncement('a9')).resolves.toBe(true);
    expect(builder.calls.delete).toEqual([[]]);
    expect(builder.calls.eq).toEqual([['id', 'a9']]);
  });

  it('an API failure surfaces as a Turkish Error', async () => {
    result = { data: null, error: new Error('failed to fetch') };
    await expect(deleteAnnouncement('a9')).rejects.toThrow('Bağlantı yok');
  });
});
