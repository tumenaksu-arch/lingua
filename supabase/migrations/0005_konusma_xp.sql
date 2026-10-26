-- Love-Vox madde 6: konuşma pratiği XP'si (event 'conversation_completed', payload.xp) sınıf ilerlemesinde
-- ve sınıf liginde de sayılsın. xp_event_types() 0002'de tanımlı; yalnız listeyi genişletir.
begin;
create or replace function public.xp_event_types() returns text[] language sql immutable as $$
  select array['lesson_completed', 'story_completed', 'quest_claimed', 'unit_skipped', 'conversation_completed']
$$;
commit;
