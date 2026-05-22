-- Run this in Supabase Dashboard → SQL Editor

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_color text not null default '#6366f1',
  games_played integer not null default 0,
  wins integer not null default 0,
  rounds_won integer not null default 0,
  favorite_deck_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read any profile"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Profile decks (owned IAP decks)
create table if not exists profile_decks (
  profile_id uuid references profiles on delete cascade,
  deck_id text not null,
  purchased_at timestamptz not null default now(),
  primary key (profile_id, deck_id)
);

alter table profile_decks enable row level security;

create policy "Users can read own decks"
  on profile_decks for select using (auth.uid() = profile_id);

create policy "Users can insert own decks"
  on profile_decks for insert with check (auth.uid() = profile_id);

-- Rooms table (full Room stored as JSONB)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  state text not null default 'lobby',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;

create policy "Anyone can read rooms"
  on rooms for select using (true);

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "Anyone can update rooms"
  on rooms for update using (true);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger rooms_updated_at
  before update on rooms
  for each row execute function update_updated_at();
