# RLS integration tests

Integration tests for the row-level security policies in
[`supabase/migrations/0001_lovevox.sql`](../migrations/0001_lovevox.sql) and
[`supabase/migrations/0002_siniflar.sql`](../migrations/0002_siniflar.sql)
(teacher / class, madde 5), run with the Node built-in test runner against
the **local prototype only** (see `scratchpad/supa/PROTO.md` — never run
these against production).

## Run

```bash
cd <repo root>
SUPA_URL=http://127.0.0.1:35143 SUPA_ANON=<anon key from PROTO.md> \
  node --test supabase/tests/
```

## What is covered

**`rls.test.mjs`** — the 0001 schema. Each run signs up three fresh users
(unique `@example.test` e-mails, password signup, auto-confirmed by the
prototype) and asserts:

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

**`classes.test.mjs`** — the 0002 teacher/class schema. Each run creates two
teachers (T1/T2, e-mail users) and two students (S1/S2, GoTrue **anonymous**
sign-in, the madde-5 student flow). The tests are ordered and tell one story
(open class → join → learn → leave → archive):

- **Teacher onboarding:** T1 becomes a teacher; an anonymous user cannot
  (`teachers` insert denied). A class without `veli_bilgilendirildi=true` is
  rejected; an anonymous user can never open a class.
- **Cross-teacher isolation:** T2 (also a teacher) cannot read T1's
  class/members/assignments rows and gets `42501 not_teacher` from
  `class_progress`/`class_struggles` and `42501 not_member` from
  `class_league`.
- **Joining:** S1 joins with the code + nickname (lowercase code works);
  an unknown code returns zero rows; after 10 wrong codes even the right
  code raises `too_many_attempts`; a taken nickname → `23505`, a bad
  nickname → `23514`.
- **Student access:** S1 cannot read the `classes` table nor call
  `class_progress`, but CAN call `class_league` (nicknames + weekly XP,
  `is_me` true only on the own row) and `my_classes()`; direct inserts into
  `class_members` are denied (join only via `join_class`).
- **Assignments:** the teacher creates/manages (duplicate unit → `23505`),
  members read but cannot create.
- **Immutability:** `teacher_id`/`course_id` updates are reverted by the
  trigger; archiving deletes all memberships, kills the join code
  (zero rows) and cannot be undone (`archived_at` stays set).
- **Summaries:** `class_progress` returns S1's weekly XP (sum of
  `payload.xp`) and completed lessons; `class_struggles` aggregates
  correct/total and `mistakes_by_type` across both members.
- **Anonymous lockout (0001 tables):** S1 cannot write `leaderboard`,
  `profiles` or `friends` and reads an empty leaderboard while an e-mail
  user's row is visible to e-mail users.

RLS-denied updates/deletes answer `204` and **zero affected rows**, and
RLS-denied selects of a signed-in user answer `200` with **zero rows**
(PostgREST applies the policy as a filter) — those assertions verify that
the target row is unchanged / invisible rather than expecting an error. Only
the anon role (no grant at all) gets an error response.

The tests need `@supabase/supabase-js` (resolved from the repo's
`node_modules`; on Node < 22 the `ws` package is picked up as the Realtime
WebSocket transport — realtime itself is unused here).
