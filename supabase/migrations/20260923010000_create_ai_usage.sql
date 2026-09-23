-- STKD AI assistant daily usage, one row per user per UTC day.
-- Users can read their own usage but cannot write it directly; the only way to
-- change it is consume_ai_request(), which increments atomically up to the limit.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null default ((now() at time zone 'utc')::date),
  count   integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Logged-in users can see only their own usage. No insert/update/delete policies:
-- clients can't reset or edit their counts.
drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own"
  on public.ai_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Records one AI request for the calling user. Returns the new count for today,
-- or NULL if the user has already used 30 requests today (nothing is recorded).
create or replace function public.consume_ai_request()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  new_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  insert into public.ai_usage as u (user_id, day, count)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < 30
  returning u.count into new_count;

  return new_count;
end;
$$;

revoke execute on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;
