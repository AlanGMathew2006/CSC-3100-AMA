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
  nutrition_priorities text[] not null default '{}',
  budget_alerts_enabled boolean not null default true,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_preferences
  add column if not exists nutrition_priorities text[] not null default '{}',
  add column if not exists budget_alerts_enabled boolean not null default true,
  add column if not exists theme text not null default 'light'
    check (theme in ('light', 'dark'));

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

-- ============ Menu import (Sprint 2, see migrations/20261019000000_menu_import.sql) ============
-- ============ Dining locations: one row per restaurant per campus spot ============
alter table public.dining_locations add column if not exists restaurant text;
alter table public.dining_locations add column if not exists campus_area text;
create unique index if not exists dining_locations_name_key on public.dining_locations (name);

-- ============ Meals: keep the restaurant/category and a stable id from the CSV ============
alter table public.meals add column if not exists source_id text;
alter table public.meals add column if not exists restaurant text;
alter table public.meals add column if not exists category text;
alter table public.meals add column if not exists serving text;
alter table public.meals add column if not exists meal_component text; -- 'base' / 'entree' for combo-built meals
alter table public.meals add column if not exists nutrition_source text;
alter table public.meals add column if not exists notes text;
create unique index if not exists meals_source_id_key on public.meals (source_id);

-- ============ Meals: allergen verification (Sprint 3, see migrations/20261030000000_meal_allergens_verified.sql) ============
alter table public.meals add column if not exists allergens_verified boolean not null default false;
alter table public.meals add column if not exists allergen_source text;

-- ============ Item serving windows (Sprint 3, see migrations/20261031000000_item_serving_windows.sql) ============
-- null = whenever the location is open; otherwise the dining_locations.hours format or "unknown".
alter table public.meals add column if not exists serving_windows jsonb;

-- ============ Meal roles (Sprint 3, see migrations/20261101000000_meal_roles.sql) ============
alter table public.meals add column if not exists meal_role text
  check (meal_role in ('main', 'side', 'drink', 'dessert', 'sauce'));

-- ============ Menu offerings: where the price came from ============
alter table public.menu_offerings add column if not exists price_source text;

-- ============ Combos (Panda bowls/plates, Taco Bell and Chick-fil-A meals) ============
create table if not exists public.menu_combos (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  restaurant text not null,
  name text not null,
  description text,
  base_count integer check (base_count >= 0),
  entree_count integer check (entree_count >= 0),
  price numeric(10, 2) not null check (price >= 0),
  price_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists menu_combos_set_updated_at on public.menu_combos;
create trigger menu_combos_set_updated_at
  before update on public.menu_combos
  for each row execute function public.set_updated_at();

alter table public.menu_combos add column if not exists serving_windows jsonb;

alter table public.menu_combos enable row level security;
drop policy if exists "Authenticated read menu combos" on public.menu_combos;
create policy "Authenticated read menu combos" on public.menu_combos
  for select to authenticated using (true);

-- ============ Defer profile creation until onboarding ============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Complete onboarding and create the user's profile ============
create or replace function public.complete_onboarding(
  p_dining_dollars_balance numeric,
  p_daily_spending_target numeric,
  p_calories integer,
  p_protein_g integer,
  p_carbs_g integer,
  p_fat_g integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;

  if p_dining_dollars_balance is null
    or p_daily_spending_target is null
    or p_calories is null
    or p_protein_g is null
    or p_carbs_g is null
    or p_fat_g is null
    or p_dining_dollars_balance < 0
    or p_daily_spending_target < 0
    or p_calories < 0
    or p_protein_g < 0
    or p_carbs_g < 0
    or p_fat_g < 0 then
    raise exception 'All onboarding values must be non-negative numbers';
  end if;

  select left(
    nullif(
      btrim(coalesce(
        u.raw_user_meta_data ->> 'display_name',
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name'
      )),
      ''
    ),
    80
  )
  into v_display_name
  from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception 'Authenticated user was not found';
  end if;

  insert into public.profiles (
    id,
    display_name,
    dining_dollars_balance,
    daily_spending_target,
    onboarding_completed
  )
  values (
    v_user_id,
    v_display_name,
    p_dining_dollars_balance,
    p_daily_spending_target,
    true
  )
  on conflict (id) do update set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    dining_dollars_balance = excluded.dining_dollars_balance,
    daily_spending_target = excluded.daily_spending_target,
    onboarding_completed = true;

  insert into public.user_goals (
    user_id,
    calories,
    protein_g,
    carbs_g,
    fat_g
  )
  values (
    v_user_id,
    p_calories,
    p_protein_g,
    p_carbs_g,
    p_fat_g
  )
  on conflict (user_id) do update set
    calories = excluded.calories,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g;
end;
$$;

revoke execute on function public.complete_onboarding(numeric, numeric, integer, integer, integer, integer)
  from public, anon;
grant execute on function public.complete_onboarding(numeric, numeric, integer, integer, integer, integer)
  to authenticated;

create or replace function public.complete_onboarding_with_preferences(
  p_dining_dollars_balance numeric,
  p_daily_spending_target numeric,
  p_calories integer,
  p_protein_g integer,
  p_carbs_g integer,
  p_fat_g integer,
  p_nutrition_priorities text[],
  p_dietary_restrictions text[],
  p_preferred_location_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;

  perform public.complete_onboarding(
    p_dining_dollars_balance,
    p_daily_spending_target,
    p_calories,
    p_protein_g,
    p_carbs_g,
    p_fat_g
  );

  insert into public.user_preferences (
    user_id,
    nutrition_priorities,
    dietary_restrictions,
    preferred_location_ids
  )
  values (
    v_user_id,
    coalesce(p_nutrition_priorities, '{}'),
    coalesce(p_dietary_restrictions, '{}'),
    coalesce(p_preferred_location_ids, '{}')
  )
  on conflict (user_id) do update set
    nutrition_priorities = excluded.nutrition_priorities,
    dietary_restrictions = excluded.dietary_restrictions,
    preferred_location_ids = excluded.preferred_location_ids;
end;
$$;

revoke execute on function public.complete_onboarding_with_preferences(
  numeric, numeric, integer, integer, integer, integer, text[], text[], uuid[]
) from public, anon;
grant execute on function public.complete_onboarding_with_preferences(
  numeric, numeric, integer, integer, integer, integer, text[], text[], uuid[]
) to authenticated;

-- ============ Keep Dining Dollar balance in sync with meal logs ============
create or replace function public.apply_meal_log_to_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
      set dining_dollars_balance = greatest(dining_dollars_balance - new.price, 0)
      where id = new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.profiles
      set dining_dollars_balance = dining_dollars_balance + old.price
      where id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists meal_logs_apply_balance on public.meal_logs;
create trigger meal_logs_apply_balance
  after insert or delete on public.meal_logs
  for each row execute function public.apply_meal_log_to_balance();

-- ============ Row Level Security ============
alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_preferences enable row level security;
alter table public.dining_locations enable row level security;
alter table public.meals enable row level security;
alter table public.menu_offerings enable row level security;
alter table public.meal_logs enable row level security;
alter table public.saved_meals enable row level security;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

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
