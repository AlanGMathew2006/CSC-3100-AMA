-- Sprint 4: what a fixed-content combo contains (Panda #1-#6 Plates, Chick-fil-A and Taco Bell
-- meals), so the recommender can use them. Loaded from data/combo_contents.json by the import:
-- { "source", "verified", "components": [{ "meal": <meals.id>, "servings" } |
--   { "slot": "side" | "drink", "choices": [<meals.id>], "default": <meals.id> }], "notes" }.
-- null = build-your-own combo (Bowl / Plate / Bigger Plate). Only verified contents are recommended.
alter table public.menu_combos add column if not exists contents jsonb;
