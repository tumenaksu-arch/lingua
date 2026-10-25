# RLS integration tests

Integration tests for the row-level security policies in
[`supabase/migrations/0001_lovevox.sql`](../migrations/0001_lovevox.sql),
run with the Node built-in test runner against the **local prototype only**
(see `scratchpad/supa/PROTO.md` — never run these against production).

## Run

```bash
cd <repo root>
SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key from PROTO.md> \
  node --test supabase/tests/
```

## What is covered

Each run signs up three fresh users (unique `@example.test` e-mails, password
signup, auto-confirmed by the prototype) and asserts:

- **Cross-user isolation (learning tables):** A cannot read, insert or update
  B's rows in `user_stats`, `user_progress`, `srs_cards`, `events`; the anon
  role can read nothing from any table.
- **Own rows:** A can upsert own rows in all four learning tables (including
  `user_progress.lesson_id = 'tr-en.u1.story'`); an `events` update cannot
  change `created_at` (trigger-guarded).
- **Profiles:** Turkish nicknames (`Gül Üzüm_ç`) are accepted; too-short or
  scripted nicknames are rejected; `invite_code` is immutable (update is
  reverted by trigger) and globally unique (duplicate insert → `23505`).
- **resolve_invite:** resolves a code to exactly `(user_id, nickname)`; unknown
  code → empty; anon → denied; and a full-table select exposes only the
  caller's own profile, so there is no way to enumerate all players.
- **Friends:** one-directional adds, duplicate → `23505`, self-friend rejected,
  A cannot write into C's list, `my_friends()` returns the friend's current
  nickname, delete works for the owner.
- **Leaderboard:** owner-only writes (including no row for another user),
  `xp` bounds and `week_id` format enforced, every signed-in user reads the
  week, anon cannot, and deletes are no-ops.

RLS-denied updates/deletes answer with `204` and **zero affected rows**
(PostgREST applies the policy as a filter), so those assertions verify that
the target row is unchanged rather than expecting an error.

The tests need `@supabase/supabase-js` (resolved from the repo's
`node_modules`; on Node < 22 the `ws` package is picked up as the Realtime
WebSocket transport — realtime itself is unused here).
