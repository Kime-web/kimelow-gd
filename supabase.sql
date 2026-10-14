-- Paste into your own Supabase SQL editor. Auth is supplied by Supabase Auth.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 32),
 theme text not null default 'green' check (theme in ('green','purple','blue','red','orange','pink'))
);
create table if not exists public.player_data (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{"levels":[],"created":[],"goal":{"text":"","target":3,"unit":"levels"}}'::jsonb,
 updated_at timestamptz not null default now()
);
create index if not exists player_data_updated_at_idx on public.player_data(updated_at);
alter table public.profiles enable row level security;
alter table public.player_data enable row level security;
-- Profiles are public, but profile editing is owner-only.
drop policy if exists "Public read profile" on public.profiles;
create policy "Public read profile" on public.profiles for select using (true);
drop policy if exists "Owner insert profile" on public.profiles;
create policy "Owner insert profile" on public.profiles for insert to authenticated with check ((select auth.uid())=id);
drop policy if exists "Owner update profile" on public.profiles;
create policy "Owner update profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
-- Game data is private per user, no cross-account read/write.
drop policy if exists "Owner read data" on public.player_data;
create policy "Owner read data" on public.player_data for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Owner insert data" on public.player_data;
create policy "Owner insert data" on public.player_data for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists "Owner update data" on public.player_data;
create policy "Owner update data" on public.player_data for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
