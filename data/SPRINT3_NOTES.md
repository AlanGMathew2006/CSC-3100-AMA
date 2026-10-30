# Sprint 3 notes

Three stacked branches, all local (nothing pushed). **Merge in order: hours, then allergens, then
macro-match.** Each PR targets the branch before it (or `main` for the first); after one merges,
retarget the next PR to `main`.

Before every commit these all passed: `npm run build`, `npm run lint`, `npm test`,
`npm run typecheck --workspace=packages/express-backend`, and `npm run import:menu -- --dry-run`.

## 1. Branches, commits and PRs

### sprint3/location-hours (base: main)

- `1a10a90` Add dining hours import and open-now menu filtering

**PR title:** Dining hours import and open-now menu filtering

**PR description:**

```
## What
- `data/dining_hours.json`: official hours for all five locations from the Cal Poly Dine On Campus
  "Hours This Week" pages (Oct 25-31, 2026), with source URL and collected_on per location.
- Import pipeline validates the file (all seven days, HH:MM windows, [] for closed days) and loads it
  into `dining_locations.hours`. Re-running upserts on location name, so nothing is duplicated.
- `getOpenStatus(hours, at)` in `@csc-3100-ama/shared`: open / closed / unknown in America/Los_Angeles,
  with multiple windows per day and closes after midnight (Subway Kennedy 02:00, Subway PCV 00:00).
- `GET /api/menu` adds `open_status` to each offering; `?open_now=true` drops closed locations and keeps
  unknown ones (marked "unknown").
- MenuPage: "Open now" toggle plus Open / Closed / Hours unavailable badges per location and meal card.

## Notes
- These are regular-week hours. Breaks, finals week and holidays will be different; re-check
  dining_hours.json each quarter.
- `packages/shared` is now `"type": "module"` so the compiled backend can import runtime code from it.
- Panda combo-only items have no location offering, so the open-now filter doesn't hide them.
  (Fixed later on sprint3/macro-match: unpriced items now use their restaurant's location.)
- No schema change: `dining_locations.hours` already exists.
- Location hours only say when a location is open, not when each item is served. Breakfast-only
  items are handled separately by item serving windows (`data/serving_windows.json`, migration
  `20261031000000_item_serving_windows.sql`), added on sprint3/macro-match.

## Testing
- Unit tests for getOpenStatus (open, closed, unknown, exact open/close minute, after-midnight closes,
  multiple windows), hours validation, re-running the load without duplicates, and open_now filtering.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
```

### sprint3/allergen-data (base: sprint3/location-hours)

- `189f3ff` Add allergen and dietary data with restriction filtering

**PR title:** Allergen and dietary data with restriction filtering (US-08)

**PR description:**

```
## What
- `data/menu_items.csv`: new allergens, tags, allergens_verified and allergen_source columns. 33
  Chick-fil-A items are verified from their official item pages; the other 159 are
  allergens_verified=no and listed in data/DATA_TODO.md.
- Migration `20261030000000_meal_allergens_verified.sql`: `meals.allergens_verified` (default false)
  and `meals.allergen_source`. schema.sql updated.
- Import pipeline validates and imports allergens, tags and allergens_verified.
- `isMealAllowed(meal, prefs)` / `mealRestrictionReasons` in shared: Vegetarian / Vegan / Gluten-free
  need the matching tag; No seafood excludes fish and shellfish; Halal-friendly excludes
  contains_pork; user allergens and excluded_foods (name match, case-insensitive) exclude meals. A meal
  without verified allergen data is excluded whenever the user has an allergen set (also for No seafood
  and Halal-friendly).
- Meal details show allergens, or "Allergen info unavailable" when not verified.
- Onboarding and Profile show a note that Halal-friendly is not halal certification.
- data/DATA_TODO.md lists the 47 unpriced items by restaurant (combo-only vs. Grubhub lookup) and every
  unverified allergen row.

## Deploy order
Run the migration in the Supabase SQL editor before deploying this backend: GET /api/menu now selects
`allergens_verified` and fails until the column exists. Then run `npm run import:menu`.

## Testing
- Unit tests for every isMealAllowed rule and the pipeline's allergen columns.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
```

### sprint3/macro-match (base: sprint3/allergen-data)

- `b11dae2` Add Macro Match score to shared package
- `ff15164` Add MILP meal recommender and recommendations endpoint
- `3e4c278` Show optimizer recommendations and Macro Match in the app
- (this file) Add Sprint 3 notes

**PR title:** Macro Match score and meal optimizer (US-07, backend for US-03/US-05)

**PR description:**

```
## What
- `macroMatch(nutrition, targets, weights?)` in shared: 0-100 score plus per-macro breakdown
  (under / on_target / over / unavailable). Null values are never treated as 0.
- `recommendation-service.ts`: per-meal targets (today's remaining goals / meals left today, in Los
  Angeles time) and a Dining Dollar budget, then a goal-programming MILP per eligible location solved with
  HiGHS (`highs` 1.15.3, MIT, WebAssembly). Supports Panda Bowl / Plate / Bigger Plate built from
  base and entree servings. Nutrition priorities change the weights.
- `GET /api/recommendations?limit=&location_id=&meals_remaining=` returns the top locations with items,
  quantities, combo, total price, nutrition, targets, Macro Match and a one-line explanation.
  `GET /api/meal-targets` returns just the targets and budget.
- Dashboard uses the endpoint instead of the old ad-hoc sort, keeping the existing MealCard layout, and
  shows the Macro Match breakdown. MenuPage and MealDetailPage show Macro Match for single items.
- CONTEXT.md: "Recommendation algorithm" section.
- Item serving windows (`data/serving_windows.json`): breakfast items only show with "Open now" and
  only get recommended during breakfast (Chick-fil-A until 10:30, chain-wide time; Subway unknown).
  New migration `20261031000000_item_serving_windows.sql`, which runs after 20261030000000.
- Meal roles (`data/meal_roles.json`, migration `20261101000000_meal_roles.sql`): every item is a main,
  side, drink, dessert or sauce. Each recommendation has 1-2 mains (a combo counts as one), at most one
  side and one drink, and never desserts or sauces. The import fails if any meal has no role.
- Recommendation detail view: tapping a multi-item recommendation shows the whole meal (items,
  quantities, prices, per-item nutrition and serving times, totals vs targets with Macro Match,
  combined allergens, Add to Today). Tapping an item opens its own details. "Best options" no longer
  repeats the hero pick, and multi-item cards have no bookmark.
- The explanation line leads with the macro the user's priorities care about.
- Items with no offering of their own (unpriced items, Panda combo-only bases/entrees) and combos use
  their restaurant's dining location for the location label, Open/Closed badge and availability, so
  "Open now" hides an unpriced breakfast item after 10:30.

## Notes
- Deterministic: inputs sorted by id; ties by objective, then cost, then location name.
- Fixed-content combos (Panda #1-#6 Plates, Taco Bell and Chick-fil-A meals) are not used yet (TODO in
  the service).
- No schema change.

## Testing
- Model builder unit-tested without the solver (exact LP text).
- Integration tests with mock menu and user data on the real solver: budget never exceeded, excluded
  allergens and unverified meals never appear, location filter and preferred locations, closed / no
  Dining Dollars skipped, fixed combos never used, same output for the same (or reordered) inputs,
  empty-result reasons.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
```

## 2. Decisions made while you were away

**Git**
- `git config` gives `aababel` / `113000924+aababel@users.noreply.github.com` (from ~/.gitconfig).
  That isn't literally "Aarav Babel", but the same noreply email appears in this repo's history under
  both "aababel" and "Aarav Babel", so I treated it as you and committed with it unchanged.

**Hours (Task 1)**
- Used the hours you gave me as is. Subway Kennedy is 07:00-02:00 every day, so it is open until 02:00
  the next morning; Subway PCV Saturday close "00:00" means it closes at midnight.

**Allergen data (Task 2)**
- Taco Bell (page loads with JavaScript), Panda Express (HTTP 403) and Subway are unverified. Subway's
  official allergen PDF lists ingredients, not whole subs; combining rows into a sub would mean guessing
  the default build, so I didn't. I also didn't try to get around bot protection.
- Chick-fil-A: size variants (nuggets 8/12, mac & cheese S/M/L) share one item page, so they share its
  allergens. "Greek Yogurt Parfait" uses the Berry Parfait page (the CSV note says that is the official
  name). These stay unverified: the cookie-crumb parfait, the Chicken & Waffles Breakfast Sandwich (the
  CSV doesn't say which filet), items whose page has an empty "This menu item contains:" line or no
  statement (Grilled Nuggets, Hash Browns, fries, sauces, drinks, etc.), and items with no page.
- `contains_pork` comes from the official ingredient lists (bacon or sausage listed as pork).
  vegetarian / vegan / gluten_free are only set when a chain says so explicitly, which none of the
  pages did, so those filters currently match nothing.
- `allergens_verified` covers both the allergen and tag columns. The pipeline rejects rows that have
  allergens or tags without allergens_verified=yes, or yes without a source.
- The migration also adds `meals.allergen_source` (same pattern as nutrition_source and price_source).
- "No seafood" and "Halal-friendly" also exclude unverified meals. Otherwise an unverified Honey
  Walnut Shrimp would pass "No seafood", because unverified rows have no allergens listed.
- "Vegetarian" accepts the vegan tag too.
- Allergen names a user types are normalized ("Tree Nuts" -> tree_nut). An allergen we don't track
  (e.g. mustard) still turns on the safe default but can't match anything.
- Added `mealRestrictionReasons` alongside `isMealAllowed` so the UI can explain why a meal is hidden.
- Backend `pretest` now builds packages/shared first. Backend tests import its built output, and a
  stale build broke them.

**Macro Match and optimizer (Task 3)**
- Installed highs 1.15.3 rather than 1.15.4, which was only 14 days old. Its types are written for
  CommonJS, so the default import needs a typed cast (comment in the code). Reverted npm's
  `"peer": true` lockfile churn; npm also sorted the backend dependency list alphabetically.
- macroMatch: the score is `null` (shown as "Macro Match unavailable") when no macro has both a value and
  a target. A target of 0 divides the error by 1, as the optimizer does. A macro with no target is
  "unavailable".
- Targets are rounded to 0.1. A logged meal with an unknown macro adds 0 for that macro. "Spent today"
  is the sum of today's meal-log prices (assumes every log was paid with Dining Dollars).
- "Has nutrition" means all four macros are known.
- Build-your-own combo = base_count and entree_count are set and the name doesn't start with "#". A combo
  is dropped when the filters leave no base or no entree for it. That way the skip reason says
  "match your filters" instead of blaming the budget.
- Panda bases/entrees and combos belong to a location by restaurant name.
- `location_id` replaces preferred locations, but the location still has to be open (or unknown) and
  take Dining Dollars. Closed and no-Dining-Dollar locations are listed in `skipped`.
- The Macro Match shown for a recommendation uses equal weights, not the priority weights, so scores
  stay comparable across users and screens. Priorities only change what the optimizer picks.
- Solver options: `mip_rel_gap` 1e-6, no time limit. The models are tiny, and a time limit could make
  results depend on machine speed.
- Added `GET /api/meal-targets`, so MenuPage and MealDetailPage can score single items without running
  the optimizer. Query params are validated: limit 1-10 (default 3), meals_remaining 1-6.
- Dashboard: a recommendation is shown through the existing MealCard, combining the name, nutrition and
  total price. Tapping it or saving it uses the first real meal, so its allergen info always matches the
  meal shown. "Add to Today" logs the whole recommendation at its total price; meal_id is set only for a
  single standalone item, and unknown nutrition is left out instead of logged as 0.

**Noticed, not changed**
- The Dockerfile's build stage runs `npm ci` but never `npm run build`, so it only works if
  `apps/web/dist` was already built on the host.

## Follow-up: item serving windows (breakfast bug)

Commit "Add item serving windows so breakfast items only show during breakfast" on
sprint3/macro-match.

- **Bug:** breakfast-only items showed up on Explore, with "Open now", and in recommendations outside
  breakfast, because only location hours were tracked.
- **New migration:** `packages/express-backend/supabase/migrations/20261031000000_item_serving_windows.sql`
  adds `serving_windows jsonb` (null = all day) to `meals` and `menu_combos`. It runs **after**
  `20261030000000_meal_allergens_verified.sql`. Then re-run `npm run import:menu`.
- **Data:** `data/serving_windows.json` has rules by restaurant + category (meals) or restaurant +
  description prefix (combos), plus overrides by source_id.
  - Chick-fil-A breakfast and the 13 "Breakfast meal" combos are served 00:00-10:30 every day. That is
    the chain-wide time from chick-fil-a.com, not campus-confirmed. Saturday breakfast never shows,
    because the store opens at 11:00.
  - Subway's 4 breakfast items are "unknown" (on DATA_TODO).
  - Taco Bell and Panda: unchanged.
- **Availability:** `getItemAvailability(itemWindows, locationHours, at)` in shared returns
  available / not_now / unknown. GET /api/menu adds `availability` to each offering and combo, and
  `open_now=true` hides not_now and keeps unknown. The recommender only uses items and combos whose
  serving window is open now. Unknown serving times are never recommended.
- **PR description addition** for sprint3/macro-match: "Adds item serving windows so breakfast items
  only show and get recommended during breakfast (migration 20261031000000, runs after
  20261030000000)."

Decisions made on this fix:
- Of the 20 Chick-fil-A "Breakfast" rows, 18 get the breakfast window. "Greek Yogurt Parfait"
  (official name Berry Parfait) and "Berry Parfait with Cookie Crumbs" stay all-day, because
  chick-fil-a.com lists the Berry Parfait under Sides. Fruit Cup is already in Sides in the CSV;
  it also has an all-day override, as you asked.
- "Mini Yeast Rolls (4 ct)" might be all-day, but I had no evidence, so it follows the breakfast rule.
  It's on DATA_TODO to check.
- A definite "no" beats "unknown". If the location is closed or the item's window is closed, the item
  is not_now even when the other side is unknown.
- The recommender still allows locations with unknown hours (Task 3 rule). There, the item's own
  window must be open. Every location has verified hours now, so this doesn't currently matter.
- Combo availability uses every location of the combo's restaurant: available if any of them serves
  it now. Combos aren't tied to one location in the data.
- `/api/meal-targets` doesn't depend on which items are served, so it is unchanged.
- The label says "Breakfast" when the category or combo description says breakfast, otherwise
  "Limited hours". The time comes from the window, e.g. "Breakfast · until 10:30 am".

## Follow-up: recommendation detail view and meal roles

Commits "Constrain recommendations by meal role" and "Add recommendation detail view" on
sprint3/macro-match.

**Bug 2: meals made of desserts and drinks.**
- **New migration:** `packages/express-backend/supabase/migrations/20261101000000_meal_roles.sql` adds
  `meals.meal_role` (main / side / drink / dessert / sauce). It runs **after**
  `20261031000000_item_serving_windows.sql`.
- **Re-import afterwards.** Until the import sets roles, no meal counts as a main, so the dashboard
  shows no recommendations.
- **Role rules** are in `data/meal_roles.json`: restaurant + category rules plus overrides by source_id.
  - **Chick-fil-A:** Entrees and Breakfast are main, except Hash Brown, the two parfaits, Buttered
    Biscuit, English Muffin and Mini Yeast Rolls, which are side. Sides are side, Drinks are drink,
    Desserts are dessert (Frosted Coffee, shakes, Float, Frosted Soda, cookies), Dipping Sauces are
    sauce.
  - **Subway:** subs, Fresh Fit and Breakfast are main, Soups are side, Cookies are dessert.
  - **Taco Bell:** Tacos, Burritos, Chalupas and Specialties are main, Nachos & Sides is side, Sauces
    are sauce.
  - **Panda Express:** Appetizers are side. In More, Apple Pie Roll and Fortune Cookie are dessert and
    the rest are sauce.
- **The import fails** if any meal has no role, or if the roles file has a problem.
- **Optimizer per location:**
  - mains + combos: 1 to 2
  - sides: at most 1
  - drinks: at most 1
  - desserts and sauces: never
  - quantity: up to 2 of the same main, 1 of anything else
  - total: at most 4 items
- **Items are listed main first.** For a combo, that's the entrées, then the base, then sides and
  drinks.
- **The explanation leads with your priority:**
  - "High protein" → protein
  - "Lower calorie" → calories
  - both → "Covers X% of your remaining protein with Y% of your remaining calories"
  - "Balanced" → the overall Macro Match
  - none → protein

**Bug 1: "View Meal" showed one item.**
- **New page:** `apps/web/src/pages/app/RecommendationDetailPage.tsx` (MealDetailPage's styles). It
  shows the location, total price and combo, then every item with its quantity, price ("in combo" for
  combo parts), calories/protein/carbs/fat and serving-time label. Below that are the totals vs
  targets with the Macro Match breakdown, the explanation line, combined allergens ("Allergen info
  incomplete" if any item is unverified), and Add to Today, which logs the whole meal. Tapping an item
  opens MealDetailPage; Back returns to the recommendation.
- **Cards:** titles are main first and cut off with "+N more". Multi-item cards have no bookmark (a new
  optional `hideBookmark` prop on MealCard). A single-item recommendation still opens and saves that
  item directly.
- **"Best options for you today"** now leaves out the hero pick. The dashboard asks for 4 results, so up
  to 3 more show.

Decisions made on this fix:
- **Panda Bases/Entrees are `main`.** They're only used inside a Bowl/Plate, which counts as the main.
  Your mapping didn't list them, and every row needs a role.
- **Taco Bell "Cinnamon Twists" is `dessert`,** not side. It's a sweet snack listed under Nachos &
  Sides. It's unpriced, so it can't be recommended either way.
- **Fruit Cup** is already in Sides in the CSV, so it needs no role override.
- **Meals without a role** (for example before the import runs) are never recommended.
- **The combined allergen list** on the recommendation page is labeled "Contains at least:" when info
  is incomplete. The unverified items' allergens are unknown, so the list may be missing some.

Sample run on the real data (2000 cal / 150 g protein / 200 g carbs / 65 g fat, no meals logged,
2 meals left, $25, Wednesday 13:00). Per-meal targets were 1000 cal / 75 g protein / 100 g carbs /
32.5 g fat:

1. **Chick-fil-A (1901 Marketplace), $22.66, Macro Match 98:** Deluxe Sandwich + Grilled Nuggets
   (8 ct) + Berry Parfait with Cookie Crumbs + 1% Chocolate Milk.
2. **Subway (Poly Canyon Village), $21.57, Macro Match 93:** Honey Mustard Chicken + Sweet Onion
   Chicken Teriyaki + Chicken Noodle Soup.
3. **Subway (Kennedy Library), $17.98, Macro Match 92:** Chipotle Philly + Sweet Onion Chicken
   Teriyaki.

Taco Bell was skipped (closed until 16:00).

## Follow-up: availability of unpriced items

Commit "Use restaurant locations for availability of unpriced items" on sprint3/macro-match. **No
migration needed.** It only reads columns that already exist (`dining_locations.id, name,
restaurant, campus_area, hours`).

- **Bug:** with "Open now" on at 13:28 on a weekday, Explore still showed "Chicken, Egg & Cheese
  Biscuit" (Chick-fil-A breakfast). The card was labeled "CHICK-FIL-A", showed "Price unavailable", and
  had no badge. Availability came only from menu_offerings, so items without a price came back
  "unknown" and "Open now" kept them.
- **Fix:** for an item with no offerings, GET /api/menu now returns `restaurant_locations`: the
  dining_locations rows with the same restaurant, each with open_status and availability, best first.
  The item also gets an item-level `availability`. Combos get the same `locations` list. The card and
  detail page take the location label and Open/Closed badge from there, and "Open now" uses the
  item-level availability.
- **No known location:** a closed serving window still gives "not_now".
- **Panda combo-only parts** keep "Price unavailable" and stay available while Panda is open.
- **Explore's Location filter** now also matches unpriced items by their restaurant's location.
- **Effect at 13:00 on a weekday (Wed Nov 4):** "Open now" hides **54** of 192 items, up from **38**.
  The extra 16 are all unpriced: Chicken, Egg & Cheese Biscuit and 15 unpriced Taco Bell items (Taco
  Bell opens at 16:00). Combos hidden: 23 of 41 before and after. On Saturday at 13:00, 74 items and
  32 combos are hidden (Panda is closed).

## 3. Remaining manual steps

1. **Supabase SQL editor**, in this order:
   1. `packages/express-backend/supabase/migrations/20261030000000_meal_allergens_verified.sql`
      (before deploying the allergen branch's backend).
   2. `packages/express-backend/supabase/migrations/20261031000000_item_serving_windows.sql`
      (before deploying sprint3/macro-match; GET /api/menu selects `serving_windows`).
   3. `packages/express-backend/supabase/migrations/20261101000000_meal_roles.sql`
      (before deploying sprint3/macro-match; GET /api/menu selects `meal_role`).
2. **Re-import** from `packages/express-backend`: `npm run import:menu -- --dry-run`, then
   `npm run import:menu`. This loads hours, allergens, tags, serving windows and meal roles.
   Recommendations stay empty until this runs.
3. **data/DATA_TODO.md**:
   - 36 prices to look up in Grubhub (11 Panda bases/entrees are combo-only and need nothing).
   - 159 unverified allergen rows (all of Taco Bell, Subway and Panda, plus 45 Chick-fil-A items).
   - No vegetarian / vegan / gluten_free tags yet, so those filters show nothing until they're added.
   - Subway breakfast cutoff (PCV and Kennedy Library); confirm Chick-fil-A's 10:30 cutoff on campus;
     check whether Mini Yeast Rolls are sold all day.
   - Re-check hours each quarter and before breaks.
4. Click through Dashboard, Explore and Meal details while signed in. I couldn't sign in from here, so
   the UI is only covered by unit tests on its helpers.

## 4. WIP or failing

Nothing is failing; no WIP commits. Known gap (not a bug): fixed-content combos (Panda #1-#6 Plates,
Taco Bell and Chick-fil-A meals) aren't used by the optimizer yet.

Fixed: "Open now" used to keep unpriced items (unpriced Chick-fil-A breakfast items, unpriced Taco Bell
items, Panda combo-only bases/entrees), because they had no offering to compute availability from.

## 5. Two-minute demo script (sprint review)

1. **(20s) Hours.** Explore tab. Point out the Dining Locations list with Open / Closed badges from the
   official hours. Turn on **Open now**: meals at closed locations disappear. (Before 4 pm Taco Bell
   shows Closed.)
2. **(25s) Allergens.** Open a Chick-fil-A sandwich: "Contains: Milk, Egg, Soy, Wheat, Sesame". Open a
   Taco Bell item: "Allergen info unavailable". Explain that unverified data is never shown as safe.
3. **(15s) Dietary filters.** Profile: choose Halal-friendly and point out the "not halal
   certification" note. Bacon and sausage items no longer get recommended.
4. **(40s) Recommendations.** Dashboard, "What should I eat next?". Show the Macro Match score, the
   per-macro breakdown, and the explanation line (for example "Covers 93% of your remaining protein for
   this meal and stays $3.52 under today's budget"; your numbers will differ). Explain: targets are today's remaining goals split over the meals
   left; one small optimization per open location; the budget is a hard limit; a cost term keeps it
   from just picking the cheapest thing.
5. **(10s) Priorities.** Switch the priority to High protein and reload: the pick shifts toward protein.
6. **(10s) Log it.** Add to Today: the budget and nutrition rings update and the next recommendation
   adjusts.
7. **(10s) Explainable.** Same inputs, same answer: no AI, deterministic, tested. The CONTEXT.md section
   explains the model in plain language.
