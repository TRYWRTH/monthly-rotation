-- Monthly Rotation: schema + row-level security
-- Run this once in your Supabase project's SQL editor (Supabase Dashboard -> SQL Editor).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'You',
  pair_id uuid references public.pairs (id) on delete set null,
  avg_cycle_length int not null default 28 check (avg_cycle_length between 15 and 60),
  avg_period_length int not null default 5 check (avg_period_length between 1 and 14),
  created_at timestamptz not null default now()
);

create table if not exists public.cycle_starts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, start_date)
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  mood text,
  energy int check (energy between 1 and 5),
  symptoms text[] not null default '{}',
  flow text check (flow in ('none', 'spotting', 'light', 'medium', 'heavy')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- Reference content (phase guides, alignment rules, severity flags). Not
-- user data — a single row your app reads at request time, editable
-- straight from the Supabase table editor without a redeploy.
create table if not exists public.cycle_knowledge (
  id text primary key,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Returns the caller's pair_id without re-triggering RLS on profiles
-- (avoids infinite recursion in the profiles policies below).
create or replace function public.my_pair_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select pair_id from public.profiles where id = auth.uid();
$$;

-- True if the given user is the caller, or is paired with the caller.
create or replace function public.is_self_or_partner(target_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select target_user = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = target_user
        and p.pair_id is not null
        and p.pair_id = public.my_pair_id()
    );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_logs_set_updated_at on public.daily_logs;
create trigger daily_logs_set_updated_at
  before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', 'You'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.pairs enable row level security;
alter table public.profiles enable row level security;
alter table public.cycle_starts enable row level security;
alter table public.daily_logs enable row level security;

-- pairs: any authenticated user can create a pair, or look one up by invite
-- code in order to join it. The invite code itself is the shared secret.
drop policy if exists "pairs_select" on public.pairs;
create policy "pairs_select" on public.pairs
  for select to authenticated
  using (true);

drop policy if exists "pairs_insert" on public.pairs;
create policy "pairs_insert" on public.pairs
  for insert to authenticated
  with check (true);

-- profiles: everyone can see their own profile and their partner's profile;
-- only the owner can modify their own row.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (public.is_self_or_partner(id));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- cycle_starts: owner + partner can read, only owner can write.
drop policy if exists "cycle_starts_select" on public.cycle_starts;
create policy "cycle_starts_select" on public.cycle_starts
  for select to authenticated
  using (public.is_self_or_partner(user_id));

drop policy if exists "cycle_starts_insert" on public.cycle_starts;
create policy "cycle_starts_insert" on public.cycle_starts
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cycle_starts_delete" on public.cycle_starts;
create policy "cycle_starts_delete" on public.cycle_starts
  for delete to authenticated
  using (user_id = auth.uid());

-- daily_logs: full rows (mood, energy, symptoms, notes) are private to the
-- owner only. Partners see a limited summary through the view below instead.
drop policy if exists "daily_logs_select" on public.daily_logs;
create policy "daily_logs_select" on public.daily_logs
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "daily_logs_insert" on public.daily_logs;
create policy "daily_logs_insert" on public.daily_logs
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "daily_logs_update" on public.daily_logs;
create policy "daily_logs_update" on public.daily_logs
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "daily_logs_delete" on public.daily_logs;
create policy "daily_logs_delete" on public.daily_logs
  for delete to authenticated
  using (user_id = auth.uid());

-- Partner-visible summary: mood, energy, flow and phase-relevant timing
-- only — never symptoms or free-text notes. Runs with the view owner's
-- privileges (Postgres default) and enforces its own access check via
-- is_self_or_partner() in the WHERE clause, the same pattern used by the
-- is_self_or_partner()/my_pair_id() security-definer functions above.
create or replace view public.partner_log_summary as
select id, user_id, log_date, mood, energy, flow, created_at
from public.daily_logs
where public.is_self_or_partner(user_id);

grant select on public.partner_log_summary to authenticated;

-- cycle_knowledge: readable by any authenticated user; not writable from
-- the client (edit rows directly in the Supabase dashboard/SQL editor).
alter table public.cycle_knowledge enable row level security;

drop policy if exists "cycle_knowledge_select" on public.cycle_knowledge;
create policy "cycle_knowledge_select" on public.cycle_knowledge
  for select to authenticated
  using (true);
