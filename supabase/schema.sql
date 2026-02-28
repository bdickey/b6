-- ════════════════════════════════════════
-- Benji HQ — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ════════════════════════════════════════

-- Calendar Events
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  type text default 'default',
  notes text,
  created_at timestamptz default now()
);

-- People CRM
create table if not exists people_crm (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_name text,
  child_name text,
  child_grade text,
  contact text,
  type text,
  priority text default 'medium',
  last_date date,
  status text,
  notes text
);

-- Afterschool Programs
create table if not exists afterschool_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  day_time text,
  location text,
  cost text,
  status text default 'consider'
);

-- Family Events
create table if not exists family_events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  who text,
  notes text
);

-- Activities Wishlist
create table if not exists activities_wishlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  category text,
  badge text,
  badge_type text,
  notes text,
  sort_order integer default 0
);

-- Places Visited
create table if not exists places_visited (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  year integer
);

-- Meals Plan
create table if not exists meals_plan (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  day text not null,
  dinner text,
  time text,
  who_cooks text,
  is_special boolean default false
);

-- Core Dishes
create table if not exists core_dishes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  time_mins integer,
  dish_type text
);

-- Grocery Items
create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  checked boolean default false,
  week_of date
);

-- Restaurants
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuisine text,
  address text,
  phone text,
  delivery_platform text,
  delivery_url text
);

-- Migration: run these if the table already exists
-- alter table restaurants add column if not exists address text;
-- alter table restaurants add column if not exists phone text;

-- Sitters
create table if not exists sitters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  rate_per_hour numeric,
  availability text,
  rating integer default 5,
  notes text
);

-- Sitter Bookings
create table if not exists sitter_bookings (
  id uuid primary key default gen_random_uuid(),
  sitter_id uuid references sitters(id),
  date date not null,
  start_time text,
  end_time text,
  hours numeric,
  total numeric,
  status text default 'tentative',
  payment_method text
);

-- Vault Items
create table if not exists vault_items (
  id uuid primary key default gen_random_uuid(),
  document text not null,
  value_hint text,
  expiry text,
  location text
);

-- App Settings
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text
);

-- Benji Spelling Log
create table if not exists benji_spelling_log (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz default now(),
  correct integer default 0,
  total integer default 0
);

-- ════════════════════════════════════════
-- Row Level Security
-- Enable RLS on all tables, require auth
-- ════════════════════════════════════════

alter table calendar_events enable row level security;
alter table people_crm enable row level security;
alter table afterschool_programs enable row level security;
alter table family_events enable row level security;
alter table activities_wishlist enable row level security;
alter table places_visited enable row level security;
alter table meals_plan enable row level security;
alter table core_dishes enable row level security;
alter table grocery_items enable row level security;
alter table restaurants enable row level security;
alter table sitters enable row level security;
alter table sitter_bookings enable row level security;
alter table vault_items enable row level security;
alter table app_settings enable row level security;
alter table benji_spelling_log enable row level security;

-- Create a single policy for each table: allow all ops for authenticated users
do $$
declare
  t text;
begin
  foreach t in array array[
    'calendar_events','people_crm','afterschool_programs','family_events',
    'activities_wishlist','places_visited','meals_plan','core_dishes',
    'grocery_items','restaurants','sitters','sitter_bookings',
    'vault_items','app_settings','benji_spelling_log'
  ]
  loop
    execute format('
      create policy "Authenticated users can do everything on %I"
      on %I for all to authenticated
      using (true)
      with check (true);
    ', t, t);
  end loop;
end $$;

-- ════════════════════════════════════════
-- Seed default app settings
-- ════════════════════════════════════════
insert into app_settings (key, value) values
  ('benji_age', '6'),
  ('benji_grade', '1st'),
  ('benji_school', 'Lincoln Elementary'),
  ('benji_dob', '2018-04-14'),
  ('carpool_text', 'Hi! This week''s carpool schedule:\n\nMon: [Driver]\nTue: [Driver]\nWed: [Driver]\nThu: [Driver]\nFri: [Driver]\n\nPickup at 8:00am, school door.')
on conflict (key) do nothing;
