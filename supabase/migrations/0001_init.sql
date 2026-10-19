-- Lingua initial schema. See docs/ARCHITECTURE.md §3.
create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- content (public read) ----------
create table public.courses (
  id text primary key,
  from_lang text not null,
  to_lang text not null,
  title text not null,
  updated_at timestamptz not null default now()
);

create table public.units (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  "order" int not null,
  title text not null,
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id text primary key,
  unit_id text not null references public.units(id) on delete cascade,
  "order" int not null,
  vocab_ids text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id text primary key,
  lesson_id text not null references public.lessons(id) on delete cascade,
  "order" int not null,
  type text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.vocab (
  id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  term text not null,
  translation text not null,
  example text,
  updated_at timestamptz not null default now()
);

create index on public.units(course_id, "order");
create index on public.lessons(unit_id, "order");
create index on public.exercises(lesson_id, "order");
create index on public.vocab(course_id);

-- ---------- user data (RLS: owner only) ----------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active_course_id text references public.courses(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0,
  streak int not null default 0,
  last_active_date date,
  streak_freezes int not null default 0,
  hearts int not null default 5,
  hearts_updated_at timestamptz not null default now(),
  daily_goal_xp int not null default 20,
  xp_today int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id text not null references public.lessons(id) on delete cascade,
  crowns int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.srs_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  vocab_id text not null references public.vocab(id) on delete cascade,
  ease real not null default 2.5,
  interval_days real not null default 0,
  reps int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, vocab_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index on public.srs_cards(user_id, due_at);
create index on public.user_progress(user_id, updated_at);
create index on public.srs_cards(user_id, updated_at);
create index on public.events(user_id, created_at);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['courses','units','lessons','exercises','vocab','profiles','user_stats','user_progress','srs_cards']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.courses enable row level security;
alter table public.units enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.vocab enable row level security;
alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.user_progress enable row level security;
alter table public.srs_cards enable row level security;
alter table public.events enable row level security;

create policy "content public read" on public.courses for select using (true);
create policy "content public read" on public.units for select using (true);
create policy "content public read" on public.lessons for select using (true);
create policy "content public read" on public.exercises for select using (true);
create policy "content public read" on public.vocab for select using (true);

create policy "own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own stats" on public.user_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress" on public.user_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own srs" on public.srs_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own events" on public.events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- bootstrap profile + stats on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  insert into public.user_stats (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
