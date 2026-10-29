/**
 * Ortak seri (Friend Streaks) integration tests for supabase/migrations/0006_ortak_seri.sql,
 * run against the LOCAL PROTOTYPE documented in scratchpad/supa/PROTO.md — never
 * against production.
 *
 *   SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key from PROTO.md> \
 *     node --test supabase/tests/friendStreak.test.mjs
 *
 * Covers: activity_days RLS (owner-only insert, owner + MUTUAL-friend select),
 * the ±1 day write window, the friend_streaks RPC (streak counting from today
 * or yesterday, zero on a gap, non-mutual friends excluded, anon denied).
 *
 * NOTE on the streak fixtures: the CHECK constraint only allows writing
 * current_date ± 1, so long historical streaks cannot be seeded through the
 * API (in production they accumulate day by day). The fixtures therefore use
 * today/yesterday pairs; the counting loop itself is date-range agnostic
 * (son 400 gün) and is exercised the same way for longer runs.
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
/** Client-local YYYY-MM-DD (device tz), used only as a ±1 probe around the server's today. */
function localDay(offset = 0) {
  return new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
}

const users = {}; // name -> { sb, uid }

async function freshUser(name) {
  const email = `seri-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const sb = makeClient();
  const { data, error } = await sb.auth.signUp({ email, password: PASSWORD });
  assert.ifError(error);
  assert.ok(data.user, `signup for ${email}`);
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ifError(signInError);
  users[name] = { sb, uid: data.user.id, email };
}

const A = () => users.A.sb;
const name = (n) => users[n].uid;

async function mark(name_, day) {
  const { error } = await users[name_].sb
    .from('activity_days')
    .upsert({ user_id: users[name_].uid, day }, { onConflict: 'user_id,day' });
  assert.ifError(error);
}

async function addFriend(from, to) {
  const { error } = await users[from].sb
    .from('friends')
    .insert({ user_id: users[from].uid, friend_id: users[to].uid });
  assert.ifError(error);
}

/** friend_streaks row for `asUser` about `about`; null when absent. */
async function streakRow(asUser, about) {
  const { data, error } = await users[asUser].sb.rpc('friend_streaks');
  assert.ifError(error);
  return (data ?? []).find((r) => r.friend_id === users[about].uid) ?? null;
}

/**
 * The CHECK window guarantees the server's current_date is within ±1 of the
 * client's; probe with the caller's own me_today flag to find the exact day.
 * A↔B are mutual friends before this runs.
 */
async function serverToday() {
  const t0 = localDay(0);
  await mark('A', t0);
  if ((await streakRow('A', 'B')).me_today) return t0;
  const tm1 = localDay(-1);
  await mark('A', tm1);
  if ((await streakRow('A', 'B')).me_today) return tm1;
  return localDay(1);
}

// node:test on Node 20 takes no options object for hooks — guard inside instead.
before(async () => {
  if (skip) return;
  await Promise.all([freshUser('A'), freshUser('B'), freshUser('C'), freshUser('D'), freshUser('F')]);
  // Mutual pairs A↔B, A↔C, A↔D; F only follows A (one-directional).
  await addFriend('A', 'B');
  await addFriend('B', 'A');
  await addFriend('A', 'C');
  await addFriend('C', 'A');
  await addFriend('A', 'D');
  await addFriend('D', 'A');
  await addFriend('F', 'A');
});

after(async () => {
  if (skip) return;
  await Promise.all(Object.values(users).map((u) => u.sb.auth.signOut()));
});

// ---------------------------------------------------------------------------
// activity_days: writes
// ---------------------------------------------------------------------------

test('activity_days: owner marks own day; another user cannot be impersonated', { skip }, async () => {
  const today = await serverToday();
  await mark('B', today);

  const forged = await A().from('activity_days').insert({ user_id: name('B'), day: today });
  assert.ok(forged.error, 'insert with another user_id must violate RLS');
});

test('activity_days: only today ± 1 is writable', { skip }, async () => {
  const today = await serverToday();
  const ok = await A().from('activity_days').upsert(
    { user_id: name('A'), day: today },
    { onConflict: 'user_id,day' },
  );
  assert.ifError(ok.error);

  // -3 is outside the ±1 window for every skew the CHECK constraint allows.
  const old = await A().from('activity_days').insert({ user_id: name('A'), day: localDay(-3) });
  assert.ok(old.error, 'three days back must violate the check');
});

test('activity_days: anon (no session) can neither read nor insert', { skip }, async () => {
  const anon = makeClient();
  const read = await anon.from('activity_days').select('*');
  assert.ok(read.error, 'anon select must be denied');
  const write = await anon.from('activity_days').insert({ user_id: name('A'), day: localDay(0) });
  assert.ok(write.error, 'anon insert must be denied');
});

// ---------------------------------------------------------------------------
// activity_days: reads (owner + mutual only)
// ---------------------------------------------------------------------------

test('activity_days: a non-mutual follower sees nothing of the followed user', { skip }, async () => {
  const today = await serverToday();
  await mark('A', today);
  // F follows A but A does not follow F back.
  const { data, error } = await users.F.sb
    .from('activity_days')
    .select('*')
    .eq('user_id', name('A'));
  assert.ifError(error);
  assert.equal(data.length, 0, 'one-directional friendship must not expose activity days');
});

test('activity_days: the mutual friend sees the day; strangers see nothing', { skip }, async () => {
  const today = await serverToday();
  const mutual = await B().from('activity_days').select('*').eq('user_id', name('A'));
  assert.ifError(mutual.error);
  assert.ok(mutual.data.length >= 1, 'B (mutual) must see A\'s days');

  // C is mutual with A, not with B.
  const stranger = await users.C.sb.from('activity_days').select('*').eq('user_id', name('B'));
  assert.ifError(stranger.error);
  assert.equal(stranger.data.length, 0, 'C must not see B\'s days (not friends)');
});

// ---------------------------------------------------------------------------
// friend_streaks RPC
// ---------------------------------------------------------------------------

test('friend_streaks: both active today and yesterday → streak 2, flags true', { skip }, async () => {
  const today = await serverToday();
  await mark('A', today);
  await mark('A', localDay(-1));
  await mark('B', today);
  await mark('B', localDay(-1));
  const row = await streakRow('A', 'B');
  assert.ok(row, 'mutual friend must appear');
  assert.equal(row.streak, 2);
  assert.equal(row.me_today, true);
  assert.equal(row.friend_today, true);
});

test('friend_streaks: today missing on one side → count starts yesterday', { skip }, async () => {
  const today = await serverToday();
  // C (mutual with A) was active only yesterday; A was active today + yesterday.
  // Anchor is yesterday, both have it → streak 1; the mixed today flags show who is pending.
  await mark('C', localDay(-1));
  const row = await streakRow('A', 'C');
  assert.ok(row);
  assert.equal(row.streak, 1);
  assert.equal(row.me_today, true); // A is active on the server's today

  const reverse = await streakRow('C', 'A');
  assert.ok(reverse);
  assert.equal(reverse.streak, 1);
  assert.equal(reverse.friend_today, true); // A is the friend here
  assert.equal(reverse.me_today, row.friend_today); // flags are symmetric
});

test('friend_streaks: gap at the anchor → streak 0', { skip }, async () => {
  const today = await serverToday();
  // D (mutual with A) never marks days; A has today + yesterday. The anchor is
  // yesterday and D has nothing there → the shared streak is zero.
  const row = await streakRow('A', 'D');
  assert.ok(row, 'mutual friend with no shared days still appears with streak 0');
  assert.equal(row.streak, 0);
  assert.equal(row.friend_today, false);
});

test('friend_streaks: one-directional follower gets no row at all', { skip }, async () => {
  const { data, error } = await users.F.sb.rpc('friend_streaks');
  assert.ifError(error);
  assert.ok(
    (data ?? []).every((r) => r.friend_id !== name('A')),
    'F only follows A; without mutuality A must not appear',
  );
});

test('friend_streaks: result never contains e-mail', { skip }, async () => {
  const { data, error } = await A().rpc('friend_streaks');
  assert.ifError(error);
  for (const row of data ?? []) {
    assert.deepEqual(Object.keys(row).sort(), ['friend_id', 'friend_today', 'me_today', 'streak']);
  }
});

test('friend_streaks: anon is denied', { skip }, async () => {
  const anon = makeClient();
  const { data, error } = await anon.rpc('friend_streaks');
  assert.ok(error, 'anon execute must be denied');
  assert.ok(!data || data.length === 0);
});
