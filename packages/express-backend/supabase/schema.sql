-- PolyProvision database schema (Supabase / Postgres)
-- Run in the Supabase SQL editor, or place in supabase/migrations/ for the CLI.

-- ============ Profiles (extends auth.users) ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  dining_dollars_balance numeric(10, 2) not null default 0 check (dining_dollars_balance >= 0),
  daily_calorie_goal integer,
  daily_protein_goal_g integer,
  daily_budget numeric(10, 2),
  dietary_restrictions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ Dining locations ============
create table if not exists public.dining_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  accepts_dining_dollars boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ Menu items ============
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.dining_locations (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  calories integer,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  tags text[] not null default '{}', -- e.g. vegan, gluten-free
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists menu_items_location_idx on public.menu_items (location_id);

-- ============ Meal logs ============
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  price numeric(10, 2) not null default 0 check (price >= 0),
  calories integer,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  eaten_at timestamptz not null default now()
);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, eaten_at desc);

-- ============ Favorites ============
create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, menu_item_id)
);

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
alter table public.dining_locations enable row level security;
alter table public.menu_items enable row level security;
alter table public.meal_logs enable row level security;
alter table public.favorites enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Anyone can read locations" on public.dining_locations
  for select using (true);
create policy "Anyone can read menu items" on public.menu_items
  for select using (true);

create policy "Users manage own meal logs" on public.meal_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own favorites" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
