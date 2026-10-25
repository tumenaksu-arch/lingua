import { weekStartMs } from '@/features/social/week';
import {
  archiveClass,
  becomeTeacher,
  classLeague,
  classProgress,
  classStruggles,
  createAssignment,
  createClass,
  deleteAssignment,
  isAnonymousSession,
  isTeacher,
  joinAsStudent,
  leaveClass,
  listAssignments,
  listMyClasses,
  myClasses,
  regenerateCode,
  removeMember,
  renameClass,
  updateAssignment,
} from '@/data/remote/classes';
import { getSupabase } from '@/data/remote/supabase';

jest.mock('@/data/remote/supabase', () => ({ getSupabase: jest.fn() }));

/**
 * Minimal PostgREST chain mock (same shape as socialRemote.test.ts): every
 * builder method returns the builder itself, `.single()`/awaiting resolve to
 * the table's current `{ data, error }` (a per-table FIFO queue is consumed
 * first), and calls are recorded for assertions. One persistent builder per
 * table so retries (fresh from() calls per attempt) accumulate their calls.
 */
interface Chain {
  calls: Record<string, unknown[][]>;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  then: (resolve: (v: unknown) => void) => void;
  [method: string]: unknown;
}

function makeBuilder(getResult: () => { data?: unknown; error?: unknown }): Chain {
  const builder = { calls: {} } as Chain;
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'order']) {
    builder[method] = (...args: unknown[]) => {
      (builder.calls[method] ??= []).push(args);
      return builder;
    };
  }
  builder.maybeSingle = jest.fn(async () => getResult());
  builder.single = jest.fn(async () => getResult());
  builder.then = (resolve) => resolve(getResult());
  return builder;
}

const builders = new Map<string, Chain>();
/** Per-table FIFO of results consumed by successive from() calls. */
const fromQueues = new Map<string, { data?: unknown; error?: unknown }[]>();
const tableResults = new Map<string, { data?: unknown; error?: unknown }>();
const rpcResults = new Map<string, { data?: unknown; error?: unknown }>();
const rpcCalls: { fn: string; params: unknown }[] = [];

const sessionUser = { id: 'u1', is_anonymous: false };
const session: { user: { id: string; is_anonymous: boolean } } | null = { user: sessionUser };

type SessionBox = {
  data: { session: { user: { id: string; is_anonymous: boolean } } | null };
  error: null;
};

const auth = {
  getSession: jest.fn(async (): Promise<SessionBox> => ({ data: { session }, error: null })),
  getUser: jest.fn(async () => ({ data: { user: sessionUser }, error: null })),
  signInAnonymously: jest.fn(async () => ({ data: { user: sessionUser, session }, error: null })),
};

const client = { from: jest.fn(), rpc: jest.fn(), auth };

function signedInClient(withSession = true) {
  auth.getSession.mockResolvedValue({
    data: { session: withSession ? session : null },
    error: null,
  });
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  builders.clear();
  fromQueues.clear();
  tableResults.clear();
  rpcResults.clear();
  rpcCalls.length = 0;
  client.from.mockReset().mockImplementation((table: string) => {
    let builder = builders.get(table);
    if (!builder) {
      builder = makeBuilder(() => {
        const queued = fromQueues.get(table);
        if (queued?.length) return queued.shift()!;
        return tableResults.get(table) ?? { data: null, error: null };
      });
      builders.set(table, builder);
    }
    return builder;
  });
  client.rpc
    .mockReset()
    .mockImplementation(async (fn: string, params: unknown) => {
      rpcCalls.push({ fn, params });
      return rpcResults.get(fn) ?? { data: null, error: null };
    });
  auth.signInAnonymously.mockReset().mockImplementation(async () => {
    signedInClient(true); // the anonymous session is in place from here on
    return { data: { user: sessionUser, session }, error: null };
  });
  signedInClient();
  jest.mocked(getSupabase).mockReturnValue(client as never);
});

describe('unconfigured Supabase', () => {
  beforeEach(() => {
    jest.mocked(getSupabase).mockReturnValue(null);
  });

  it('returns null / [] / false from every helper', async () => {
    await expect(isTeacher()).resolves.toBe(false);
    await expect(becomeTeacher()).resolves.toBe(false);
    await expect(
      createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: true }),
    ).resolves.toBeNull();
    await expect(listMyClasses()).resolves.toEqual([]);
    await expect(renameClass('c1', '9-B')).resolves.toBe(false);
    await expect(regenerateCode('c1')).resolves.toBeNull();
    await expect(archiveClass('c1')).resolves.toBe(false);
    await expect(removeMember('c1', 'u2')).resolves.toBe(false);
    await expect(listAssignments('c1')).resolves.toEqual([]);
    await expect(createAssignment('c1', 'tr-en.u1', '2026-11-01')).resolves.toBeNull();
    await expect(updateAssignment('a1', '2026-11-02')).resolves.toBe(false);
    await expect(deleteAssignment('a1')).resolves.toBe(false);
    await expect(classProgress('c1')).resolves.toEqual([]);
    await expect(classStruggles('c1', '2026-10-19T00:00:00.000Z')).resolves.toEqual([]);
    await expect(classLeague('c1')).resolves.toEqual([]);
    await expect(isAnonymousSession()).resolves.toBe(false);
    await expect(joinAsStudent('ABC234', 'Kedi')).resolves.toBeNull();
    await expect(myClasses()).resolves.toEqual([]);
    await expect(leaveClass('c1')).resolves.toBe(false);
    expect(client.from).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });
});

describe('guest without a session', () => {
  beforeEach(() => {
    jest.mocked(getSupabase).mockReturnValue(signedInClient(false) as never);
  });

  it('writes return null / false instead of throwing on the RLS denial', async () => {
    await expect(becomeTeacher()).resolves.toBe(false);
    await expect(createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: true })).resolves.toBeNull();
    await expect(renameClass('c1', '9-B')).resolves.toBe(false);
    await expect(leaveClass('c1')).resolves.toBe(false);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('teacher onboarding', () => {
  it('isTeacher reads the teachers row for the current user', async () => {
    tableResults.set('teachers', { data: { user_id: 'u1' }, error: null });
    await expect(isTeacher()).resolves.toBe(true);

    tableResults.set('teachers', { data: null, error: null });
    await expect(isTeacher()).resolves.toBe(false);

    const b = builders.get('teachers')!;
    expect(b.calls.eq).toEqual([
      ['user_id', 'u1'],
      ['user_id', 'u1'],
    ]);
  });

  it('becomeTeacher inserts the teachers row; an existing row is success', async () => {
    await expect(becomeTeacher()).resolves.toBe(true);
    const b = builders.get('teachers')!;
    expect(b.calls.insert).toEqual([[{ user_id: 'u1' }]]);

    tableResults.set('teachers', {
      data: null,
      error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' },
    });
    await expect(becomeTeacher()).resolves.toBe(true);
  });
});

describe('createClass', () => {
  it('refuses to open a class without the parent-confirmation before any request', async () => {
    await expect(createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: false })).rejects.toThrow(
      'Velileri bilgilendirdiğini onaylamalısın',
    );
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserts the class with a fresh 6-char join code and maps the row', async () => {
    tableResults.set('classes', {
      data: {
        id: 'c1',
        ad: '9-A İngilizce',
        course_id: 'tr-en',
        join_code: 'ABC234',
        created_at: '2026-10-21T00:00:00.000Z',
        archived_at: null,
      },
      error: null,
    });

    const created = await createClass({ ad: ' 9-A İngilizce ', courseId: 'tr-en', veliBilgilendirildi: true });

    expect(created).toEqual({
      id: 'c1',
      ad: '9-A İngilizce',
      courseId: 'tr-en',
      joinCode: 'ABC234',
      createdAt: '2026-10-21T00:00:00.000Z',
      archivedAt: null,
    });
    const b = builders.get('classes')!;
    const [row] = b.calls.insert![0] as [Record<string, unknown>];
    expect(row.teacher_id).toBe('u1');
    expect(row.ad).toBe('9-A İngilizce');
    expect(row.course_id).toBe('tr-en');
    expect(row.veli_bilgilendirildi).toBe(true);
    expect(String(row.join_code)).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('retries with a fresh code on a join_code unique violation (23505)', async () => {
    fromQueues.set('classes', [
      { data: null, error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint "classes_join_code_key"' } },
      {
        data: { id: 'c1', ad: '9-A', course_id: 'tr-en', join_code: 'XYZ789', created_at: 't', archived_at: null },
        error: null,
      },
    ]);

    const created = await createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: true });

    expect(created?.joinCode).toBe('XYZ789');
    expect(builders.get('classes')!.calls.insert).toHaveLength(2);
  });

  it('gives up after 5 unique violations with a Turkish message', async () => {
    tableResults.set('classes', {
      data: null,
      error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' },
    });

    await expect(createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: true })).rejects.toThrow(
      'Sınıf kodu üretilemedi',
    );
    expect(builders.get('classes')!.calls.insert).toHaveLength(5);
  });

  it('maps other failures to a Turkish message without retrying', async () => {
    tableResults.set('classes', {
      data: null,
      error: { code: '42501', status: 403, message: 'row-level security policy' },
    });

    await expect(createClass({ ad: '9-A', courseId: 'tr-en', veliBilgilendirildi: true })).rejects.toThrow(
      'Oturumun geçersiz',
    );
    expect(builders.get('classes')!.calls.insert).toHaveLength(1);
  });
});

describe('class management', () => {
  it('listMyClasses returns classes and filters archived unless requested', async () => {
    tableResults.set('classes', {
      data: [
        { id: 'c1', ad: '9-A', course_id: 'tr-en', join_code: 'AAAAAA', created_at: 't1', archived_at: null },
        { id: 'c2', ad: '8-B', course_id: 'tr-de', join_code: 'BBBBBB', created_at: 't2', archived_at: '2026-10-20T00:00:00.000Z' },
      ],
      error: null,
    });

    await expect(listMyClasses()).resolves.toEqual([
      { id: 'c1', ad: '9-A', courseId: 'tr-en', joinCode: 'AAAAAA', createdAt: 't1', archivedAt: null },
    ]);
    await expect(listMyClasses(true)).resolves.toHaveLength(2);
    const b = builders.get('classes')!;
    expect(b.calls.eq).toEqual([
      ['teacher_id', 'u1'],
      ['teacher_id', 'u1'],
    ]);
    expect(b.calls.order).toEqual([
      ['created_at', { ascending: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('renameClass updates only the name of the class', async () => {
    await expect(renameClass('c1', ' 9-B ')).resolves.toBe(true);
    const b = builders.get('classes')!;
    expect(b.calls.update).toEqual([[{ ad: '9-B' }]]);
    expect(b.calls.eq).toEqual([['id', 'c1']]);
  });

  it('regenerateCode replaces the code, retrying on a unique violation', async () => {
    fromQueues.set('classes', [
      { data: null, error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint' } },
      { data: null, error: null },
    ]);

    const code = await regenerateCode('c1');

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const b = builders.get('classes')!;
    expect(b.calls.update).toHaveLength(2);
    expect(b.calls.update![0]).not.toEqual(b.calls.update![1]);
  });

  it('archiveClass stamps archived_at; removeMember deletes the membership', async () => {
    await expect(archiveClass('c1')).resolves.toBe(true);
    const classes = builders.get('classes')!;
    expect(classes.calls.update![0][0]).toMatchObject({ archived_at: expect.any(String) });

    await expect(removeMember('c1', 'u2')).resolves.toBe(true);
    const members = builders.get('class_members')!;
    expect(members.calls.delete).toEqual([[]]);
    expect(members.calls.eq).toEqual([
      ['class_id', 'c1'],
      ['user_id', 'u2'],
    ]);
  });

  it('maps network failures to a Turkish message', async () => {
    client.from.mockImplementationOnce(() => {
      throw new Error('Network request failed');
    });
    await expect(removeMember('c1', 'u2')).rejects.toThrow('Bağlantı yok');
  });
});

describe('assignments', () => {
  it('createAssignment inserts and maps the row', async () => {
    tableResults.set('assignments', {
      data: { id: 'a1', class_id: 'c1', unit_id: 'tr-en.u3', son_tarih: '2026-11-01', created_at: 't' },
      error: null,
    });

    await expect(createAssignment('c1', 'tr-en.u3', '2026-11-01')).resolves.toEqual({
      id: 'a1',
      classId: 'c1',
      unitId: 'tr-en.u3',
      sonTarih: '2026-11-01',
      createdAt: 't',
    });
    const b = builders.get('assignments')!;
    expect(b.calls.insert).toEqual([[{ class_id: 'c1', unit_id: 'tr-en.u3', son_tarih: '2026-11-01' }]]);
  });

  it('createAssignment maps a duplicate unit to a Turkish error', async () => {
    tableResults.set('assignments', {
      data: null,
      error: { code: '23505', status: 409, message: 'duplicate key value violates unique constraint "assignments_class_id_unit_id_key"' },
    });

    await expect(createAssignment('c1', 'tr-en.u3', '2026-11-01')).rejects.toThrow(
      'Bu ünite için zaten bir ödev var.',
    );
  });

  it('listAssignments orders by deadline; update/delete target the id', async () => {
    tableResults.set('assignments', {
      data: [{ id: 'a1', class_id: 'c1', unit_id: 'tr-en.u3', son_tarih: '2026-11-01', created_at: 't' }],
      error: null,
    });
    await expect(listAssignments('c1')).resolves.toEqual([
      { id: 'a1', classId: 'c1', unitId: 'tr-en.u3', sonTarih: '2026-11-01', createdAt: 't' },
    ]);
    const b = builders.get('assignments')!;
    expect(b.calls.order).toEqual([['son_tarih', { ascending: true }]]);

    await expect(updateAssignment('a1', '2026-11-08')).resolves.toBe(true);
    await expect(deleteAssignment('a1')).resolves.toBe(true);
    expect(b.calls.update!.at(-1)).toEqual([{ son_tarih: '2026-11-08' }]);
    expect(b.calls.delete).toEqual([[]]);
    expect(b.calls.eq!.at(-1)).toEqual(['id', 'a1']);
  });
});

describe('summary RPCs', () => {
  it('classProgress passes the local week start as p_week_start', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-21T12:00:00.000Z')); // midday UTC: same local week everywhere
    rpcResults.set('class_progress', {
      data: [
        {
          user_id: 'u2',
          takma_ad: 'Kedi',
          joined_at: 't',
          weekly_xp: 30,
          total_xp: 120,
          streak: 3,
          last_active_date: '2026-10-21',
          completed_lessons: ['tr-en.u1.l1'],
        },
      ],
      error: null,
    });

    await expect(classProgress('c1')).resolves.toEqual([
      {
        userId: 'u2',
        takmaAd: 'Kedi',
        joinedAt: 't',
        weeklyXp: 30,
        totalXp: 120,
        streak: 3,
        lastActiveDate: '2026-10-21',
        completedLessons: ['tr-en.u1.l1'],
      },
    ]);
    const expectedWeekStart = new Date(weekStartMs(new Date(2026, 9, 21, 12, 0, 0))).toISOString();
    expect(rpcCalls).toEqual([{ fn: 'class_progress', params: { p_class: 'c1', p_week_start: expectedWeekStart } }]);
  });

  it('classStruggles forwards p_since and maps mistakes_by_type', async () => {
    rpcResults.set('class_struggles', {
      data: [
        { lesson_id: 'tr-en.u1.l1', attempts: 2, correct: 8, total: 10, mistakes_by_type: { select_translation: 2 } },
      ],
      error: null,
    });

    await expect(classStruggles('c1', '2026-10-14T00:00:00.000Z')).resolves.toEqual([
      { lessonId: 'tr-en.u1.l1', attempts: 2, correct: 8, total: 10, mistakesByType: { select_translation: 2 } },
    ]);
    expect(rpcCalls).toEqual([
      { fn: 'class_struggles', params: { p_class: 'c1', p_since: '2026-10-14T00:00:00.000Z' } },
    ]);
  });

  it('classLeague maps is_me and the weekly xp', async () => {
    rpcResults.set('class_league', {
      data: [
        { takma_ad: 'Kedi', weekly_xp: 40, is_me: true },
        { takma_ad: 'Panda', weekly_xp: 10, is_me: false },
      ],
      error: null,
    });

    await expect(classLeague('c1')).resolves.toEqual([
      { takmaAd: 'Kedi', weeklyXp: 40, isMe: true },
      { takmaAd: 'Panda', weeklyXp: 10, isMe: false },
    ]);
    expect(rpcCalls[0].fn).toBe('class_league');
  });
});

describe('joinAsStudent', () => {
  const joinedRow = { class_id: 'c1', ad: '9-A İngilizce', course_id: 'tr-en' };

  it('with an existing session it does NOT sign in anonymously', async () => {
    rpcResults.set('join_class', { data: [joinedRow], error: null });

    await expect(joinAsStudent(' abc234 ', 'Kedi ')).resolves.toEqual({
      classId: 'c1',
      ad: '9-A İngilizce',
      courseId: 'tr-en',
    });
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
    expect(rpcCalls).toEqual([{ fn: 'join_class', params: { p_code: ' abc234 ', p_takma_ad: 'Kedi' } }]);
  });

  it('without a session it signs in anonymously exactly once, then joins', async () => {
    jest.mocked(getSupabase).mockReturnValue(signedInClient(false) as never);
    rpcResults.set('join_class', { data: [joinedRow], error: null });

    await expect(joinAsStudent('ABC234', 'Kedi')).resolves.toEqual({
      classId: 'c1',
      ad: '9-A İngilizce',
      courseId: 'tr-en',
    });
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });

  it('zero rows from join_class means an unknown code', async () => {
    rpcResults.set('join_class', { data: [], error: null });
    await expect(joinAsStudent('ZZZZZZ', 'Kedi')).rejects.toThrow('Bilinmeyen sınıf kodu.');
  });

  it('maps too_many_attempts / own_class / nickname conflicts to Turkish errors', async () => {
    rpcResults.set('join_class', { data: null, error: { code: 'P0001', message: 'too_many_attempts' } });
    await expect(joinAsStudent('ABC234', 'Kedi')).rejects.toThrow('Çok fazla hatalı deneme');

    rpcResults.set('join_class', { data: null, error: { code: 'P0001', message: 'own_class' } });
    await expect(joinAsStudent('ABC234', 'Kedi')).rejects.toThrow('Kendi sınıfına öğrenci olarak katılamazsın.');

    rpcResults.set('join_class', {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "class_members_class_id_takma_ad_key"' },
    });
    await expect(joinAsStudent('ABC234', 'Kedi')).rejects.toThrow('Bu takma ad sınıfta kullanılıyor.');

    rpcResults.set('join_class', {
      data: null,
      error: { code: '23514', message: 'new row violates check constraint "class_members_takma_ad_check"' },
    });
    await expect(joinAsStudent('ABC234', 'x')).rejects.toThrow(
      'Takma ad 3–20 karakter olmalı (harf, rakam, boşluk, . _ -).',
    );
  });
});

describe('student helpers', () => {
  it('isAnonymousSession reads the is_anonymous claim', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u9', is_anonymous: true } } },
      error: null,
    });
    await expect(isAnonymousSession()).resolves.toBe(true);

    auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(isAnonymousSession()).resolves.toBe(false);
  });

  it('myClasses maps the my_classes rows', async () => {
    rpcResults.set('my_classes', {
      data: [{ class_id: 'c1', ad: '9-A', course_id: 'tr-en', takma_ad: 'Kedi', joined_at: 't' }],
      error: null,
    });
    await expect(myClasses()).resolves.toEqual([
      { classId: 'c1', ad: '9-A', courseId: 'tr-en', takmaAd: 'Kedi', joinedAt: 't' },
    ]);
  });

  it("leaveClass deletes the caller's own membership only", async () => {
    await expect(leaveClass('c1')).resolves.toBe(true);
    const b = builders.get('class_members')!;
    expect(b.calls.eq).toEqual([
      ['class_id', 'c1'],
      ['user_id', 'u1'],
    ]);
  });
});
