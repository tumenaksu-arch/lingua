/**
 * RLS / RPC integration tests for the Love-Vox teacher-class schema
 * (supabase/migrations/0002_siniflar.sql), run against the LOCAL PROTOTYPE
 * documented in scratchpad/supa/PROTO.md — never against production.
 *
 *   SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key from PROTO.md> \
 *     node --test supabase/tests/
 *
 * Creates fresh users per run: teachers T1/T2 (e-mail + password, signup
 * auto-confirmed by the prototype) and students S1/S2 (GoTrue ANONYMOUS
 * sign-in, the student flow from docs/tasarim/madde5-ogretmen-sinif.md).
 * The tests below are ORDERED: they tell one story (open class → join →
 * learn → leave → archive), so they must run sequentially (node:test default).
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, before, test } from 'node:test';

// Resolve supabase-js from the repo's node_modules (no package.json changes).
const require = createRequire(import.meta.url);
const { createClient } = require('@supabase/supabase-js');
// supabase-js >= 2.100 builds its RealtimeClient eagerly; on Node < 22 it
// needs the `ws` package as the WebSocket transport (present via metro).
let wsTransport = null;
try {
  wsTransport = require('ws');
} catch {
  /* Node >= 22 has a native WebSocket; no transport needed. */
}

function makeClient() {
  return createClient(SUPA_URL, SUPA_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(wsTransport ? { realtime: { transport: wsTransport } } : {}),
  });
}

const SUPA_URL = process.env.SUPA_URL;
const SUPA_ANON = process.env.SUPA_ANON;
const skip = SUPA_URL && SUPA_ANON ? false : 'SUPA_URL / SUPA_ANON not set — see PROTO.md';

const PASSWORD = 'TestPass!12345';
const DAY_MS = 86_400_000;
const NOW = new Date().toISOString();
const WEEK_AGO = new Date(Date.now() - 7 * DAY_MS).toISOString();
// Monday 00:00 LOCAL — exactly like the client's weekStartMs
// (src/features/social/week.ts): p_week_start must match or weekly_xp is off.
// (The previous Sunday-anchored getDay() version never exercised the week
// boundary: an event from last week was inside the computed "week" on most
// weekdays, and the weekly_xp assertion could not fail.)
const WEEK_START_MS = (() => {
  const now = new Date();
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return localMidnight.getTime() - ((localMidnight.getDay() + 6) % 7) * DAY_MS;
})();
const WEEK_START = new Date(WEEK_START_MS).toISOString();

// Join codes are globally unique in the (persistent) prototype database, so
// every run draws fresh 6-char codes from the schema's alphabet.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const runCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

const S1_NICK = 'Şeker Kedi';
const S2_NICK = 'Panda';

const users = {}; // name -> { sb, uid }
let classId = null;
let joinCode = null;
let assignmentId = null;

async function freshEmailUser(name) {
  const email = `cls-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const sb = makeClient();
  const { data, error } = await sb.auth.signUp({ email, password: PASSWORD });
  assert.ifError(error);
  assert.ok(data.user, `signup for ${email}`);
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ifError(signInError);
  users[name] = { sb, uid: data.user.id, email };
}

async function freshAnonUser(name) {
  const sb = makeClient();
  const { data, error } = await sb.auth.signInAnonymously();
  assert.ifError(error);
  assert.ok(data.session, `anonymous session for ${name}`);
  assert.equal(data.user.is_anonymous, true, `${name} must be an anonymous GoTrue user`);
  users[name] = { sb, uid: data.user.id };
}

// node:test on Node 20 takes no options object for hooks — guard inside instead.
before(async () => {
  if (skip) return;
  await freshEmailUser('T1');
  await freshEmailUser('T2');
  await freshAnonUser('S1');
  await freshAnonUser('S2');
});

after(async () => {
  if (skip) return;
  await Promise.all(Object.values(users).map((u) => u.sb.auth.signOut()));
});

const T1 = () => users.T1.sb;
const T2 = () => users.T2.sb;
const S1 = () => users.S1.sb;
const S2 = () => users.S2.sb;

const denied = (res, what) => assert.ok(res.error, `${what} must be denied`);

// ---------------------------------------------------------------------------
// Teacher onboarding + class creation
// ---------------------------------------------------------------------------

test('teachers: T1 becomes a teacher; an anonymous user cannot', { skip }, async () => {
  assert.ifError((await T1().from('teachers').insert({ user_id: users.T1.uid })).error);
  const { data, error } = await T1().from('teachers').select('*');
  assert.ifError(error);
  assert.equal(data.length, 1);
  assert.equal(data[0].user_id, users.T1.uid);

  const anon = makeClient();
  const { data: anonData, error: anonError } = await anon.auth.signInAnonymously();
  assert.ifError(anonError);
  denied(
    await anon.from('teachers').insert({ user_id: anonData.user.id }),
    'anonymous teacher insert',
  );
});

test('classes: veli_bilgilendirildi=false is rejected; T1 opens a class', { skip }, async () => {
  joinCode = runCode();
  const noConfirm = await T1().from('classes').insert({
    teacher_id: users.T1.uid,
    ad: '9-A Test',
    course_id: 'tr-en',
    join_code: runCode(),
    veli_bilgilendirildi: false,
  });
  denied(noConfirm, 'class without the parent confirmation');

  const { data, error } = await T1().from('classes').insert({
    teacher_id: users.T1.uid,
    ad: '9-A Test',
    course_id: 'tr-en',
    join_code: joinCode,
    veli_bilgilendirildi: true,
  }).select('*');
  assert.ifError(error);
  assert.equal(data.length, 1);
  classId = data[0].id;
  assert.match(data[0].join_code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(data[0].archived_at, null);

  // An anonymous user can never open a class (RLS rejects before the FK would).
  const anon = makeClient();
  const { data: anonData } = await anon.auth.signInAnonymously();
  denied(
    await anon.from('classes').insert({
      teacher_id: anonData.user.id,
      ad: 'Anon Sınıf',
      course_id: 'tr-en',
      join_code: runCode(),
      veli_bilgilendirildi: true,
    }),
    'anonymous class insert',
  );
});

// ---------------------------------------------------------------------------
// Cross-teacher isolation
// ---------------------------------------------------------------------------

test('T2 (a teacher too) cannot read T1\'s class row', { skip }, async () => {
  assert.ifError((await T2().from('teachers').insert({ user_id: users.T2.uid })).error);

  const cls = await T2().from('classes').select('*').eq('id', classId);
  assert.ifError(cls.error);
  assert.equal(cls.data.length, 0, 'T2 must not see T1\'s class row');
});

test('T2 cannot call class_progress / class_struggles / class_league for T1\'s class', { skip }, async () => {
  const progress = await T2().rpc('class_progress', { p_class: classId, p_week_start: WEEK_START });
  denied(progress, 'class_progress by a non-teacher of the class');
  assert.match(progress.error.message, /not_teacher/);

  const struggles = await T2().rpc('class_struggles', { p_class: classId, p_since: WEEK_AGO });
  denied(struggles, 'class_struggles by a non-teacher of the class');

  const league = await T2().rpc('class_league', { p_class: classId, p_week_start: WEEK_START });
  denied(league, 'class_league by a non-member');
  assert.match(league.error.message, /not_member/);
});

// ---------------------------------------------------------------------------
// Joining (anonymous students, code + nickname)
// ---------------------------------------------------------------------------

test('S1 joins T1\'s class with the code and a nickname', { skip }, async () => {
  // Lowercase on purpose: join_class normalizes the code with upper(btrim()).
  const { data, error } = await S1().rpc('join_class', { p_code: joinCode.toLowerCase(), p_takma_ad: S1_NICK });
  assert.ifError(error);
  assert.equal(data.length, 1);
  assert.equal(data[0].class_id, classId);
  assert.equal(data[0].ad, '9-A Test');
  assert.equal(data[0].course_id, 'tr-en');
});

test('join_class: unknown code → zero rows; after 10 wrong codes even the right code is throttled', { skip }, async () => {
  const wrong = await S1().rpc('join_class', { p_code: 'ZZZZZZ', p_takma_ad: 'Baska' });
  assert.ifError(wrong.error);
  assert.equal(wrong.data.length, 0, 'unknown code must return zero rows, not an error');
  // 9 more wrong codes: the first call above already recorded attempt #1.
  for (let i = 0; i < 9; i++) {
    const res = await S1().rpc('join_class', { p_code: runCode(), p_takma_ad: 'Baska' });
    assert.ifError(res.error);
    assert.equal(res.data.length, 0);
  }
  // Attempt #11 hits the per-user hourly cap — even with the correct code.
  const right = await S1().rpc('join_class', { p_code: joinCode, p_takma_ad: 'Baska' });
  denied(right, 'join after 10 failed attempts');
  assert.match(right.error.message, /too_many_attempts/);
});

test('join_class: taken nickname → 23505, bad nickname → check violation, then S2 joins', { skip }, async () => {
  const taken = await S2().rpc('join_class', { p_code: joinCode, p_takma_ad: S1_NICK });
  denied(taken, 'join with S1\'s nickname');
  assert.equal(taken.error.code, '23505');

  const bad = await S2().rpc('join_class', { p_code: joinCode, p_takma_ad: 'ab' });
  denied(bad, 'join with a too-short nickname');
  assert.equal(bad.error.code, '23514');

  const { data, error } = await S2().rpc('join_class', { p_code: joinCode, p_takma_ad: S2_NICK });
  assert.ifError(error);
  assert.equal(data[0].class_id, classId);
});

// ---------------------------------------------------------------------------
// Student read access: summaries via RPC, raw class rows never
// ---------------------------------------------------------------------------

test('S1 cannot enumerate classes nor call class_progress, but CAN call class_league and my_classes', { skip }, async () => {
  const cls = await S1().from('classes').select('*');
  assert.ok(cls.error || cls.data.length === 0, 'student must not read the classes table');

  denied(await S1().rpc('class_progress', { p_class: classId, p_week_start: WEEK_START }), 'class_progress by a student');

  const league = await S1().rpc('class_league', { p_class: classId, p_week_start: WEEK_START });
  assert.ifError(league.error);
  assert.equal(league.data.length, 2, 'both members are in the class league');
  const meRows = league.data.filter((r) => r.is_me === true);
  assert.equal(meRows.length, 1, 'is_me is true on exactly one row');
  assert.equal(meRows[0].takma_ad, S1_NICK);
  assert.ok(league.data.every((r) => typeof r.weekly_xp === 'number'));
  assert.ok(league.data.filter((r) => r.takma_ad === S2_NICK).every((r) => r.is_me === false));

  const mine = await S1().rpc('my_classes');
  assert.ifError(mine.error);
  assert.equal(mine.data.length, 1);
  assert.equal(mine.data[0].class_id, classId);
  assert.equal(mine.data[0].takma_ad, S1_NICK);
});

test('S1 cannot insert into class_members directly (join only via join_class)', { skip }, async () => {
  denied(
    await S1().from('class_members').insert({ class_id: classId, user_id: users.S1.uid, takma_ad: 'Dolayli' }),
    'direct class_members insert',
  );
});

// ---------------------------------------------------------------------------
// Assignments (teacher manages, members read)
// ---------------------------------------------------------------------------

test('assignments: T1 creates and manages; duplicate unit rejected; members read', { skip }, async () => {
  const { data, error } = await T1().from('assignments')
    .insert({ class_id: classId, unit_id: 'tr-en.u1', son_tarih: '2026-11-01' })
    .select('*');
  assert.ifError(error);
  assert.equal(data.length, 1);
  assignmentId = data[0].id;

  const dup = await T1().from('assignments').insert({ class_id: classId, unit_id: 'tr-en.u1', son_tarih: '2026-11-08' });
  denied(dup, 'duplicate unit assignment');
  assert.equal(dup.error.code, '23505');

  assert.ifError((await T1().from('assignments').update({ son_tarih: '2026-11-05' }).eq('id', assignmentId)).error);
  const list = await T1().from('assignments').select('*').eq('class_id', classId);
  assert.ifError(list.error);
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0].son_tarih, '2026-11-05');

  // A member can read the assignments of their class…
  const forS1 = await S1().from('assignments').select('*').eq('class_id', classId);
  assert.ifError(forS1.error);
  assert.equal(forS1.data.length, 1);
  // …but cannot create one.
  denied(
    await S1().from('assignments').insert({ class_id: classId, unit_id: 'tr-en.u2', son_tarih: '2026-11-09' }),
    'student assignment insert',
  );
});

test('T2 still cannot read T1\'s members or assignments (now that rows exist)', { skip }, async () => {
  // Runs AFTER students joined and the assignment was created, so the tables
  // hold real rows: an RLS regression opening member/assignment rows to any
  // authenticated user would return data here and fail the suite. (Asserting
  // on empty tables is vacuous — 0 rows passes even with `using (true)`.)
  const members = await T2().from('class_members').select('*').eq('class_id', classId);
  assert.ifError(members.error);
  assert.equal(members.data.length, 0, 'T2 must not see T1\'s member rows');

  const asg = await T2().from('assignments').select('*').eq('class_id', classId);
  assert.ifError(asg.error);
  assert.equal(asg.data.length, 0, 'T2 must not see T1\'s assignment rows');
});

// ---------------------------------------------------------------------------
// Immutability of teacher_id / course_id
// ---------------------------------------------------------------------------

test('classes: teacher_id and course_id cannot be changed by an update', { skip }, async () => {
  // The update itself passes RLS (owner), but the trigger restores the values.
  assert.ifError((await T1().from('classes').update({ teacher_id: users.T2.uid }).eq('id', classId)).error);
  assert.ifError((await T1().from('classes').update({ course_id: 'tr-de' }).eq('id', classId)).error);
  const { data, error } = await T1().from('classes').select('teacher_id, course_id').eq('id', classId).single();
  assert.ifError(error);
  assert.equal(data.teacher_id, users.T1.uid);
  assert.equal(data.course_id, 'tr-en');
});

// ---------------------------------------------------------------------------
// Teacher summaries over real learning rows
// ---------------------------------------------------------------------------

test('class_progress: S1\'s weekly XP and completed lessons are visible to T1', { skip }, async () => {
  assert.ifError((await S1().from('events').upsert({
    user_id: users.S1.uid,
    id: 'cls-evt-xp',
    type: 'lesson_completed',
    payload: { lessonId: 'tr-en.u1.l1', correct: 8, total: 10, xp: 30, mistakes_by_type: { select_translation: 2 } },
    created_at: NOW,
    updated_at: NOW,
  }, { onConflict: 'user_id,id' })).error);
  // A second event from BEFORE WEEK_START (and older than the class_struggles
  // p_since window below, so it must not leak into that assertion either):
  // weekly_xp must exclude it — this is what actually exercises the week
  // boundary.
  const lastWeek = new Date(WEEK_START_MS - 8 * DAY_MS).toISOString();
  assert.ifError((await S1().from('events').upsert({
    user_id: users.S1.uid,
    id: 'cls-evt-xp-old',
    type: 'lesson_completed',
    payload: { lessonId: 'tr-en.u1.l1', correct: 8, total: 10, xp: 999, mistakes_by_type: {} },
    created_at: lastWeek,
    updated_at: lastWeek,
  }, { onConflict: 'user_id,id' })).error);
  assert.ifError((await S1().from('user_progress').upsert({
    user_id: users.S1.uid,
    lesson_id: 'tr-en.u1.l1',
    crowns: 1,
    completed_at: NOW,
    updated_at: NOW,
  }, { onConflict: 'user_id,lesson_id' })).error);

  const { data, error } = await T1().rpc('class_progress', { p_class: classId, p_week_start: WEEK_START });
  assert.ifError(error);
  assert.equal(data.length, 2);
  const s1Row = data.find((r) => r.user_id === users.S1.uid);
  assert.ok(s1Row, 'S1 must appear in class_progress');
  assert.equal(s1Row.takma_ad, S1_NICK);
  assert.equal(Number(s1Row.weekly_xp), 30, 'weekly_xp sums payload.xp of the week');
  assert.ok(s1Row.completed_lessons.includes('tr-en.u1.l1'));
  const s2Row = data.find((r) => r.user_id === users.S2.uid);
  assert.ok(s2Row);
  assert.equal(Number(s2Row.weekly_xp), 0);
});

test('class_struggles: correct/total and mistakes_by_type aggregate across both members', { skip }, async () => {
  assert.ifError((await S2().from('events').upsert({
    user_id: users.S2.uid,
    id: 'cls-evt-struggle',
    type: 'lesson_completed',
    payload: { lessonId: 'tr-en.u1.l1', correct: 5, total: 10, mistakes_by_type: { select_translation: 1, listen_type: 4 } },
    created_at: NOW,
    updated_at: NOW,
  }, { onConflict: 'user_id,id' })).error);

  const { data, error } = await T1().rpc('class_struggles', { p_class: classId, p_since: WEEK_AGO });
  assert.ifError(error);
  const row = data.find((r) => r.lesson_id === 'tr-en.u1.l1');
  assert.ok(row, 'aggregated row for tr-en.u1.l1');
  assert.equal(Number(row.attempts), 2);
  assert.equal(Number(row.correct), 13);
  assert.equal(Number(row.total), 20);
  assert.deepEqual(row.mistakes_by_type, { listen_type: 4, select_translation: 3 });
});

// ---------------------------------------------------------------------------
// Leaving / removing members
// ---------------------------------------------------------------------------

test('membership: S1 leaves, cannot remove S2; T1 removes S2', { skip }, async () => {
  assert.ifError(
    (await S1().from('class_members').delete().eq('class_id', classId).eq('user_id', users.S1.uid)).error,
  );
  const afterLeave = await T1().from('class_members').select('user_id').eq('class_id', classId);
  assert.equal(afterLeave.data.length, 1);

  // A student can only delete their own row: PostgREST answers 204 with zero
  // affected rows, so assert the effect — S2 must still be a member.
  await S1().from('class_members').delete().eq('class_id', classId).eq('user_id', users.S2.uid);
  const stillThere = await T1().from('class_members').select('user_id').eq('class_id', classId);
  assert.equal(stillThere.data.length, 1, 'S1 must not be able to remove S2');

  assert.ifError(
    (await T1().from('class_members').delete().eq('class_id', classId).eq('user_id', users.S2.uid)).error,
  );
  const empty = await T1().from('class_members').select('user_id').eq('class_id', classId);
  assert.equal(empty.data.length, 0);
});

// ---------------------------------------------------------------------------
// Archiving
// ---------------------------------------------------------------------------

test('archive: memberships are deleted, the code stops working, un-archive is impossible', { skip }, async () => {
  // S2 re-joins (join_class upserts on the membership primary key).
  const rejoin = await S2().rpc('join_class', { p_code: joinCode, p_takma_ad: S2_NICK });
  assert.ifError(rejoin.error);
  assert.equal(rejoin.data[0].class_id, classId);

  assert.ifError((await T1().from('classes').update({ archived_at: NOW }).eq('id', classId)).error);

  const members = await T1().from('class_members').select('user_id').eq('class_id', classId);
  assert.equal(members.data.length, 0, 'archiving a class deletes its memberships');

  const joinAfter = await S2().rpc('join_class', { p_code: joinCode, p_takma_ad: S2_NICK });
  assert.ifError(joinAfter.error);
  assert.equal(joinAfter.data.length, 0, 'an archived class\'s code returns zero rows');

  // Un-archive is blocked by the immutability trigger: the update "succeeds"
  // but archived_at stays set.
  assert.ifError((await T1().from('classes').update({ archived_at: null }).eq('id', classId)).error);
  const { data } = await T1().from('classes').select('archived_at').eq('id', classId).single();
  assert.notEqual(data.archived_at, null, 'archived_at cannot be cleared again');

  const mine = await S2().rpc('my_classes');
  assert.ifError(mine.error);
  assert.equal(mine.data.length, 0, 'an archived class no longer shows up in my_classes');
});

// ---------------------------------------------------------------------------
// Anonymous students stay out of the global social tables (0001 schema)
// ---------------------------------------------------------------------------

test('anonymous S1 cannot write leaderboard/profiles/friends nor read leaderboard', { skip }, async () => {
  denied(
    await S1().from('leaderboard').insert({ week_id: '2026-W43', user_id: users.S1.uid, nickname: S1_NICK, xp: 10 }),
    'anonymous leaderboard insert',
  );
  denied(
    await S1().from('profiles').insert({ user_id: users.S1.uid, nickname: S1_NICK, invite_code: runCode() }),
    'anonymous profile insert',
  );
  denied(
    await S1().from('friends').insert({ user_id: users.S1.uid, friend_id: users.S2.uid }),
    'anonymous friend insert',
  );
  // RLS-denied SELECTs answer 200 with zero rows (the anon role without any
  // grant gets an error instead), so prove the restriction with a real row:
  // T2 writes their own leaderboard row, S1 must not see it, T2 must.
  assert.ifError((await T2().from('leaderboard').upsert({
    week_id: '2026-W43', user_id: users.T2.uid, nickname: 'OgretmenT2', xp: 10,
  }, { onConflict: 'week_id,user_id' })).error);
  const read = await S1().from('leaderboard').select('*').eq('week_id', '2026-W43');
  assert.ifError(read.error);
  assert.equal(read.data.length, 0, 'anonymous user must not read the leaderboard');

  // Control: an e-mail user can still read the leaderboard (0001 behavior kept).
  const t2Read = await T2().from('leaderboard').select('*').eq('week_id', '2026-W43');
  assert.ifError(t2Read.error);
  assert.ok(t2Read.data.some((r) => r.user_id === users.T2.uid));
});
