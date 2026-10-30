-- Sprint 3: what part of a meal each item is, so recommendations are built around a main dish and
-- never out of desserts, drinks, or sauces. Loaded from data/meal_roles.json by the import, which
-- refuses to run if any meal has no role.
alter table public.meals add column if not exists meal_role text
  check (meal_role in ('main', 'side', 'drink', 'dessert', 'sauce'));
