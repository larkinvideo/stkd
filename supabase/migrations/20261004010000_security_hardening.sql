-- STKD security hardening (Oct 2026).
-- Constraints are NOT VALID: they apply to every new insert/update, without failing on old rows.

-- 1) Profile fields: strict formats so nothing like url(...) can be smuggled into styles.
alter table public.profiles drop constraint if exists profiles_avatar_color_hex;
alter table public.profiles add constraint profiles_avatar_color_hex
  check (avatar_color ~ '^#[0-9A-Fa-f]{3,8}$') not valid;

alter table public.profiles drop constraint if exists profiles_banner_css_gradient;
alter table public.profiles add constraint profiles_banner_css_gradient
  check (banner_css ~ '^linear-gradient\(135deg,#[0-9A-Fa-f]{3,8},#[0-9A-Fa-f]{3,8}\)$') not valid;

alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (char_length(display_name) <= 40) not valid;

alter table public.profiles drop constraint if exists profiles_avatar_emoji_len;
alter table public.profiles add constraint profiles_avatar_emoji_len
  check (char_length(avatar_emoji) <= 8) not valid;

alter table public.profiles drop constraint if exists profiles_top6_size;
alter table public.profiles add constraint profiles_top6_size
  check (jsonb_typeof(top6) = 'object' and pg_column_size(top6) <= 8192) not valid;

-- 2) AI: keep the 30/user/day limit, and add a global daily cap across all users so
--    mass sign-ups can't run up the Anthropic bill. Change ai_global_daily_cap() to adjust.
create or replace function public.ai_global_daily_cap()
returns integer language sql immutable set search_path = '' as $$ select 1000 $$;

create index if not exists ai_usage_day_idx on public.ai_usage (day);

create or replace function public.consume_ai_request()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'utc')::date;
  new_count integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Serialize the global check so concurrent requests can't overshoot the cap.
  perform pg_advisory_xact_lock(hashtext('stkd_ai_global'));
  if (select coalesce(sum(count), 0) from public.ai_usage where day = today) >= public.ai_global_daily_cap() then
    return null;
  end if;

  insert into public.ai_usage as u (user_id, day, count)
  values (uid, today, 1)
  on conflict (user_id, day) do update
    set count = u.count + 1
    where u.count < 30
  returning u.count into new_count;

  return new_count;
end;
$$;

revoke execute on function public.consume_ai_request() from public, anon;
grant execute on function public.consume_ai_request() to authenticated;

-- 3) Friend request spam: max 30 pending outgoing requests, max 50 sent per day.
create or replace function public.limit_friend_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.friendships
      where requester = new.requester and status = 'pending') >= 30 then
    raise exception 'STKD_TOO_MANY_PENDING' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.friendships
      where requester = new.requester and created_at > now() - interval '1 day') >= 50 then
    raise exception 'STKD_TOO_MANY_REQUESTS' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists friendships_rate_limit on public.friendships;
create trigger friendships_rate_limit
  before insert on public.friendships
  for each row execute function public.limit_friend_requests();

-- 4) Lock down helper functions from anonymous callers.
revoke execute on function public.has_profanity(text) from anon;
revoke execute on function public.limit_friend_requests() from public, anon, authenticated;
revoke execute on function public.enforce_family_friendly() from public, anon, authenticated;
