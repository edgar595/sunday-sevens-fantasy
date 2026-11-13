-- Sunday Sevens Fantasy: database setup.
-- Run this once in Supabase: SQL Editor > New query > paste > Run.

create extension if not exists pgcrypto;

-- League data (everyone can read, only admins can change)
create table if not exists public.sides (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  short      text not null,
  color      text not null default '#3BA7E0',
  gk         text not null default '#F2C230',
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  team       text not null references public.sides(id) on delete restrict,
  pos        text not null check (pos in ('DEF','MID','FWD')),
  price      numeric(4,1) not null check (price between 3 and 15),
  created_at timestamptz not null default now()
);

create table if not exists public.sundays (
  id         text primary key default gen_random_uuid()::text,
  gw         int  not null check (gw > 0),
  date       date not null,
  ko         text not null default '09:00',
  games      int  not null default 4,
  home       text not null references public.sides(id) on delete restrict,
  away       text not null references public.sides(id) on delete restrict,
  result     jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id         text primary key default gen_random_uuid()::text,
  title      text not null,
  body       text not null,
  side       text references public.sides(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Who can use the admin site. Add people by user id (see README).
create table if not exists public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

-- Each player's own data
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  manager    text not null default '',
  team_name  text not null default '',
  fav_side   text references public.sides(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.picks (
  user_id    uuid not null references auth.users(id) on delete cascade,
  gw         int  not null,
  formation  text not null,
  squad      text[] not null default '{}',
  captain    text,
  updated_at timestamptz not null default now(),
  primary key (user_id, gw)
);

-- Helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- When a gameweek locks: the first game of that Sunday, in the league's time zone.
-- Change 'Africa/Nairobi' if your league plays somewhere else.
create or replace function public.gw_deadline(p_gw int) returns timestamptz
language sql stable set search_path = public as $$
  select min((s.date + s.ko::time) at time zone 'Africa/Nairobi') from public.sundays s where s.gw = p_gw;
$$;

-- Row level security
alter table public.sides    enable row level security;
alter table public.players  enable row level security;
alter table public.sundays  enable row level security;
alter table public.news     enable row level security;
alter table public.admins   enable row level security;
alter table public.profiles enable row level security;
alter table public.picks    enable row level security;

do $$
declare t text;
begin
  foreach t in array array['sides','players','sundays','news'] loop
    execute format('drop policy if exists "anyone reads" on public.%I', t);
    execute format('create policy "anyone reads" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admins insert" on public.%I', t);
    execute format('create policy "admins insert" on public.%I for insert to authenticated with check (public.is_admin())', t);
    execute format('drop policy if exists "admins update" on public.%I', t);
    execute format('create policy "admins update" on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('drop policy if exists "admins delete" on public.%I', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists "signed-in people read profiles" on public.profiles;
create policy "signed-in people read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "write own profile" on public.profiles;
create policy "write own profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Picks: you see and change only your own, and only before that gameweek locks.
drop policy if exists "read own picks" on public.picks;
create policy "read own picks" on public.picks for select to authenticated using (user_id = auth.uid());
drop policy if exists "insert own picks before deadline" on public.picks;
create policy "insert own picks before deadline" on public.picks for insert to authenticated
  with check (user_id = auth.uid() and public.gw_deadline(gw) > now());
drop policy if exists "update own picks before deadline" on public.picks;
create policy "update own picks before deadline" on public.picks for update to authenticated
  using (user_id = auth.uid() and public.gw_deadline(gw) > now())
  with check (user_id = auth.uid() and public.gw_deadline(gw) > now());

-- Table access for the website's keys (the policies above still apply)
grant select on public.sides, public.players, public.sundays, public.news to anon, authenticated;
grant insert, update, delete on public.sides, public.players, public.sundays, public.news to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update on public.profiles, public.picks to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.gw_deadline(int) to anon, authenticated;

-- Live updates, so new results and news appear without a reload
do $$
declare t text;
begin
  foreach t in array array['sides','players','sundays','news'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
