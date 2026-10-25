/**
 * RLS integration tests for the Love-Vox Supabase schema
 * (supabase/migrations/0001_lovevox.sql), run against the LOCAL PROTOTYPE
 * documented in scratchpad/supa/PROTO.md — never against production.
 *
 *   SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key from PROTO.md> \
 *     node --test supabase/tests/
 *
 * Creates three fresh users per run (unique @example.test e-mails, password
 * signup, auto-confirmed by the prototype) and asserts the RLS policies:
 * owner-only learning data and profiles, one-directional friends, world-
 * readable leaderboard with owner-only writes, immutable invite codes and
 * event timestamps, and an anon role that can read nothing.
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

const WEEK = '2026-W43';
const NOW = '2026-10-21T12:00:00.000Z';
const LATER = '2026-10-25T12:00:00.000Z';
const PASSWORD = 'TestPass!12345';

// Invite codes are globally unique in the (persistent) prototype database,
// so every run draws fresh 6-char codes from the schema's alphabet.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const runCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const A_CODE = runCode();
const B_CODE = runCode();

const users = {}; // name -> { sb, uid }

async function freshUser(name) {
  const email = `rls-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const sb = makeClient();
  const { data, error } = await sb.auth.signUp({ email, password: PASSWORD });
  assert.ifError(error);
  assert.ok(data.user, `signup for ${email}`);
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ifError(signInError);
  users[name] = { sb, uid: data.user.id, email };
}

const A = () => users.A.sb;
const B = () => users.B.sb;
const C = () => users.C.sb;

/** Learning-table fixture row owned by `uid`. */
function learningRow(table, uid) {
  switch (table) {
    case 'user_stats':
      return {
        user_id: uid, xp: 10, streak: 1, last_active_date: '2026-10-21', streak_freezes: 0,
        hearts: 5, hearts_updated_at: NOW, daily_goal_xp: 50, xp_today: 10, updated_at: NOW,
      };
    case 'user_progress':
      return { user_id: uid, lesson_id: 'tr-en.u1.story', crowns: 1, completed_at: NOW, updated_at: NOW };
    case 'srs_cards':
      return {
        user_id: uid, vocab_id: 'tr-en.v1', ease: 2.5, interval_days: 1, reps: 1,
        due_at: NOW, last_reviewed_at: NOW, updated_at: NOW,
      };
    case 'events':
      return { user_id: uid, id: 'e1', type: 'lesson_completed', payload: { xp: 10 }, created_at: NOW, updated_at: NOW };
    default:
      throw new Error(`unknown table ${table}`);
  }
}

const LEARNING_TABLES = ['user_stats', 'user_progress', 'srs_cards', 'events'];

// node:test on Node 20 takes no options object for hooks — guard inside instead.
before(async () => {
  if (skip) return;
  await Promise.all([freshUser('A'), freshUser('B'), freshUser('C')]);
});

after(async () => {
  if (skip) return;
  await Promise.all(Object.values(users).map((u) => u.sb.auth.signOut()));
});

// ---------------------------------------------------------------------------
// Cross-user access to the learning tables
// ---------------------------------------------------------------------------

for (const table of LEARNING_TABLES) {
  test(`${table}: A cannot read, insert or update B's rows`, { skip }, async () => {
    assert.ifError((await B().from(table).insert(learningRow(table, users.B.uid))).error);

    const read = await A().from(table).select('*').eq('user_id', users.B.uid);
    assert.ifError(read.error);
    assert.equal((read.data ?? []).filter((r) => r.user_id === users.B.uid).length, 0);

    const inserted = await A().from(table).insert(learningRow(table, users.B.uid));
    assert.ok(inserted.error, 'insert into B\'s scope must be rejected');

    // RLS filters A out of the UPDATE's USING clause: PostgREST answers 204
    // with zero affected rows (no error), so assert the effect — B's row must
    // be untouched.
    await A().from(table).update({ updated_at: LATER }).eq('user_id', users.B.uid);
    const still = await B().from(table).select('updated_at').eq('user_id', users.B.uid);
    assert.ok(still.data.length >= 1);
    assert.ok(
      still.data.every((r) => new Date(r.updated_at).toISOString() === NOW),
      'A\'s update must not change B\'s rows',
    );
  });
}

test('anon (no session) reads nothing from any table', { skip }, async () => {
  const anon = makeClient();
  for (const table of [...LEARNING_TABLES, 'profiles', 'friends', 'leaderboard']) {
    const { data, error } = await anon.from(table).select('*');
    assert.ok(error, `anon select on ${table} must be denied`);
    assert.ok(!data || data.length === 0);
  }
});

// ---------------------------------------------------------------------------
// Own learning rows
// ---------------------------------------------------------------------------

for (const table of LEARNING_TABLES) {
  test(`${table}: A can upsert own row`, { skip }, async () => {
    const row = learningRow(table, users.A.uid);
    const conflict =
      table === 'user_stats' ? 'user_id'
      : table === 'user_progress' ? 'user_id,lesson_id'
      : table === 'srs_cards' ? 'user_id,vocab_id'
      : 'user_id,id';
    const { error } = await A().from(table).upsert(row, { onConflict: conflict });
    assert.ifError(error);
  });
}

test('user_progress: lesson_id tr-en.u1.story is accepted', { skip }, async () => {
  const { data, error } = await A().from('user_progress').select('lesson_id').eq('user_id', users.A.uid);
  assert.ifError(error);
  assert.ok(data.some((r) => r.lesson_id === 'tr-en.u1.story'));
});

test('events: created_at cannot be changed by an update', { skip }, async () => {
  const { error } = await A().from('events')
    .update({ payload: { xp: 20 }, created_at: LATER })
    .eq('user_id', users.A.uid)
    .eq('id', 'e1');
  assert.ifError(error);
  const { data } = await A().from('events').select('created_at').eq('user_id', users.A.uid).eq('id', 'e1').single();
  assert.equal(new Date(data.created_at).toISOString(), NOW);
});

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

test('profiles: Turkish nickname is accepted', { skip }, async () => {
  const { error } = await A().from('profiles').insert({
    user_id: users.A.uid, nickname: 'Gül Üzüm_ç', invite_code: A_CODE, updated_at: NOW,
  });
  assert.ifError(error);
});

test('profiles: bad nicknames are rejected', { skip }, async () => {
  for (const bad of ['ab', '<script>']) {
    const { error } = await B().from('profiles').insert({
      user_id: users.B.uid, nickname: bad, invite_code: runCode(), updated_at: NOW,
    });
    assert.ok(error, `nickname ${JSON.stringify(bad)} must be rejected`);
  }
  // B still has no profile — confirm nothing leaked in.
  const { data } = await B().from('profiles').select('*');
  assert.equal(data.length, 0);
});

test('profiles: duplicate invite code → 23505', { skip }, async () => {
  const { error } = await B().from('profiles').insert({
    user_id: users.B.uid, nickname: 'Bobby', invite_code: A_CODE, updated_at: NOW,
  });
  assert.ok(error, 'insert with A\'s invite code must fail');
  assert.equal(error.code, '23505');
});

test('profiles: invite_code cannot be changed by an update', { skip }, async () => {
  assert.ifError((await B().from('profiles').insert({
    user_id: users.B.uid, nickname: 'Bobby', invite_code: B_CODE, updated_at: NOW,
  })).error);
  const { error } = await B().from('profiles').update({ invite_code: 'ZZZZZZ' }).eq('user_id', users.B.uid);
  assert.ifError(error); // the write itself is allowed…
  const { data } = await B().from('profiles').select('invite_code').eq('user_id', users.B.uid).single();
  assert.equal(data.invite_code, B_CODE); // …but the trigger restores the old code
});

test('profiles: A cannot read or write B\'s profile', { skip }, async () => {
  const read = await A().from('profiles').select('*');
  assert.ifError(read.error);
  assert.equal(read.data.length, 1, 'A sees exactly one profile (their own)');
  assert.equal(read.data[0].user_id, users.A.uid);

  await A().from('profiles').update({ nickname: 'Hack' }).eq('user_id', users.B.uid);
  const bProfile = await B().from('profiles').select('nickname').eq('user_id', users.B.uid).single();
  assert.equal(bProfile.data.nickname, 'Bobby', 'A\'s update must not change B\'s profile');
  const inserted = await A().from('profiles').insert({
    user_id: users.B.uid, nickname: 'Hack', invite_code: runCode(), updated_at: NOW,
  });
  assert.ok(inserted.error);
});

test('profiles: there is no way for A to list all profiles', { skip }, async () => {
  const { data, error } = await A().from('profiles').select('*');
  assert.ifError(error);
  const ids = new Set(data.map((r) => r.user_id));
  assert.equal(ids.size, 1);
  assert.ok(ids.has(users.A.uid));
  assert.ok(!ids.has(users.B.uid) && !ids.has(users.C.uid));
});

// ---------------------------------------------------------------------------
// resolve_invite
// ---------------------------------------------------------------------------

test('resolve_invite: A resolves B\'s code → B uid + nickname', { skip }, async () => {
  const { data, error } = await A().rpc('resolve_invite', { code: B_CODE });
  assert.ifError(error);
  assert.equal(data.length, 1);
  assert.equal(data[0].user_id, users.B.uid);
  assert.equal(data[0].nickname, 'Bobby');
});

test('resolve_invite: unknown code → empty, anon → denied/empty', { skip }, async () => {
  const { data } = await A().rpc('resolve_invite', { code: 'ZZZZZZ' });
  assert.ok(!data || data.length === 0);

  const anon = makeClient();
  const anonRes = await anon.rpc('resolve_invite', { code: B_CODE });
  assert.ok(anonRes.error || !anonRes.data || anonRes.data.length === 0);
});

// ---------------------------------------------------------------------------
// Friends
// ---------------------------------------------------------------------------

test('friends: A adds B; duplicate and self-friend rejected', { skip }, async () => {
  const { error } = await A().from('friends').insert({ user_id: users.A.uid, friend_id: users.B.uid });
  assert.ifError(error);

  const dup = await A().from('friends').insert({ user_id: users.A.uid, friend_id: users.B.uid });
  assert.ok(dup.error, 'duplicate friendship must violate the primary key');
  assert.equal(dup.error.code, '23505');

  const self = await A().from('friends').insert({ user_id: users.A.uid, friend_id: users.A.uid });
  assert.ok(self.error, 'self-friend must violate the check constraint');
});

test('friends: A cannot add a row into C\'s list', { skip }, async () => {
  const { error } = await A().from('friends').insert({ user_id: users.C.uid, friend_id: users.A.uid });
  assert.ok(error, 'insert with user_id = C must violate RLS');
});

test('friends: A cannot read C\'s friend rows', { skip }, async () => {
  const { data, error } = await A().from('friends').select('*');
  assert.ifError(error);
  assert.ok(data.every((r) => r.user_id === users.A.uid));
});

test('my_friends: A sees B with nickname; C sees nobody', { skip }, async () => {
  const forA = await A().rpc('my_friends');
  assert.ifError(forA.error);
  assert.equal(forA.data.length, 1);
  assert.equal(forA.data[0].friend_id, users.B.uid);
  assert.equal(forA.data[0].nickname, 'Bobby');

  const forC = await C().rpc('my_friends');
  assert.ifError(forC.error);
  assert.equal(forC.data.length, 0);
});

test('friends: A removes B from the own list', { skip }, async () => {
  const { error } = await A().from('friends')
    .delete()
    .eq('user_id', users.A.uid)
    .eq('friend_id', users.B.uid);
  assert.ifError(error);
  const { data } = await A().rpc('my_friends');
  assert.equal(data.length, 0);
});

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

test('leaderboard: A writes own row', { skip }, async () => {
  const { error } = await A().from('leaderboard').upsert({
    week_id: WEEK, user_id: users.A.uid, nickname: 'Gül Üzüm_ç', xp: 50, updated_at: NOW,
  }, { onConflict: 'week_id,user_id' });
  assert.ifError(error);
});

test('leaderboard: A cannot write a row with B\'s user_id', { skip }, async () => {
  const { error } = await A().from('leaderboard').insert({
    week_id: WEEK, user_id: users.B.uid, nickname: 'Bobby', xp: 10, updated_at: NOW,
  });
  assert.ok(error, 'insert with user_id = B must violate RLS');
});

test('leaderboard: xp -1 / 100001 / bad week_id rejected', { skip }, async () => {
  for (const [xp, week] of [[-1, WEEK], [100001, WEEK], [10, '2026-W99']]) {
    const { error } = await A().from('leaderboard').upsert({
      week_id: week, user_id: users.A.uid, nickname: 'Gül Üzüm_ç', xp, updated_at: NOW,
    }, { onConflict: 'week_id,user_id' });
    assert.ok(error, `xp=${xp} week=${week} must be rejected`);
  }
});

test('leaderboard: every signed-in user reads the week; anon cannot', { skip }, async () => {
  for (const client of [B(), C()]) {
    const { data, error } = await client.from('leaderboard').select('*').eq('week_id', WEEK);
    assert.ifError(error);
    // Earlier test runs leave rows of their own users in this week; A's row
    // must be among them, readable by everyone signed in.
    const aRow = (data ?? []).filter((r) => r.user_id === users.A.uid);
    assert.equal(aRow.length, 1);
    assert.equal(aRow[0].nickname, 'Gül Üzüm_ç');
  }

  const anon = makeClient();
  const { data, error } = await anon.from('leaderboard').select('*').eq('week_id', WEEK);
  assert.ok(error, 'anon read must be denied');
  assert.ok(!data || data.length === 0);
});

test('leaderboard: nobody deletes rows', { skip }, async () => {
  // No delete policy and no DELETE grant: PostgREST answers 204 with zero
  // affected rows, so assert the effect — the row must still be there.
  await A().from('leaderboard').delete().eq('week_id', WEEK).eq('user_id', users.A.uid);
  const { data } = await A().from('leaderboard').select('user_id').eq('week_id', WEEK).eq('user_id', users.A.uid);
  assert.equal(data.length, 1, 'delete must be a no-op (no policy, no grant)');
});
