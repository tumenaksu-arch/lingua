import { getSupabase } from '@/data/remote/supabase';
import {
  addFriend,
  entriesFor,
  getProfile,
  listFriends,
  removeFriend,
  resolveInvite,
  saveProfile,
  topEntries,
  upsertWeeklyEntry,
} from '@/data/remote/social';

jest.mock('@/data/remote/supabase', () => ({ getSupabase: jest.fn() }));

/**
 * Minimal PostgREST chain mock: every builder method returns the builder
 * itself (so calls chain) and awaiting the builder resolves to the table's
 * configured `{ data, error }` result. Method arguments are recorded on
 * `builder.calls[method]` for assertions.
 */
interface Chain {
  calls: Record<string, unknown[][]>;
  maybeSingle: jest.Mock;
  then: (resolve: (v: unknown) => void) => void;
  [method: string]: unknown;
}

function makeBuilder(result: { data?: unknown; error?: unknown }): Chain {
  const builder = { calls: {} } as Chain;
  for (const method of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'order', 'limit']) {
    builder[method] = (...args: unknown[]) => {
      (builder.calls[method] ??= []).push(args);
      return builder;
    };
  }
  builder.maybeSingle = jest.fn(async () => result);
  // Awaiting the builder (without .maybeSingle()) resolves to the result.
  builder.then = (resolve) => resolve(result);
  return builder;
}

const builders = new Map<string, Chain>();
const tableResults = new Map<string, { data?: unknown; error?: unknown }>();
const rpcResults = new Map<string, { data?: unknown; error?: unknown }>();
const rpcCalls: { fn: string; params: unknown }[] = [];

const client = {
  from: jest.fn(),
  rpc: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  builders.clear();
  tableResults.clear();
  rpcResults.clear();
  rpcCalls.length = 0;
  // mockReset also drops one-off implementations/return values from a failed test.
  client.from.mockReset().mockImplementation((table: string) => {
    const builder = makeBuilder(tableResults.get(table) ?? { data: null, error: null });
    builders.set(table, builder);
    return builder;
  });
  client.rpc
    .mockReset()
    .mockImplementation(async (fn: string, params: unknown) => {
      rpcCalls.push({ fn, params });
      return rpcResults.get(fn) ?? { data: null, error: null };
    });
  jest.mocked(getSupabase).mockReturnValue(client as never);
});

describe('unconfigured Supabase', () => {
  beforeEach(() => {
    jest.mocked(getSupabase).mockReturnValue(null);
  });

  it('returns null / [] / false from every helper', async () => {
    await expect(getProfile('u1')).resolves.toBeNull();
    await expect(saveProfile('u1', 'YıldızKedi')).resolves.toBeNull();
    await expect(topEntries('2026-W43')).resolves.toEqual([]);
    await expect(entriesFor('2026-W43', ['u2'])).resolves.toEqual([]);
    await expect(resolveInvite('ABC234')).resolves.toBeNull();
    await expect(addFriend('u1', 'u2')).resolves.toBe(false);
    await expect(listFriends()).resolves.toEqual([]);
    await expect(removeFriend('u1', 'u2')).resolves.toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('getProfile', () => {
  it('reads the profiles row for the uid', async () => {
    tableResults.set('profiles', {
      data: { user_id: 'u1', nickname: 'YıldızKedi', invite_code: 'ABC234', updated_at: 't' },
      error: null,
    });

    await expect(getProfile('u1')).resolves.toEqual({
      user_id: 'u1',
      nickname: 'YıldızKedi',
      invite_code: 'ABC234',
      updated_at: 't',
    });

    const b = builders.get('profiles')!;
    expect(b.calls.select).toEqual([['*']]);
    expect(b.calls.eq).toEqual([['user_id', 'u1']]);
    expect(b.maybeSingle).toHaveBeenCalledTimes(1);
  });
});

describe('saveProfile', () => {
  it('first save inserts a row with a random 6-char invite code', async () => {
    tableResults.set('profiles', { data: null, error: null }); // no existing profile

    const profile = await saveProfile('u1', 'YıldızKedi');

    const b = builders.get('profiles')!;
    expect(b.calls.insert).toHaveLength(1);
    const [row] = b.calls.insert![0] as [Record<string, string>];
    expect(row.user_id).toBe('u1');
    expect(row.nickname).toBe('YıldızKedi');
    expect(row.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(profile?.invite_code).toBe(row.invite_code);
    expect(b.calls.update).toBeUndefined();
  });

  it('retries with a fresh code on a unique violation (23505)', async () => {
    tableResults.set('profiles', { data: null, error: null });
    const b = makeBuilder({ data: null, error: { code: '23505', message: 'duplicate' } });
    let attempts = 0;
    b.insert = ((row: unknown) => {
      attempts += 1;
      b.calls.insert = [[row]];
      if (attempts === 3) return makeBuilder({ data: null, error: null });
      return b;
    }) as Chain['insert'];
    client.from.mockReturnValueOnce(b).mockReturnValue(b);

    const profile = await saveProfile('u1', 'YıldızKedi');

    expect(attempts).toBe(3);
    expect(profile?.invite_code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('gives up after 5 unique violations with a Turkish message', async () => {
    const builder = makeBuilder({
      data: null,
      error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' },
    });
    client.from.mockReturnValue(builder); // one shared builder: every attempt recorded

    await expect(saveProfile('u1', 'YıldızKedi')).rejects.toThrow('Davet kodu üretilemedi');
    expect(builder.calls.insert).toHaveLength(5);
  });

  it('later saves update only nickname + updated_at and refresh the week row', async () => {
    tableResults.set('profiles', {
      data: { user_id: 'u1', nickname: 'EskiAd', invite_code: 'ABC234', updated_at: 'old' },
      error: null,
    });

    const profile = await saveProfile('u1', 'Yeni_Ad');

    expect(profile).toEqual({
      user_id: 'u1',
      nickname: 'Yeni_Ad',
      invite_code: 'ABC234',
      updated_at: expect.any(String),
    });
    const b = builders.get('profiles')!;
    expect(b.calls.insert).toBeUndefined();
    const [update] = b.calls.update![0] as [Record<string, string>];
    expect(update.nickname).toBe('Yeni_Ad');
    expect(update.invite_code).toBeUndefined(); // invite code is immutable
    expect(b.calls.eq).toEqual([['user_id', 'u1']]);

    // The current week's leaderboard row gets the new nickname as well.
    const board = builders.get('leaderboard')!;
    const [boardUpdate] = board.calls.update![0] as [Record<string, string>];
    expect(boardUpdate.nickname).toBe('Yeni_Ad');
    const weekEq = board.calls.eq!.map((a) => a as string[]);
    expect(weekEq[0]).toEqual(['week_id', expect.stringMatching(/^\d{4}-W\d{2}$/)]);
    expect(weekEq[1]).toEqual(['user_id', 'u1']);
  });

  it('maps network failures to a Turkish message', async () => {
    client.from.mockImplementationOnce(() => {
      throw new Error('Network request failed');
    });
    await expect(addFriend('u1', 'u2')).rejects.toThrow('Bağlantı yok');
  });

  it('maps auth failures to a Turkish message', async () => {
    client.from.mockImplementationOnce(() =>
      makeBuilder({ data: null, error: { code: '42501', status: 403, message: 'row-level security policy' } }),
    );
    await expect(addFriend('u1', 'u2')).rejects.toThrow('Oturumun geçersiz');
  });
});

describe('leaderboard', () => {
  it('upserts on the (week_id, user_id) conflict', async () => {
    await upsertWeeklyEntry('u1', 'YıldızKedi', 30, '2026-W43');

    const b = builders.get('leaderboard')!;
    const [row, options] = b.calls.upsert![0] as [Record<string, unknown>, { onConflict: string }];
    expect(row).toMatchObject({ week_id: '2026-W43', user_id: 'u1', nickname: 'YıldızKedi', xp: 30 });
    expect(options.onConflict).toBe('week_id,user_id');
  });

  it('topEntries orders by xp desc and limits', async () => {
    tableResults.set('leaderboard', {
      data: [{ user_id: 'u2', nickname: 'Bob', xp: 50, updated_at: 't' }],
      error: null,
    });

    await topEntries('2026-W43', 10);

    const b = builders.get('leaderboard')!;
    expect(b.calls.eq).toEqual([['week_id', '2026-W43']]);
    expect(b.calls.order).toEqual([['xp', { ascending: false }]]);
    expect(b.calls.limit).toEqual([[10]]);
  });

  it('entriesFor filters with .in(user_id, uids)', async () => {
    tableResults.set('leaderboard', {
      data: [{ user_id: 'u2', nickname: 'Bob', xp: 50, updated_at: 't' }],
      error: null,
    });

    const rows = await entriesFor('2026-W43', ['u2', 'u3']);

    const b = builders.get('leaderboard')!;
    expect(b.calls.in).toEqual([['user_id', ['u2', 'u3']]]);
    expect(rows).toEqual([{ uid: 'u2', nickname: 'Bob', xp: 50, updated_at: 't' }]);
  });
});

describe('invite + friends', () => {
  it('resolveInvite calls the resolve_invite rpc with a normalized code', async () => {
    rpcResults.set('resolve_invite', { data: [{ user_id: 'u2', nickname: 'Bob' }], error: null });

    await expect(resolveInvite('  abc234 ')).resolves.toEqual({ uid: 'u2', nickname: 'Bob' });
    expect(rpcCalls).toEqual([{ fn: 'resolve_invite', params: { code: 'ABC234' } }]);
  });

  it('resolveInvite returns null for an unknown code', async () => {
    rpcResults.set('resolve_invite', { data: [], error: null });
    await expect(resolveInvite('ZZZ999')).resolves.toBeNull();
  });

  it('addFriend treats a duplicate row (23505) as success', async () => {
    tableResults.set('friends', {
      data: null,
      error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint "friends_pkey"' },
    });

    await expect(addFriend('u1', 'u2')).resolves.toBe(true);
    const b = builders.get('friends')!;
    expect(b.calls.insert).toEqual([[{ user_id: 'u1', friend_id: 'u2' }]]);
  });

  it('listFriends maps my_friends rows (friend_id) to FriendDoc (friend_uid)', async () => {
    rpcResults.set('my_friends', {
      data: [{ friend_id: 'u2', nickname: 'Bob', added_at: '2026-10-20T00:00:00.000Z' }],
      error: null,
    });

    await expect(listFriends()).resolves.toEqual([
      { friend_uid: 'u2', nickname: 'Bob', added_at: '2026-10-20T00:00:00.000Z' },
    ]);
    expect(rpcCalls).toEqual([{ fn: 'my_friends', params: undefined }]);
  });

  it('removeFriend deletes the caller-row for the friend', async () => {
    await removeFriend('u1', 'u2');

    const b = builders.get('friends')!;
    expect(b.calls.delete).toEqual([[]]);
    expect(b.calls.eq).toEqual([
      ['user_id', 'u1'],
      ['friend_id', 'u2'],
    ]);
  });
});
