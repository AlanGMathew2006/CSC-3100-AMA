-- PolyProvision initial database layer.

-- ============ Shared updated_at trigger ============
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  dining_dollar_balance numeric(8, 2) not null default 0
    constraint profiles_balance_nonneg check (dining_dollar_balance >= 0),
  daily_spending_target numeric(8, 2)
    constraint profiles_spending_target_nonneg check (daily_spending_target >= 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ user_goals ============
create table public.user_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  calorie_target integer
    constraint user_goals_calorie_positive check (calorie_target > 0),
  protein_target_g integer
    constraint user_goals_protein_nonneg check (protein_target_g >= 0),
  carbs_target_g integer
    constraint user_goals_carbs_nonneg check (carbs_target_g >= 0),
  fat_target_g integer
    constraint user_goals_fat_nonneg check (fat_target_g >= 0),
  fiber_target_g integer
    constraint user_goals_fiber_nonneg check (fiber_target_g >= 0),
  updated_at timestamptz not null default now()
);

-- ============ user_preferences ============
create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dietary_restrictions text[] not null default '{}',
  allergen_exclusions text[] not null default '{}',
  preferred_cuisines text[] not null default '{}',
  preferred_location_ids uuid[] not null default '{}',
  excluded_foods text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ============ dining_locations ============
create table public.dining_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  campus_area text,
  hours_text text,
  is_active boolean not null default true
);

-- ============ meals ============
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  description text,
  calories integer constraint meals_calories_nonneg check (calories >= 0),
  protein_g numeric(7, 2) constraint meals_protein_nonneg check (protein_g >= 0),
  carbs_g numeric(7, 2) constraint meals_carbs_nonneg check (carbs_g >= 0),
  fat_g numeric(7, 2) constraint meals_fat_nonneg check (fat_g >= 0),
  fiber_g numeric(7, 2) constraint meals_fiber_nonneg check (fiber_g >= 0),
  sodium_mg integer constraint meals_sodium_nonneg check (sodium_mg >= 0),
  allergens text[] not null default '{}',
  dietary_tags text[] not null default '{}',
  last_synced_at timestamptz not null default now()
);

-- ============ menu_offerings ============
create table public.menu_offerings (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  location_id uuid not null references public.dining_locations (id),
  service_date date not null,
  meal_period text,
  price numeric(8, 2) not null
    constraint menu_offerings_price_nonneg check (price >= 0),
  is_available boolean not null default true,
  available_from timestamptz,
  available_until timestamptz,
  source_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  constraint menu_offerings_window_valid
    check (available_until is null or available_from is null or available_until >= available_from)
);

-- meal_period may be null, so treat nulls as equal for uniqueness (PG 15+).
alter table public.menu_offerings
  add constraint menu_offerings_unique_slot
  unique nulls not distinct (meal_id, location_id, service_date, meal_period);

create index menu_offerings_date_location_available_idx
  on public.menu_offerings (service_date, location_id, is_available);
create index menu_offerings_location_id_idx on public.menu_offerings (location_id);

-- ============ meal_logs ============
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  offering_id uuid references public.menu_offerings (id) on delete set null,
  logged_at timestamptz not null default now(),
  meal_name_snapshot text not null,
  price_paid numeric(8, 2) not null
    constraint meal_logs_price_nonneg check (price_paid >= 0),
  calories_snapshot integer constraint meal_logs_calories_nonneg check (calories_snapshot >= 0),
  protein_g_snapshot numeric(7, 2) constraint meal_logs_protein_nonneg check (protein_g_snapshot >= 0),
  carbs_g_snapshot numeric(7, 2) constraint meal_logs_carbs_nonneg check (carbs_g_snapshot >= 0),
  fat_g_snapshot numeric(7, 2) constraint meal_logs_fat_nonneg check (fat_g_snapshot >= 0),
  fiber_g_snapshot numeric(7, 2) constraint meal_logs_fiber_nonneg check (fiber_g_snapshot >= 0),
  meal_status text not null default 'logged'
    constraint meal_logs_status_valid check (meal_status in ('logged', 'removed'))
);

create index meal_logs_user_logged_at_idx on public.meal_logs (user_id, logged_at desc);
create index meal_logs_offering_id_idx on public.meal_logs (offering_id);

-- ============ saved_meals ============
create table public.saved_meals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid not null references public.meals (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, meal_id)
);

create index saved_meals_meal_id_idx on public.saved_meals (meal_id);

-- ============ updated_at triggers ============
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger user_goals_set_updated_at
  before update on public.user_goals
  for each row execute function public.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ============ Row Level Security ============
alter table public.profiles enable row level security;
alter table public.user_goals enable row level security;
alter table public.user_preferences enable row level security;
alter table public.dining_locations enable row level security;
alter table public.meals enable row level security;
alter table public.menu_offerings enable row level security;
alter table public.meal_logs enable row level security;
alter table public.saved_meals enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- user_goals
create policy "user_goals_select_own" on public.user_goals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_goals_insert_own" on public.user_goals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_goals_update_own" on public.user_goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_goals_delete_own" on public.user_goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- user_preferences
create policy "user_preferences_select_own" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_preferences_insert_own" on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_preferences_update_own" on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_preferences_delete_own" on public.user_preferences
  for delete to authenticated using (user_id = (select auth.uid()));

-- meal_logs
create policy "meal_logs_select_own" on public.meal_logs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "meal_logs_insert_own" on public.meal_logs
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "meal_logs_update_own" on public.meal_logs
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "meal_logs_delete_own" on public.meal_logs
  for delete to authenticated using (user_id = (select auth.uid()));

-- saved_meals
create policy "saved_meals_select_own" on public.saved_meals
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_meals_insert_own" on public.saved_meals
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_meals_update_own" on public.saved_meals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_meals_delete_own" on public.saved_meals
  for delete to authenticated using (user_id = (select auth.uid()));

-- Menu data: read-only for clients; writes only via service role (bypasses RLS).
create policy "dining_locations_select_authenticated" on public.dining_locations
  for select to authenticated using (true);
create policy "meals_select_authenticated" on public.meals
  for select to authenticated using (true);
create policy "menu_offerings_select_authenticated" on public.menu_offerings
  for select to authenticated using (true);

-- Defense in depth: strip write privileges on menu tables from client roles.
revoke insert, update, delete, truncate on public.dining_locations from anon, authenticated;
revoke insert, update, delete, truncate on public.meals from anon, authenticated;
revoke insert, update, delete, truncate on public.menu_offerings from anon, authenticated;
