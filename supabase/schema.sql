-- Medicine Tracker schema (single client, no login)
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- Security model: RLS is ENABLED on every table with NO policies, so the anon
-- key can read/write nothing. The Next.js server talks to the database with the
-- service role key, which bypasses RLS. Never expose that key to the browser.

create extension if not exists "pgcrypto";

-- Pets (or people) being tracked
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  kind text not null default 'cat',
  emoji text not null default '🐱',
  archived boolean not null default false
);

-- Library of medicines, reused across pets
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text not null default ''
);
create unique index if not exists medicines_name_unique on public.medicines (lower(name));

-- A medicine assigned to one pet, with its own dose and schedule
create table if not exists public.pet_medications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  medicine_id uuid not null references public.medicines(id) on delete restrict,
  amount text not null default '1',                 -- free text, e.g. '0.125' or '1/8 tab'
  slots text[] not null default array['AM','PM'],   -- subset of AM, PM
  start_date date not null default current_date,
  end_date date,                                    -- null = no end date
  active boolean not null default true,
  constraint slots_valid check (slots <@ array['AM','PM'] and cardinality(slots) > 0)
);
create index if not exists pet_medications_pet_idx on public.pet_medications (pet_id);

-- One row per dose that was ticked or skipped. No row = not done yet.
create table if not exists public.dose_logs (
  id uuid primary key default gen_random_uuid(),
  pet_medication_id uuid not null references public.pet_medications(id) on delete cascade,
  date date not null,
  slot text not null check (slot in ('AM','PM')),
  status text not null check (status in ('taken','skipped')),
  remark text not null default '',
  logged_at timestamptz not null default now(),
  unique (pet_medication_id, date, slot)
);
create index if not exists dose_logs_date_idx on public.dose_logs (date);

-- Single-row settings
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  am_time text not null default '08:00',
  pm_time text not null default '20:00',
  reminders_enabled boolean not null default true
);
insert into public.settings (id) values (1) on conflict do nothing;

-- Browser push subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);

-- Tracks reminders already sent so we nudge at most twice per slot per day
create table if not exists public.reminder_state (
  date date not null,
  slot text not null check (slot in ('AM','PM')),
  sent_count int not null default 0,
  last_sent_at timestamptz,
  primary key (date, slot)
);

-- Lock everything down: RLS on, no policies.
alter table public.pets enable row level security;
alter table public.medicines enable row level security;
alter table public.pet_medications enable row level security;
alter table public.dose_logs enable row level security;
alter table public.settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_state enable row level security;
