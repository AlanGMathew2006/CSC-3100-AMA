-- Sprint 2: columns and tables needed to import the collected campus menu data
-- (data/menu_items.csv, data/menu_combos.csv) and show it in the app.

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

alter table public.menu_combos enable row level security;
drop policy if exists "Authenticated read menu combos" on public.menu_combos;
create policy "Authenticated read menu combos" on public.menu_combos
  for select to authenticated using (true);
