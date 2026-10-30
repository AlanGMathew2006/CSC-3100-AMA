-- Sprint 3 (US-08): mark which meals have allergen/dietary data confirmed from an official source.
-- Unverified meals keep allergens = '{}', which means "unknown", not "allergen-free".
alter table public.meals add column if not exists allergens_verified boolean not null default false;
alter table public.meals add column if not exists allergen_source text;
