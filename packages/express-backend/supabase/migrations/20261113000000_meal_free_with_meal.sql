-- Sprint 4 (#52): sauces, fortune cookies etc. that come free with a meal. They keep no standalone
-- price (never $0 unless an official source lists it), Explore shows "Free with a meal" instead of
-- "Price unavailable", and the recommender never picks them on their own. Loaded from the
-- free_with_meal column of data/menu_items.csv by npm run import:menu.
alter table public.meals add column if not exists free_with_meal boolean not null default false;
