-- STKD social features: ratings, friendships, hot takes and take votes.
-- All user-owned tables reference public.profiles so the app can embed handle/avatar data.

-- ---------------------------------------------------------------------------
-- Friendships (invite-only). One row per pair, whichever direction it was sent.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null default auth.uid()
             constraint friendships_requester_fkey references public.profiles (id) on delete cascade,
  addressee  uuid not null
             constraint friendships_addressee_fkey references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);

create unique index if not exists friendships_pair_key
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

alter table public.friendships enable row level security;

-- Only the two people involved can see a friendship.
drop policy if exists "friendships_select_involved" on public.friendships;
create policy "friendships_select_involved"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester, addressee));

-- You can only send requests as yourself, and they always start pending.
drop policy if exists "friendships_insert_as_requester" on public.friendships;
create policy "friendships_insert_as_requester"
  on public.friendships for insert to authenticated
  with check ((select auth.uid()) = requester and status = 'pending');

-- Only the addressee can accept a pending request. Column grant below limits updates to `status`.
drop policy if exists "friendships_accept_as_addressee" on public.friendships;
create policy "friendships_accept_as_addressee"
  on public.friendships for update to authenticated
  using ((select auth.uid()) = addressee and status = 'pending')
  with check ((select auth.uid()) = addressee and status = 'accepted');

-- Either person can delete: decline, cancel a sent request, or unfriend.
drop policy if exists "friendships_delete_involved" on public.friendships;
create policy "friendships_delete_involved"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester, addressee));

revoke update on public.friendships from authenticated, anon;
grant update (status) on public.friendships to authenticated;

-- True when the current user and `other` are accepted friends.
create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = auth.uid() and f.addressee = other)
        or (f.addressee = auth.uid() and f.requester = other))
  );
$$;
revoke execute on function public.is_friend(uuid) from public, anon;
grant execute on function public.is_friend(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ratings: one per user per media item.
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid()
             constraint ratings_user_id_fkey references public.profiles (id) on delete cascade,
  media_id   text not null check (char_length(media_id) between 1 and 200),
  title      text not null check (char_length(title) between 1 and 300),
  type       text not null check (type in ('film', 'series', 'game', 'book', 'manga', 'music', 'podcast')),
  year       text check (char_length(year) <= 10),
  cover      text check (char_length(cover) <= 1000),
  credit     text check (char_length(credit) <= 300),
  rating     numeric(3, 1) not null check (rating between 0 and 10),
  comment    text check (char_length(comment) <= 1000),
  status     text check (status in ('Completed', 'In Progress', 'Plan to', 'Dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_id)
);

create index if not exists ratings_user_updated_idx on public.ratings (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ratings_set_updated_at on public.ratings;
create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

alter table public.ratings enable row level security;

-- Readable by the owner and by their accepted friends.
drop policy if exists "ratings_select_own_or_friends" on public.ratings;
create policy "ratings_select_own_or_friends"
  on public.ratings for select to authenticated
  using ((select auth.uid()) = user_id or public.is_friend(user_id));

drop policy if exists "ratings_insert_own" on public.ratings;
create policy "ratings_insert_own"
  on public.ratings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "ratings_update_own" on public.ratings;
create policy "ratings_update_own"
  on public.ratings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "ratings_delete_own" on public.ratings;
create policy "ratings_delete_own"
  on public.ratings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Hot takes and votes.
-- ---------------------------------------------------------------------------
create table if not exists public.takes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid()
              constraint takes_user_id_fkey references public.profiles (id) on delete cascade,
  text        text not null check (char_length(btrim(text)) between 1 and 280),
  media_title text check (char_length(media_title) <= 100),
  created_at  timestamptz not null default now()
);

create index if not exists takes_created_idx on public.takes (created_at desc);

alter table public.takes enable row level security;

drop policy if exists "takes_select_authenticated" on public.takes;
create policy "takes_select_authenticated"
  on public.takes for select to authenticated
  using (true);

drop policy if exists "takes_insert_own" on public.takes;
create policy "takes_insert_own"
  on public.takes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "takes_delete_own" on public.takes;
create policy "takes_delete_own"
  on public.takes for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.take_votes (
  take_id    bigint not null references public.takes (id) on delete cascade,
  user_id    uuid not null default auth.uid()
             constraint take_votes_user_id_fkey references public.profiles (id) on delete cascade,
  vote       text not null check (vote in ('agree', 'disagree')),
  created_at timestamptz not null default now(),
  primary key (take_id, user_id)
);

create index if not exists take_votes_user_idx on public.take_votes (user_id);

alter table public.take_votes enable row level security;

drop policy if exists "take_votes_select_authenticated" on public.take_votes;
create policy "take_votes_select_authenticated"
  on public.take_votes for select to authenticated
  using (true);

drop policy if exists "take_votes_insert_own" on public.take_votes;
create policy "take_votes_insert_own"
  on public.take_votes for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "take_votes_update_own" on public.take_votes;
create policy "take_votes_update_own"
  on public.take_votes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "take_votes_delete_own" on public.take_votes;
create policy "take_votes_delete_own"
  on public.take_votes for delete to authenticated
  using ((select auth.uid()) = user_id);
