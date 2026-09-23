-- STKD profiles table, one row per auth user.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  handle       text not null unique check (handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '',
  bio          text not null default '' check (char_length(bio) <= 160),
  avatar_color text not null default '#6C63FF',
  avatar_emoji text not null default '',
  banner_css   text not null default 'linear-gradient(135deg,#1a1040,#6C63FF)',
  top6         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any logged-in user can read every profile.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only create their own profile row.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Users can only update their own profile row, and can't reassign it to someone else.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
