-- Love-Vox Duolingo dalga 1: "Hatalarım / Zayıf kelimeler" pratiği XP'si (event 'practice_completed', payload.xp)
-- sınıf ilerlemesinde ve sınıf liginde de sayılsın. xp_event_types() 0002'de tanımlı; yalnız listeyi genişletir.
begin;
create or replace function public.xp_event_types() returns text[] language sql immutable as $$
  select array['lesson_completed', 'story_completed', 'quest_claimed', 'unit_skipped', 'conversation_completed', 'practice_completed']
$$;
commit;
