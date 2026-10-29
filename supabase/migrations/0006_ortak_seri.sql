-- Love-Vox madde 3B — arkadaşla ortak seri (Duolingo Friend Streaks).
-- İki arkadaş AYNI gün ikisi de en az 1 etkinlik yaptıysa ortak seri +1; bir gün
-- boşluk olursa seri sıfırlanır. E-posta hiçbir yerde tutulmaz veya döndürülmez.

begin;

-- Hangi kullanıcı hangi gün etkinlik yaptı. Yalnızca bugün veya dün yazılabilir
-- (saat dilimi farkı için ±1 gün toleranslı check). Satır immutable: update/delete
-- politikası bilerek yok.
create table public.activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);

-- Yalnız bugün/dün (±1 gün saat dilimi toleransı) yazılabilir. CHECK yerine tetikleyici:
-- current_date'li CHECK, eski satırlar yedekten geri yüklenirken (pg_restore) patlardı.
create function public.activity_days_guard() returns trigger language plpgsql as $$
begin
  if new.day not between current_date - 1 and current_date + 1 then
    raise exception 'activity_days: yalnız bugün veya dün yazılabilir' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger activity_days_guard before insert on public.activity_days
  for each row execute function public.activity_days_guard();

alter table public.activity_days enable row level security;

-- yalnız sahibi kendi gününü işaretler (PK ile günde birden fazla yazım güvenli)
create policy own_insert on public.activity_days for insert to authenticated
  with check (user_id = auth.uid());

-- select: sahibi…
create policy own_select on public.activity_days for select to authenticated
  using (user_id = auth.uid());

-- Arkadaşların günleri doğrudan OKUNMAZ: friends RLS'i karşı tarafın listesini gizlediği için
-- karşılıklılık bir politika içinde denetlenemez; ortak seri yalnız security definer
-- friend_streaks() üzerinden (yalnız karşılıklı arkadaşlar için) görülür.

-- anonim sınıf hesapları ortak seri dışında (0002'deki restrictive kalıbı)
create policy no_anon_insert on public.activity_days as restrictive for insert to authenticated
  with check (not public.is_anon());
create policy no_anon_read on public.activity_days as restrictive for select to authenticated
  using (not public.is_anon());

-- Çağıranın karşılıklı arkadaşları için ortak seri: son 400 günde iki tarafın da
-- etkinlik yaptığı ardışık gün sayısı. Bugün henüz bitmediği için ikisi de bugün
-- yapmadıysa sayım dünden geriye başlar. E-posta döndürülmez.
create function public.friend_streaks()
returns table (friend_id uuid, streak int, me_today boolean, friend_today boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null or public.is_anon() then
    return;
  end if;
  return query
  with mutual as (
    select f.friend_id
    from public.friends f
    where f.user_id = me
      and exists (
        select 1 from public.friends g
        where g.user_id = f.friend_id and g.friend_id = me
      )
  ),
  anchor as (
    -- İki taraf da bugün etkinlik yaptıysa sayım bugünden; değilse dünden.
    select m.friend_id,
      case
        when exists (
          select 1 from public.activity_days a
          where a.user_id = me and a.day = current_date
            and exists (
              select 1 from public.activity_days b
              where b.user_id = m.friend_id and b.day = current_date
            )
        )
        then current_date
        else current_date - 1
      end as start_day
    from mutual m
  )
  select
    a.friend_id,
    -- ARDIŞIK ortak gün: start_day'den geriye ilk boşluğa kadar (boşluk yoksa 400).
    coalesce((
      select min(k)::int
      from generate_series(0, 400) as k
      where not exists (
        select 1 from public.activity_days x
        where x.user_id = me and x.day = a.start_day - k::int
          and exists (
            select 1 from public.activity_days y
            where y.user_id = a.friend_id and y.day = a.start_day - k::int
          )
      )
    ), 400) as streak,
    exists (
      select 1 from public.activity_days d
      where d.user_id = me and d.day = current_date
    ) as me_today,
    exists (
      select 1 from public.activity_days d
      where d.user_id = a.friend_id and d.day = current_date
    ) as friend_today
  from anchor a;
end $$;

revoke all on function public.friend_streaks() from public, anon;
grant execute on function public.friend_streaks() to authenticated;

-- grants (RLS korur); anon hiçbir şey almaz
revoke all on public.activity_days from anon;
grant select, insert on public.activity_days to authenticated;

commit;
