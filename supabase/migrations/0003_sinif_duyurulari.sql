-- Love-Vox madde 5 — tek yönlü sınıf duyurusu (öğretmen → sınıf). Yanıt/mesajlaşma YOK (bilinçli:
-- öğrencilerin çoğu reşit değil; birebir yazışma KVKK/çocuk güvenliği riski). Kullanıcı kararı 2026-10-26.

begin;

create table public.class_announcements (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  metin      text not null check (char_length(btrim(metin)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index class_announcements_class on public.class_announcements (class_id, created_at desc);

alter table public.class_announcements enable row level security;

create policy ann_select on public.class_announcements for select to authenticated
  using (public.owns_class(class_id) or public.member_of(class_id));
create policy ann_insert on public.class_announcements for insert to authenticated
  with check (public.owns_class(class_id));
create policy ann_delete on public.class_announcements for delete to authenticated
  using (public.owns_class(class_id));

-- no update (a correction = delete + new); anon role gets nothing
revoke all on public.class_announcements from anon;
grant select, insert, delete on public.class_announcements to authenticated;

commit;
