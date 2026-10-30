-- Sprint 3: when specific items are served (e.g. Chick-fil-A breakfast until 10:30), separate from
-- location hours. Same per-day format as dining_locations.hours, or the JSON string "unknown".
-- null = served whenever the location is open. Loaded from data/serving_windows.json by the import.
alter table public.meals add column if not exists serving_windows jsonb;
alter table public.menu_combos add column if not exists serving_windows jsonb;
