-- PolyProvision database schema (Supabase / Postgres)
-- Run in the Supabase SQL editor, or place in supabase/migrations/ for the CLI.
-- Matches the data model in CONTEXT.md.

-- ============ Profiles (extends auth.users) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  dining_dollars_balance numeric(10, 2) not null default 0 check (dining_dollars_balance >= 0),
  daily_spending_target numeric(10, 2) check (daily_spending_target >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ User goals (nutrition targets) ============
create table if not exists public.user_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  calories integer check (calories >= 0),
  protein_g integer check (protein_g >= 0),
  carbs_g integer check (carbs_g >= 0),
  fat_g integer check (fat_g >= 0),
  fiber_g integer check (fiber_g >= 0), -- optional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ User preferences ============
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dietary_restrictions text[] not null default '{}', -- e.g. vegan, gluten-free
  allergens text[] not null default '{}',
  cuisine_preferences text[] not null default '{}',
  preferred_location_ids uuid[] not null default '{}',
  excluded_foods text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ Dining locations ============
create table if not exists public.dining_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  accepts_dining_dollars boolean not null default true,
  -- e.g. {"mon": [{"open": "07:00", "close": "20:00"}], "tue": [...]}
  hours jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============ Meals (canonical nutrition / allergen info) ============
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cuisine text,
  calories integer check (calories >= 0),
  protein_g numeric(6, 1) check (protein_g >= 0),
  carbs_g numeric(6, 1) check (carbs_g >= 0),
  fat_g numeric(6, 1) check (fat_g >= 0),
  fiber_g numeric(6, 1) check (fiber_g >= 0),
  allergens text[] not null default '{}',
  tags text[] not null default '{}', -- e.g. vegan, gluten-free
  created_at timestamptz not null default now()
);

-- ============ Menu offerings (location-specific, per service date) ============
create table if not exists public.menu_offerings (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  location_id uuid not null references public.dining_locations (id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  available boolean not null default true,
  service_date date not null default current_date,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (meal_id, location_id, service_date)
);
create index if not exists menu_offerings_location_date_idx on public.menu_offerings (location_id, service_date);
create index if not exists menu_offerings_meal_idx on public.menu_offerings (meal_id);

-- ============ Meal logs (price/nutrition snapshots) ============
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete set null,
  location_id uuid references public.dining_locations (id) on delete set null,
  name text not null,
  location_name text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  calories integer,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  fiber_g numeric(6, 1),
  eaten_at timestamptz not null default now()
);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, eaten_at desc);

-- ============ Saved meals (bookmarks) ============
create table if not exists public.saved_meals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, meal_id)
);

-- ============ Upgrade older installs (create table if not exists skips existing tables) ============
alter table public.profiles add column if not exists daily_spending_target numeric(10, 2) check (daily_spending_target >= 0);
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.meal_logs add column if not exists location_id uuid references public.dining_locations (id) on delete set null;
alter table public.meal_logs add column if not exists location_name text;
alter table public.meal_logs add column if not exists fiber_g numeric(6, 1);
alter table public.meal_logs add column if not exists meal_id uuid references public.meals (id) on delete set null;

-- ============ updated_at trigger ============
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists user_goals_set_updated_at on public.user_goals;
create trigger user_goals_set_updated_at
  before update on public.user_goals
  for each row execute function public.set_updated_at();

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ============ Auto-create profile on signup ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Row Level Security ============
alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_preferences enable row level security;
alter table public.dining_locations enable row level security;
alter table public.meals enable row level security;
alter table public.menu_offerings enable row level security;
alter table public.meal_logs enable row level security;
alter table public.saved_meals enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own goals" on public.user_goals;
create policy "Users manage own goals" on public.user_goals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own preferences" on public.user_preferences;
create policy "Users manage own preferences" on public.user_preferences
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Menu data is read-only for clients; writes come from a protected server-side sync job
-- using the service role (which bypasses RLS).
drop policy if exists "Authenticated read locations" on public.dining_locations;
create policy "Authenticated read locations" on public.dining_locations
  for select to authenticated using (true);
drop policy if exists "Authenticated read meals" on public.meals;
create policy "Authenticated read meals" on public.meals
  for select to authenticated using (true);
drop policy if exists "Authenticated read menu offerings" on public.menu_offerings;
create policy "Authenticated read menu offerings" on public.menu_offerings
  for select to authenticated using (true);

drop policy if exists "Users manage own meal logs" on public.meal_logs;
create policy "Users manage own meal logs" on public.meal_logs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own saved meals" on public.saved_meals;
create policy "Users manage own saved meals" on public.saved_meals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
