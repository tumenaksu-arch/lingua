-- Love-Vox madde 6 — Claude ile konuşma pratiği: kullanım sayacı ve günlük sınır.
-- The lovevox_ai service (server/ai) is the ONLY writer; it authenticates to PostgREST with the
-- service_role key and calls ai_usage_take() before every Claude request. Users may read their own
-- row (remaining messages today). No conversation text is stored anywhere.

begin;

create table public.ai_usage (
  user_id       uuid not null references auth.users (id) on delete cascade,
  day           date not null,              -- Europe/Istanbul calendar day
  messages      integer not null default 0 check (messages >= 0),
  input_tokens  bigint  not null default 0 check (input_tokens >= 0),
  output_tokens bigint  not null default 0 check (output_tokens >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
create policy own_select on public.ai_usage for select to authenticated using (user_id = auth.uid());
revoke all on public.ai_usage from anon, authenticated;
grant select on public.ai_usage to authenticated;

-- Atomically reserve one message for p_user today. Returns the number of messages used AFTER the
-- reservation, or -1 when the per-user limit or the global daily cap is reached (nothing reserved).
create function public.ai_usage_take(p_user uuid, p_limit integer, p_global_cap integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Europe/Istanbul')::date;
  v_used integer;
begin
  if p_global_cap > 0 and coalesce((select sum(messages) from public.ai_usage where day = v_day), 0) >= p_global_cap then
    return -1;
  end if;
  insert into public.ai_usage (user_id, day, messages) values (p_user, v_day, 1)
    on conflict (user_id, day) do update set messages = public.ai_usage.messages + 1
    where public.ai_usage.messages < p_limit
  returning messages into v_used;
  return coalesce(v_used, -1);
end $$;

-- Record token usage after a Claude response (or give the message back when the call failed).
create function public.ai_usage_record(p_user uuid, p_input bigint, p_output bigint, p_refund boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'Europe/Istanbul')::date;
begin
  update public.ai_usage
     set input_tokens = input_tokens + greatest(p_input, 0),
         output_tokens = output_tokens + greatest(p_output, 0),
         messages = case when p_refund then greatest(messages - 1, 0) else messages end
   where user_id = p_user and day = v_day;
end $$;

revoke all on function public.ai_usage_take(uuid, integer, integer), public.ai_usage_record(uuid, bigint, bigint, boolean)
  from public, anon, authenticated;
grant execute on function public.ai_usage_take(uuid, integer, integer), public.ai_usage_record(uuid, bigint, bigint, boolean)
  to service_role;

commit;
