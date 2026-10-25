-- Love-Vox — self-hosted Supabase schema (replaces Firestore; see docs/SUPABASE.md).
-- Table names equal the local outbox table names so sync maps 1:1.
-- Every row belongs to auth.uid(); RLS is the only access control (default deny).
-- Timestamps are timestamptz; the client sends/receives ISO-8601 strings.

begin;

-- ---------------------------------------------------------------
-- Per-user learning data (owner only)
-- ---------------------------------------------------------------
create table public.user_stats (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  xp                integer not null default 0 check (xp >= 0),
  streak            integer not null default 0 check (streak >= 0),
  last_active_date  date,
  streak_freezes    integer not null default 0 check (streak_freezes between 0 and 2),
  hearts            integer not null default 5 check (hearts between 0 and 5),
  hearts_updated_at timestamptz not null,
  daily_goal_xp     integer not null check (daily_goal_xp between 0 and 1000),
  xp_today          integer not null default 0 check (xp_today >= 0),
  updated_at        timestamptz not null
);

create table public.user_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    text not null check (char_length(lesson_id) between 1 and 128),
  crowns       integer not null default 0 check (crowns between 0 and 5),
  completed_at timestamptz,
  updated_at   timestamptz not null,
  primary key (user_id, lesson_id)
);

create table public.srs_cards (
  user_id          uuid not null references auth.users (id) on delete cascade,
  vocab_id         text not null check (char_length(vocab_id) between 1 and 128),
  ease             real not null check (ease between 1.3 and 10),
  interval_days    real not null check (interval_days >= 0),
  reps             integer not null check (reps >= 0),
  due_at           timestamptz not null,
  last_reviewed_at timestamptz,
  updated_at       timestamptz not null,
  primary key (user_id, vocab_id)
);

create table public.events (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 200),
  type       text not null check (char_length(type) between 1 and 64),
  payload    jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  primary key (user_id, id)
);

create index user_progress_updated on public.user_progress (user_id, updated_at);
create index srs_cards_updated     on public.srs_cards (user_id, updated_at);
create index events_created        on public.events (user_id, created_at);

-- ---------------------------------------------------------------
-- Social: nickname profile, friends, weekly leaderboard
-- E-mail is never stored in public tables (KVKK).
-- ---------------------------------------------------------------
create table public.profiles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null check (char_length(nickname) between 3 and 20
                                   and nickname ~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$'),
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  updated_at  timestamptz not null default now()
);

create table public.friends (
  user_id   uuid not null references auth.users (id) on delete cascade,
  friend_id uuid not null references auth.users (id) on delete cascade,
  added_at  timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.leaderboard (
  week_id    text not null check (week_id ~ '^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$'),
  user_id    uuid not null references auth.users (id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 3 and 20
                                  and nickname ~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$'),
  xp         integer not null check (xp between 0 and 100000),
  updated_at timestamptz not null default now(),
  primary key (week_id, user_id)
);
create index leaderboard_week_xp on public.leaderboard (week_id, xp desc);

-- ---------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------
alter table public.user_stats    enable row level security;
alter table public.user_progress enable row level security;
alter table public.srs_cards     enable row level security;
alter table public.events        enable row level security;
alter table public.profiles      enable row level security;
alter table public.friends       enable row level security;
alter table public.leaderboard   enable row level security;

-- owner-only learning data: select/insert/update; never delete from the client
create policy own_select on public.user_stats    for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.user_stats    for insert to authenticated with check (user_id = auth.uid());
create policy own_update on public.user_stats    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_select on public.user_progress for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.user_progress for insert to authenticated with check (user_id = auth.uid());
create policy own_update on public.user_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_select on public.srs_cards     for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.srs_cards     for insert to authenticated with check (user_id = auth.uid());
create policy own_update on public.srs_cards     for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_select on public.events        for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.events        for insert to authenticated with check (user_id = auth.uid());
-- re-pushing an already synced event (outbox retry) stays idempotent; created_at is immutable (trigger below)
create policy own_update on public.events        for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- profile: owner only; invite_code immutable after creation (trigger below)
create policy own_select on public.profiles for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy own_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friends: owner manages own list (one-directional "follow")
create policy own_select on public.friends for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.friends for insert to authenticated with check (user_id = auth.uid());
create policy own_delete on public.friends for delete to authenticated using (user_id = auth.uid());

-- leaderboard: every signed-in user reads; only the owner writes own row; no delete
create policy read_all   on public.leaderboard for select to authenticated using (true);
create policy own_insert on public.leaderboard for insert to authenticated with check (user_id = auth.uid());
create policy own_update on public.leaderboard for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- immutability guards
create function public.keep_created_at() returns trigger language plpgsql as $$
begin
  new.created_at := old.created_at;
  return new;
end $$;
create trigger events_keep_created_at before update on public.events
  for each row execute function public.keep_created_at();

create function public.keep_invite_code() returns trigger language plpgsql as $$
begin
  new.invite_code := old.invite_code;
  return new;
end $$;
create trigger profiles_keep_invite_code before update on public.profiles
  for each row execute function public.keep_invite_code();

-- invite lookup without listing: exact code → (user_id, nickname); null when unknown
create function public.resolve_invite(code text)
returns table (user_id uuid, nickname text)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.nickname from public.profiles p
  where auth.uid() is not null and p.invite_code = upper(code)
$$;
revoke all on function public.resolve_invite(text) from public, anon;
grant execute on function public.resolve_invite(text) to authenticated;

-- the caller's friends with their current nicknames (profiles are otherwise owner-only)
create function public.my_friends()
returns table (friend_id uuid, nickname text, added_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.friend_id, p.nickname, f.added_at
  from public.friends f join public.profiles p on p.user_id = f.friend_id
  where f.user_id = auth.uid()
$$;
revoke all on function public.my_friends() from public, anon;
grant execute on function public.my_friends() to authenticated;

-- grants (RLS still applies); anon gets nothing
revoke all on public.user_stats, public.user_progress, public.srs_cards, public.events,
              public.profiles, public.friends, public.leaderboard from anon;
grant select, insert, update on public.user_stats, public.user_progress, public.srs_cards,
                                public.events, public.profiles, public.leaderboard to authenticated;
grant select, insert, delete on public.friends to authenticated;

commit;
