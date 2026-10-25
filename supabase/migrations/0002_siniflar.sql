-- Love-Vox madde 5 — öğretmen / sınıf (docs/tasarim/madde5-ogretmen-sinif.md).
-- Students join anonymously (GoTrue anonymous sign-in) with a class code + class nickname.
-- No real names, e-mails or school numbers are stored. Teachers read only their own classes'
-- membership rows (user_id, takma_ad, joined_at) and learning SUMMARIES through the security-definer
-- functions below (class course only); they never read members' answers, cards or other courses.
-- Code guessing: join_class allows 10 failures/user/hour; anonymous sign-ups are limited per real
-- client IP by GoTrue (GOTRUE_RATE_LIMIT_ANONYMOUS_USERS + X-Lovevox-Client-IP), 32^6 code space.

begin;

-- true when the caller signed in anonymously (JWT claim is_anonymous)
create function public.is_anon() returns boolean language sql stable as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- anonymous students stay out of the global league, profiles and friends (class league only)
create policy no_anon_insert on public.leaderboard as restrictive for insert to authenticated with check (not public.is_anon());
create policy no_anon_update on public.leaderboard as restrictive for update to authenticated using (not public.is_anon());
create policy no_anon_insert on public.profiles    as restrictive for insert to authenticated with check (not public.is_anon());
create policy no_anon_update on public.profiles    as restrictive for update to authenticated using (not public.is_anon());
create policy no_anon_insert on public.friends     as restrictive for insert to authenticated with check (not public.is_anon());
create policy no_anon_read   on public.leaderboard as restrictive for select to authenticated using (not public.is_anon());

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------
create table public.teachers (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  kvkk_onay_at timestamptz not null default now()
);

create table public.classes (
  id                   uuid primary key default gen_random_uuid(),
  teacher_id           uuid not null references public.teachers (user_id) on delete cascade,
  ad                   text not null check (char_length(btrim(ad)) between 2 and 40),
  course_id            text not null check (course_id in ('tr-en', 'tr-de', 'tr-es', 'tr-fr', 'tr-it')),
  join_code            text not null unique check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  veli_bilgilendirildi boolean not null check (veli_bilgilendirildi),
  created_at           timestamptz not null default now(),
  archived_at          timestamptz
);
create index classes_teacher on public.classes (teacher_id);

create table public.class_members (
  class_id  uuid not null references public.classes (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  takma_ad  text not null check (char_length(takma_ad) between 3 and 20
                                 and takma_ad ~ '^[A-Za-z0-9ÇĞİÖŞÜçğıöşü_. -]+$'),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id),
  unique (class_id, takma_ad)
);
create index class_members_user on public.class_members (user_id);

create table public.assignments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  unit_id    text not null check (unit_id ~ '^tr-(en|de|es|fr|it)\.u\d{1,3}$'),
  son_tarih  date not null,
  created_at timestamptz not null default now(),
  unique (class_id, unit_id)
);

-- failed join attempts (code guessing throttle); rows older than 1 day are pruned on use
create table public.join_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null default now()
);
create index join_attempts_user on public.join_attempts (user_id, at);

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------
create function public.owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes c where c.id = p_class and c.teacher_id = auth.uid())
$$;

create function public.member_of(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members m where m.class_id = p_class and m.user_id = auth.uid())
$$;

-- archiving a class removes its memberships (KVKK: no lingering student data)
create function public.archive_cleanup() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    delete from public.class_members where class_id = new.id;
  end if;
  return new;
end $$;
create trigger classes_archive_cleanup after update of archived_at on public.classes
  for each row execute function public.archive_cleanup();

-- teacher_id / course_id / veli_bilgilendirildi / created_at are immutable after creation
create function public.classes_immutable() returns trigger language plpgsql as $$
begin
  new.teacher_id := old.teacher_id;
  new.course_id := old.course_id;
  new.veli_bilgilendirildi := old.veli_bilgilendirildi;
  new.created_at := old.created_at;
  if old.archived_at is not null then new.archived_at := old.archived_at; end if; -- no un-archive
  return new;
end $$;
create trigger classes_keep_immutable before update on public.classes
  for each row execute function public.classes_immutable();

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.teachers      enable row level security;
alter table public.classes       enable row level security;
alter table public.class_members enable row level security;
alter table public.assignments   enable row level security;
alter table public.join_attempts enable row level security;

-- teachers: e-mail accounts only (never anonymous)
create policy own_select on public.teachers for select to authenticated using (user_id = auth.uid());
create policy own_insert on public.teachers for insert to authenticated
  with check (user_id = auth.uid() and not public.is_anon());

-- classes: only the owning teacher reads/writes; members get name/course via my_classes()
create policy own_select on public.classes for select to authenticated using (teacher_id = auth.uid());
create policy own_insert on public.classes for insert to authenticated
  with check (teacher_id = auth.uid() and not public.is_anon() and archived_at is null);
create policy own_update on public.classes for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- members: a student sees/deletes own membership; the teacher sees/removes members of own classes.
-- No insert policy: joining only through join_class().
create policy member_select on public.class_members for select to authenticated
  using (user_id = auth.uid() or public.owns_class(class_id));
create policy member_delete on public.class_members for delete to authenticated
  using (user_id = auth.uid() or public.owns_class(class_id));

-- assignments: teacher manages, members read
create policy asg_select on public.assignments for select to authenticated
  using (public.owns_class(class_id) or public.member_of(class_id));
create policy asg_insert on public.assignments for insert to authenticated with check (public.owns_class(class_id));
create policy asg_update on public.assignments for update to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));
create policy asg_delete on public.assignments for delete to authenticated using (public.owns_class(class_id));

-- join_attempts: no client access at all (written only by join_class)

-- ---------------------------------------------------------------
-- Functions (RPC)
-- ---------------------------------------------------------------
-- Join (or rename inside) a class by code. Unknown/archived code → zero rows (client: 'Bilinmeyen sınıf kodu').
-- Max 10 failed attempts per user per hour, then 'too_many_attempts'.
create function public.join_class(p_code text, p_takma_ad text)
returns table (class_id uuid, ad text, course_id text)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_class public.classes%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  delete from public.join_attempts where at < now() - interval '1 day';
  if (select count(*) from public.join_attempts j where j.user_id = v_uid and j.at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  select * into v_class from public.classes c where c.join_code = upper(btrim(p_code)) and c.archived_at is null;
  if not found then
    -- record the failed attempt and return NO rows (raising would roll the attempt back)
    insert into public.join_attempts (user_id) values (v_uid);
    return;
  end if;
  if v_class.teacher_id = v_uid then raise exception 'own_class' using errcode = 'P0001'; end if;
  insert into public.class_members (class_id, user_id, takma_ad)
    values (v_class.id, v_uid, btrim(p_takma_ad))
    on conflict on constraint class_members_pkey do update set takma_ad = excluded.takma_ad;
  return query select v_class.id, v_class.ad, v_class.course_id;
end $$;

-- The caller's classes as a student
create function public.my_classes()
returns table (class_id uuid, ad text, course_id text, takma_ad text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, c.ad, c.course_id, m.takma_ad, m.joined_at
  from public.class_members m join public.classes c on c.id = m.class_id
  where m.user_id = auth.uid() and c.archived_at is null
$$;

-- XP-bearing event types (payload.xp)
create function public.xp_event_types() returns text[] language sql immutable as $$
  select array['lesson_completed', 'story_completed', 'quest_claimed', 'unit_skipped']
$$;

-- Teacher summary per member. p_week_start = start of the current week (client's local Monday 00:00).
create function public.class_progress(p_class uuid, p_week_start timestamptz)
returns table (user_id uuid, takma_ad text, joined_at timestamptz, weekly_xp bigint, total_xp integer,
               streak integer, last_active_date date, completed_lessons text[])
language plpgsql stable security definer set search_path = public as $$
declare v_course text;
begin
  if not public.owns_class(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  select c.course_id into v_course from public.classes c where c.id = p_class;
  return query
  select m.user_id, m.takma_ad, m.joined_at,
         coalesce((select sum((e.payload ->> 'xp')::int) from public.events e
                   where e.user_id = m.user_id and e.type = any (public.xp_event_types())
                     and e.created_at >= p_week_start), 0)::bigint,
         coalesce(s.xp, 0), coalesce(s.streak, 0), s.last_active_date,
         coalesce((select array_agg(p.lesson_id order by p.lesson_id) from public.user_progress p
                   where p.user_id = m.user_id and p.completed_at is not null
                     and p.lesson_id like v_course || '.%'), '{}')
  from public.class_members m left join public.user_stats s on s.user_id = m.user_id
  where m.class_id = p_class;
end $$;

-- Where the class struggles: per lesson attempts/accuracy and merged mistakes_by_type since p_since.
create function public.class_struggles(p_class uuid, p_since timestamptz)
returns table (lesson_id text, attempts bigint, correct bigint, total bigint, mistakes_by_type jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_course text;
begin
  if not public.owns_class(p_class) then raise exception 'not_teacher' using errcode = '42501'; end if;
  select c.course_id into v_course from public.classes c where c.id = p_class;
  return query
  with ev as (
    select x.lid, x.payload from (
      select coalesce(e.payload ->> 'lessonId', split_part(e.id, ':', 1)) as lid, e.payload
      from public.events e join public.class_members m on m.user_id = e.user_id and m.class_id = p_class
      where e.type = 'lesson_completed' and e.created_at >= p_since
    ) x
    -- only the class course: a member's private study of other languages stays private
    where x.lid like v_course || '.%'
  ),
  agg as (
    select lid, count(*) as attempts,
           sum(coalesce((payload ->> 'correct')::int, 0)) as correct,
           sum(coalesce((payload ->> 'total')::int, 0)) as total
    from ev group by lid
  ),
  mt as (
    select lid, jsonb_object_agg(k, n) as m from (
      select lid, kv.key as k, sum(kv.value::int) as n
      from ev, jsonb_each_text(coalesce(ev.payload -> 'mistakes_by_type', '{}'::jsonb)) kv
      group by lid, kv.key) x
    group by lid
  )
  select agg.lid, agg.attempts, agg.correct, agg.total, coalesce(mt.m, '{}'::jsonb)
  from agg left join mt on mt.lid = agg.lid;
end $$;

-- Class league (members and the teacher): class nickname + weekly XP
create function public.class_league(p_class uuid, p_week_start timestamptz)
returns table (takma_ad text, weekly_xp bigint, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.owns_class(p_class) or public.member_of(p_class)) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  return query
  select m.takma_ad,
         coalesce((select sum((e.payload ->> 'xp')::int) from public.events e
                   where e.user_id = m.user_id and e.type = any (public.xp_event_types())
                     and e.created_at >= p_week_start), 0)::bigint as wxp,
         m.user_id = auth.uid()
  from public.class_members m where m.class_id = p_class
  order by wxp desc, m.takma_ad;
end $$;

-- grants: functions only for signed-in users; tables per RLS above
revoke all on function public.join_class(text, text), public.my_classes(),
  public.class_progress(uuid, timestamptz), public.class_struggles(uuid, timestamptz),
  public.class_league(uuid, timestamptz), public.owns_class(uuid), public.member_of(uuid)
  from public, anon;
grant execute on function public.join_class(text, text), public.my_classes(),
  public.class_progress(uuid, timestamptz), public.class_struggles(uuid, timestamptz),
  public.class_league(uuid, timestamptz), public.owns_class(uuid), public.member_of(uuid)
  to authenticated;
revoke all on public.teachers, public.classes, public.class_members, public.assignments, public.join_attempts from anon;
revoke all on public.join_attempts from authenticated;
grant select, insert on public.teachers to authenticated;
grant select, insert, update on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;

commit;
