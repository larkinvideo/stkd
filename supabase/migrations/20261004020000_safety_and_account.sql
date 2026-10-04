-- STKD safety + account controls: block users, report takes (auto-hide at 3 reports),
-- and let users delete their own account (GDPR).

-- ---------------------------------------------------------------------------
-- Blocks: one row per (blocker, blocked). Only the blocker can see/manage them.
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker);
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker);
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker);

-- True if either user has blocked the other. Private helper (not callable from the API).
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocks
                 where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

-- Blocking someone also removes any friendship / pending request between you.
create or replace function public.on_block_remove_friendship()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships
  where least(requester, addressee) = least(new.blocker, new.blocked)
    and greatest(requester, addressee) = greatest(new.blocker, new.blocked);
  return new;
end;
$$;
revoke execute on function public.on_block_remove_friendship() from public, anon, authenticated;
drop trigger if exists blocks_remove_friendship on public.blocks;
create trigger blocks_remove_friendship after insert on public.blocks
  for each row execute function public.on_block_remove_friendship();

-- No friend requests between blocked users (either direction).
create or replace function public.no_requests_when_blocked()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_blocked_between(new.requester, new.addressee) then
    raise exception 'STKD_BLOCKED' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke execute on function public.no_requests_when_blocked() from public, anon, authenticated;
drop trigger if exists friendships_not_blocked on public.friendships;
create trigger friendships_not_blocked before insert on public.friendships
  for each row execute function public.no_requests_when_blocked();

-- ---------------------------------------------------------------------------
-- Reports on hot takes. Users can file reports but not read them (review them in
-- the Supabase Table Editor). A take with 3+ reports is hidden automatically.
-- ---------------------------------------------------------------------------
alter table public.takes add column if not exists hidden boolean not null default false;

create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  reporter   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  take_id    bigint not null references public.takes (id) on delete cascade,
  reason     text not null default 'other' check (reason in ('offensive', 'spam', 'harassment', 'other')),
  created_at timestamptz not null default now(),
  unique (reporter, take_id)
);
alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter);

create or replace function public.on_report_maybe_hide()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.reports where take_id = new.take_id) >= 3 then
    update public.takes set hidden = true where id = new.take_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.on_report_maybe_hide() from public, anon, authenticated;
drop trigger if exists reports_maybe_hide on public.reports;
create trigger reports_maybe_hide after insert on public.reports
  for each row execute function public.on_report_maybe_hide();

-- Takes feed: hide auto-hidden takes (except to their author) and takes from people you blocked.
drop policy if exists "takes_select_authenticated" on public.takes;
create policy "takes_select_authenticated" on public.takes for select to authenticated
  using (
    (not hidden or user_id = (select auth.uid()))
    and not exists (select 1 from public.blocks b
                    where b.blocker = (select auth.uid()) and b.blocked = takes.user_id)
  );

-- Users can't un-hide their own take by updating it (there is no update policy on takes).

-- ---------------------------------------------------------------------------
-- Delete my account: removes the auth user; everything else cascades
-- (profile, ratings, takes, votes, friendships, blocks, reports, AI usage).
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = uid;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
