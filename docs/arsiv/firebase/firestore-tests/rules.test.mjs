// @ts-nocheck — plain-JS test run by `node --test` against the Firestore emulator.
//
// Firestore security-rules tests for roadmap item 3b (nickname profile, invite
// codes, weekly leaderboard, friends) — plus regression checks that the
// pre-existing users/{uid} rules still accept their valid writes.
//
// Run with the project root as cwd; Firebase + @firebase/rules-unit-testing are
// resolved from NODE_PATH (see firestore-tests/README.md for the exact command).
// NOTE: @firebase/rules-unit-testing v4 returns the compat (namespaced) Firestore
// from authenticatedContext().firestore(), so the compat API is used below.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { after, before, beforeEach, test } from 'node:test';

// ESM import specifiers ignore NODE_PATH, so resolve the emulator-only packages
// (firebase + @firebase/rules-unit-testing) through CJS require, which honors it.
const require = createRequire(import.meta.url);
require('firebase/compat/firestore');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const PROJECT = 'demo-lovevox';
const ISO = '2026-10-25T12:00:00.000Z';

let env;

function dbFor(uid) {
  return uid === null ? env.unauthenticatedContext().firestore() : env.authenticatedContext(uid).firestore();
}

/** Asserts that `op` fails with permission-denied. */
async function denied(op) {
  await assert.rejects(op, (e) => {
    const code = typeof e === 'object' && e && 'code' in e ? String(e.code) : '';
    return code === 'permission-denied';
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { host: 'localhost', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
});

after(async () => {
  await env.cleanup();
});

// ---------------------------------------------------------------------------
// users/{uid}/profile/current
// ---------------------------------------------------------------------------

test('profile: owner can create and read their own profile', async () => {
  const db = dbFor('alice');
  await db.doc('users/alice/profile/current').set({
    user_id: 'alice',
    nickname: 'Gül Üzüm_ç',
    invite_code: 'ABC234',
    updated_at: ISO,
  });
  const snap = await db.doc('users/alice/profile/current').get();
  assert.equal(snap.data()?.nickname, 'Gül Üzüm_ç');
});

test('profile: another user cannot read or write the profile', async () => {
  await denied(() =>
    dbFor('bob').doc('users/alice/profile/current').set({
      user_id: 'alice',
      nickname: 'Gül Üzüm_ç',
      invite_code: 'ABC234',
      updated_at: ISO,
    }),
  );
  const bob = dbFor('bob');
  await bob.doc('users/bob/profile/current').set({
    user_id: 'bob',
    nickname: 'Bob',
    invite_code: 'DEF567',
    updated_at: ISO,
  });
  await denied(() => dbFor('alice').doc('users/bob/profile/current').get());
});

test('profile: e-mail field and bad nickname are rejected', async () => {
  const alice = dbFor('alice');
  await denied(() =>
    alice.doc('users/alice/profile/current').set({
      user_id: 'alice',
      nickname: 'Gül Üzüm_ç',
      invite_code: 'ABC234',
      email: 'alice@example.com',
      updated_at: ISO,
    }),
  );
  await denied(() =>
    alice.doc('users/alice/profile/current').set({
      user_id: 'alice',
      nickname: 'ab',
      invite_code: 'ABC234',
      updated_at: ISO,
    }),
  );
});

test('profile: create under a doc id other than current is denied', async () => {
  await denied(() =>
    dbFor('alice').doc('users/alice/profile/other').set({
      user_id: 'alice',
      nickname: 'Gül Üzüm_ç',
      invite_code: 'ABC234',
      updated_at: ISO,
    }),
  );
});

test('profile: unauthenticated read is denied', async () => {
  await dbFor('alice').doc('users/alice/profile/current').set({
    user_id: 'alice',
    nickname: 'Gül Üzüm_ç',
    invite_code: 'ABC234',
    updated_at: ISO,
  });
  await denied(() => dbFor(null).doc('users/alice/profile/current').get());
});

test('profile: invite_code is immutable once created', async () => {
  const alice = dbFor('alice');
  await alice.doc('users/alice/profile/current').set({
    user_id: 'alice',
    nickname: 'Gül Üzüm_ç',
    invite_code: 'ABC234',
    updated_at: ISO,
  });
  // A valid update (nickname change) is fine…
  await alice.doc('users/alice/profile/current').update({ nickname: 'KediYıldız', updated_at: ISO });
  // …but swapping in someone else's invite code is not.
  await denied(() =>
    alice.doc('users/alice/profile/current').update({ invite_code: 'DEF567', updated_at: ISO }),
  );
  const snap = await alice.doc('users/alice/profile/current').get();
  assert.equal(snap.data()?.invite_code, 'ABC234');
});

// ---------------------------------------------------------------------------
// invites/{code}
// ---------------------------------------------------------------------------

test('invite: signed-in user can get, foreign uid create is denied, list denied', async () => {
  await dbFor('alice').doc('invites/ABC234').set({ uid: 'alice', nickname: 'Gül Üzüm_ç', created_at: ISO });
  const snap = await dbFor('bob').doc('invites/ABC234').get();
  assert.equal(snap.data()?.uid, 'alice');
  // create claiming a foreign uid
  await denied(() => dbFor('eve').doc('invites/XYZ789').set({ uid: 'alice', nickname: 'Sahtekar', created_at: ISO }));
  // list the whole collection
  await denied(() => dbFor('bob').collection('invites').get());
});

test('invite: unauthenticated get denied; bad code shape denied', async () => {
  await dbFor('alice').doc('invites/ABC234').set({ uid: 'alice', nickname: 'Gül Üzüm_ç', created_at: ISO });
  await denied(() => dbFor(null).doc('invites/ABC234').get());
  await denied(() =>
    dbFor('alice').doc('invites/toolong!!').set({ uid: 'alice', nickname: 'Gül Üzüm_ç', created_at: ISO }),
  );
});

test('invite: a non-owner cannot delete or take over an invite', async () => {
  await dbFor('alice').doc('invites/ABC234').set({ uid: 'alice', nickname: 'Gül Üzüm_ç', created_at: ISO });
  await denied(() => dbFor('bob').doc('invites/ABC234').delete());
  await denied(() => dbFor('bob').doc('invites/ABC234').update({ uid: 'bob' }));
  const snap = await dbFor('alice').doc('invites/ABC234').get();
  assert.equal(snap.data()?.uid, 'alice');
});

// ---------------------------------------------------------------------------
// leaderboard/{weekId}/entries/{uid}
// ---------------------------------------------------------------------------

const validEntry = { nickname: 'Gül Üzüm_ç', xp: 120, updated_at: ISO };

test('leaderboard: owner write ok, other uid write denied, reads work', async () => {
  await dbFor('alice').doc('leaderboard/2026-W43/entries/alice').set(validEntry);
  const snap = await dbFor('bob').doc('leaderboard/2026-W43/entries/alice').get();
  assert.equal(snap.data()?.xp, 120);
  await denied(() => dbFor('bob').doc('leaderboard/2026-W43/entries/alice').set(validEntry));
  await denied(() => dbFor(null).doc('leaderboard/2026-W43/entries/guest').set(validEntry));
  const listed = await dbFor('bob').collection('leaderboard/2026-W43/entries').where('xp', '>', 0).get();
  assert.equal(listed.size, 1);
  await denied(() => dbFor(null).collection('leaderboard/2026-W43/entries').get());
});

test('leaderboard: bad data denied (nickname, extra field, xp bounds, weekId)', async () => {
  const alice = dbFor('alice');
  const base = 'leaderboard/2026-W43/entries/alice';
  await denied(() => alice.doc(base).set({ ...validEntry, nickname: 'x' })); // too short
  await denied(() => alice.doc(base).set({ ...validEntry, email: 'a@b.c' })); // extra field
  await denied(() => alice.doc(base).set({ ...validEntry, xp: -1 }));
  await denied(() => alice.doc(base).set({ ...validEntry, xp: 100001 }));
  await denied(() => alice.doc('leaderboard/week43/entries/alice').set(validEntry)); // bad weekId
  await denied(() => dbFor(null).doc(base).get());
});

test('leaderboard: update adding an extra field is denied', async () => {
  const alice = dbFor('alice');
  const ref = alice.doc('leaderboard/2026-W43/entries/alice');
  await ref.set(validEntry);
  // A normal update is fine…
  await ref.update({ xp: 200, updated_at: ISO });
  // …but sneaking an extra field (e.g. e-mail) into an update is not.
  await denied(() => ref.update({ email: 'alice@example.com' }));
  const snap = await dbFor('bob').doc('leaderboard/2026-W43/entries/alice').get();
  assert.equal(snap.data()?.xp, 200);
  assert.equal(snap.data()?.email, undefined);
});

test('leaderboard: delete is never allowed, not even for the owner', async () => {
  const alice = dbFor('alice');
  const ref = alice.doc('leaderboard/2026-W43/entries/alice');
  await ref.set(validEntry);
  await denied(() => ref.delete());
  const snap = await dbFor('bob').doc('leaderboard/2026-W43/entries/alice').get();
  assert.equal(snap.data()?.xp, 120);
});

// ---------------------------------------------------------------------------
// users/{uid}/friends/{friendUid}
// ---------------------------------------------------------------------------

test('friends: owner manages list; others cannot read; self-add and id mismatch denied', async () => {
  await dbFor('alice').doc('users/alice/friends/bob').set({ friend_uid: 'bob', nickname: 'Bob', added_at: ISO });
  const mine = await dbFor('alice').doc('users/alice/friends/bob').get();
  assert.equal(mine.data()?.nickname, 'Bob');
  await denied(() => dbFor('carol').doc('users/alice/friends/bob').get());
  await denied(() => dbFor(null).doc('users/alice/friends/bob').get());
  await denied(() =>
    dbFor('alice').doc('users/alice/friends/alice').set({ friend_uid: 'alice', nickname: 'Alice', added_at: ISO }),
  );
  await denied(() =>
    dbFor('alice').doc('users/alice/friends/bob').set({ friend_uid: 'carol', nickname: 'Carol', added_at: ISO }),
  );
});

// ---------------------------------------------------------------------------
// Regression: pre-existing users/{uid} rules still accept valid writes
// ---------------------------------------------------------------------------

test('existing rules: stats, progress (incl. story id) and events still writable', async () => {
  const alice = dbFor('alice');
  await alice.doc('users/alice/stats/current').set({
    user_id: 'alice',
    xp: 10,
    streak: 1,
    streak_freezes: 0,
    hearts: 5,
    hearts_updated_at: ISO,
    daily_goal_xp: 20,
    xp_today: 10,
    last_active_date: '2026-10-25',
    updated_at: ISO,
  });
  await alice.doc('users/alice/progress/tr-en.u1.story').set({
    user_id: 'alice',
    lesson_id: 'tr-en.u1.story',
    crowns: 1,
    completed_at: ISO,
    updated_at: ISO,
  });
  await alice.doc('users/alice/events/e1').set({
    id: 'e1',
    user_id: 'alice',
    type: 'lesson_completed',
    payload: { xp: 10 },
    created_at: ISO,
    updated_at: ISO,
  });
  // and still private to the owner
  await denied(() => dbFor('bob').doc('users/alice/stats/current').get());
  await denied(() => dbFor('bob').doc('users/alice/progress/tr-en.u1.story').get());
});
