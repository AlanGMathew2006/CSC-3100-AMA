# Sprint 4 notes

Two stacked branches, all local (nothing pushed). **Merge in order: explore-add-meal into main, then
fixed-combos.** The fixed-combos PR targets sprint4/explore-add-meal; after that merges, retarget it to
`main`.

Before every commit these all passed: `npm run build`, `npm run lint`, `npm test`,
`npm run typecheck --workspace=packages/express-backend`, and `npm run import:menu -- --dry-run`.

## 1. Branches, commits and PRs

### sprint4/explore-add-meal (base: main)

- `37d8970` Let users add menu items and combos to today from Explore

**PR title:** Add to Today from Explore (menu items and combos)

**PR description:**

```
## What
Bug: on Explore there was no way to log a menu item. Logging only worked from a dashboard
recommendation.

- `useLogMeal()` hook (`{ logging, error, addMeal }`) holds the logging logic. `useDashboard` uses it
  and then reloads, so the dashboard works as before; RecommendationDetailPage uses the hook directly.
  The dashboard fetches its data whenever it opens, so a log added from Explore shows up there.
- `lib/mealLog.ts`: `mealLogFromItem(item, locationId)` builds the MealLogInput (meal_id, location,
  name, price from that location's offering, macros). Unknown macros stay undefined, never 0. An item
  with no price at that location is logged without a price.
- Meal details: "Add to Today" (primary, "Adding…" while saving, then a "Added to today" toast) and
  "Save meal" (secondary). "Not interested" is gone (Back does the same). Items sold at more than one
  location (e.g. both Subways) get a location picker, defaulting to one that is serving it now.
  Unpriced items say "Price unavailable, not counted toward spending".
- MealCard: new optional `onAdd` prop renders a small "+" button (aria-label "Add <name> to today").
  Only Explore passes it. Explore adds right away when the item has exactly one location, otherwise it
  opens the details page to pick one.
- Not-served-now and unknown items can still be logged; their labels are unchanged.
- Combos & Meals cards are now buttons that open a combo view. Bowl / Plate / Bigger Plate: pick the
  base (optionally half and half, 0.5 + 0.5 servings) and entrees, see summed macros and the combo
  price, and "Add to Today" logs one entry like "Plate: Chow Mein + Orange Chicken + Broccoli Beef".
  Fixed-content combos show their description and "Contents coming soon" (filled in by the next PR).
- Shared: `sumMacros` (unknown stays null) and `isBuildYourOwnCombo` (now also used by the
  recommender instead of its own copy).

## Testing
- Unit tests: mealLogFromItem (single location, several locations, unpriced item, null macros),
  default location, combo log name and macro sums (half-and-half, doubled entree, unknown macro),
  the hook's error path (submitMealLog), sumMacros, isBuildYourOwnCombo.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
- No schema change.
```

### sprint4/fixed-combos (base: sprint4/explore-add-meal)

- `6ba44bd` Add combo contents data and import
- `e7cd578` Include fixed-content combos in recommendations
- (this file) Add Sprint 4 notes

**PR title:** Fixed-content combos in the optimizer (Sprint 4 issue 1)

**PR description:**

```
## What
- `data/combo_contents.json`, keyed by combo source_id: "source", "verified" and "components"
  (fixed parts `{ meal, servings }` or slots `{ slot: side|drink, choices, default }`, plus optional
  "notes"). All 38 fixed-content combos have an entry; 11 are verified:
  - Panda #1, #2, #3, #5 (Fried Rice 0.5 + Chow Mein 0.5 + the two listed entrees) and #6 (White
    Steamed Rice 0.5 + Super Greens 0.5 + Teriyaki Chicken x2), from the menu_combos.csv rows.
  - Chick-fil-A Chicken, Deluxe, Spicy, Spicy Deluxe, Grilled and Grilled Club Sandwich Meals:
    matching entree + side slot (default Waffle Potato Fries (Medium)) + drink slot (default
    Sweetened Iced Tea (Medium)).
  - Unverified (never recommended): Panda #4 (only one entree listed), all 10 Taco Bell combos,
    the two nugget meals (size not in the name), the lunch Chicken and Waffles Sandwich Meal (no
    matching entree row) and the 13 breakfast meals (side/drink not verified). See DATA_TODO.
- Import: new filter stage `toComboContents` / `applyComboContents` validates the file (every meal id
  exists, servings > 0, defaults are among the choices, every combo row has an entry or is
  build-your-own) and stores it in the new `menu_combos.contents` jsonb column, with meals.id instead
  of source ids. The import stops on any problem. Re-running upserts, so nothing is duplicated.
- Shared: `ComboContents` on `MenuCombo`; `comboParts` and `comboNutrition(combo, items, slotPicks?)`
  sum the fixed parts and the chosen (or default) slot items; a macro is null if any part's is.
- Optimizer: binary w_m per eligible fixed combo and s_{m,j} per slot choice (sum_j s_{m,j} = w_m per
  slot). Nutrition and cost include them; the slot choice is included in the combo price. A fixed
  combo counts as one main and one item, at most one combo of any kind per meal, and a Chick-fil-A
  meal's side and drink slots use up the one side and one drink. Eligibility is the same as for other
  items: location open (or unknown hours), combo and every part served now, isMealAllowed for every
  fixed part and slot choice, verified contents only. A slot choice that fails the filters is dropped;
  a slot with no choice left drops the combo. Combos and choices are sorted by id first.
- Response: the combo name plus every fixed part and slot pick as items "in combo" with quantities
  (0.5 for a half base), so RecommendationDetailPage and its allergen union work unchanged.
  `RecommendationItem.combo_part` can now also be "side" or "drink".
- Explore combo view: verified fixed combos list their contents, let the user change a slot choice
  (when it has more than one), and show the summed macros; unverified ones say "Contents unverified"
  and log with nutrition unavailable.
- CONTEXT.md "Recommendation algorithm" updated.

## Deploy order
Run `packages/express-backend/supabase/migrations/20261106000000_combo_contents.sql` in the Supabase
SQL editor before deploying this backend (GET /api/menu now selects `contents` and fails until the
column exists). Then run `npm run import:menu` from packages/express-backend.

## Testing
- Pipeline: valid contents, every validation error, a fixed combo with no entry, re-running the load
  (no duplicates, ids mapped to meals.id), and the real data file (no problems, 38 entries, the 11
  verified ones).
- Shared: comboNutrition with default and picked slots, unknown macros, missing parts, half servings.
- Optimizer (same mocks as the existing tests, real HiGHS): exact LP text for a fixed combo; a
  Chick-fil-A meal is picked with its slots filled; the meal is used because it is cheaper than the
  same items bought separately; an allergen in a fixed part never lets the combo through; an excluded
  slot choice is replaced by another, and a slot with none left drops the combo; unverified Taco Bell
  and #4 combos are never picked even when they'd be a perfect fit; a fixed Panda plate lists its half
  bases and doubled entree; role limits, budget and determinism.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
```

## 2. Decisions I made on my own

**Git**
- `git config` gives `aababel` / `113000924+aababel@users.noreply.github.com`, the same identity as
  Sprint 3, so I committed with it unchanged. The git-ignored local settings file already had the
  attribution settings, and `git check-ignore` confirms it is ignored.
- I ran `git pull` on main as the task said (it only fetched; main was already up to date). Nothing
  was pushed and no PRs or issues were opened.
- After the last code commit I spotted that the combo page showed "—" for an unknown macro after the
  combo was fully chosen. I changed it to "unavailable" and amended that local commit (`e7cd578`).

**Task A**
- No React test renderer is installed, so the hook's error path is tested through `submitMealLog`,
  the pure function the hook calls.
- "Adding…" on the dashboard now ends once the log is saved, a moment before the dashboard finishes
  reloading. Before, it stayed on during the reload.
- After "Add to Today", the meal details page stays open (toast only) and the combo view goes back to
  Explore.
- The location picker defaults to the first location serving the item now, then one with unknown
  hours, then the first one. Each option shows its price (or "price unavailable") and "not served now"
  if that applies.
- Quick-add also applies to unpriced items with a single restaurant location (e.g. a Panda entree on
  its own): it logs without a price and the toast says "Price unavailable, not counted toward
  spending".
- A combo is logged at its restaurant's best location (first by availability).
- Combo log names list the parts in the order picked (base first). The same entree picked twice is
  "2× Orange Chicken". Half-and-half bases are listed by name ("Plate: Chow Mein + Fried Rice + ...").
- The picker needs a base and every entree before "Add to Today" is enabled. The second base is
  optional ("half and half"), and the same entree can be picked more than once.
- In Task A, fixed combos could already be logged by name and price with nutrition unavailable, so
  people can log what they ate.
- Unknown macros on the combo page show "unavailable" (and "—" before the combo is fully chosen). The
  existing details page still uses "—"; I left that as it was.

**Task B data**
- Contents name meals by menu_items id in the file. The load stage stores meals.id instead, so the app
  and the optimizer match `MenuItem.id` directly.
- Name matches: "Orange Chicken" = The Original Orange Chicken; "Teriyaki Chicken" (#3, #6) = Grilled
  Teriyaki Chicken (the only teriyaki row); #6 "Super Greens" as a base = Super Greens (as base),
  "double" = 2 servings; "Spicy Chicken Deluxe Sandwich Meal" = Spicy Deluxe Sandwich.
- Panda #4 lists the parts we do know (half Fried Rice, half Chow Mein, Orange Chicken) but is
  unverified.
- **The default drink is Sweetened Iced Tea (Medium).** You asked for "a medium drink"; I picked it
  because its name says medium and it's the cheapest priced medium drink ($2.89), so it's the least
  likely to cost extra. No side or drink substitutions are listed (none could be verified), so every
  slot has only its default for now.
- **Nugget meals are unverified as a whole**, not just the size. If the size is a guess, the
  nutrition is a guess, and "never invent data" says not to recommend it. The 8 ct rows are in the
  file as placeholders. Chick-n-Minis uses the 4 ct (the CSV note says Grubhub only sells the 4 ct),
  but it's a breakfast meal, so it's unverified anyway (next point).
- **Breakfast meals don't get Waffle Potato Fries.** I couldn't confirm that fries are offered at
  breakfast, so the 13 breakfast meals use Hash Brown and the medium tea as placeholders and are
  unverified. That means they're never recommended yet. This goes against your literal "side default
  = Waffle Potato Fries" so I'm flagging it. Their serving windows are unchanged.
- The lunch "Chicken and Waffles Sandwich Meal" has no matching lunch entree row (only the breakfast
  sandwich, which Grubhub prices differently), so it's unverified with only its slots listed.
- Taco Bell combos have `"components": []`.
- Entries can have an optional `"notes"` field explaining why they're unverified. Explore shows it
  under "Contents unverified".
- Validation also rejects an entry for a build-your-own combo, a verified entry with no components,
  and a combo with two slots of the same kind. Any problem stops the import (same as meal roles), since
  bad contents would put wrong nutrition on a combo.

**Task B optimizer**
- `RecommendationItem.combo_part` can now be "side" or "drink" for slot picks. A Chick-fil-A meal's
  entree is "entree"; Panda parts keep "base"/"entree" from the item. Fixed-part quantities can be 0.5.
- Each fixed part's own serving window must be open too, not just the combo's. For the current data
  they always match.
- A fixed combo can still be paired with one more standalone main (max 2 mains). A fixed Panda plate,
  which has no slots, can also get a side and a drink.
- Fixed Panda plates rarely win. The build-your-own Plate is the same $11.30 and can pick the same
  entrees, so a numbered plate only adds the half-and-half base option. Chick-fil-A meals do win when
  they fit (see section 6).
- Explore only shows a slot dropdown when a slot has more than one choice. Right now none do, so the
  side and drink are listed as text.
- If a verified combo's part is missing from the loaded menu, the combo view logs it without
  nutrition instead of guessing.

## 3. Manual steps for you

1. **Supabase SQL editor**, in this order. Skip any you already ran in Sprint 3:
   1. `packages/express-backend/supabase/migrations/20261030000000_meal_allergens_verified.sql`
   2. `packages/express-backend/supabase/migrations/20261031000000_item_serving_windows.sql`
   3. `packages/express-backend/supabase/migrations/20261101000000_meal_roles.sql`
   4. **New:** `packages/express-backend/supabase/migrations/20261106000000_combo_contents.sql`
      (adds `menu_combos.contents`). Run it before deploying sprint4/fixed-combos, because
      GET /api/menu selects the column. sprint4/explore-add-meal needs no migration.
2. **Re-import** from `packages/express-backend`: `npm run import:menu -- --dry-run` (it should say
   "38 with fixed contents (11 verified)"), then `npm run import:menu`. Until it runs, fixed combos
   have no contents, so they aren't recommended and Explore shows "Contents unverified".
3. **New in data/DATA_TODO.md** (section "Combo contents"):
   - Panda #4 Plate: second entree.
   - Taco Bell combos (all 10): the food items, the included drink and its size. Add Taco Bell drink
     rows to menu_items.csv first.
   - Chick-fil-A Nuggets Meal and Grilled Nuggets Meal: nugget count (8 ct is a placeholder).
   - Chick-fil-A Chicken and Waffles Sandwich Meal (lunch): the entree row is missing.
   - Chick-fil-A breakfast meals (13): which side and drink they include.
   - CFA meal side/drink substitutions: which other sides and drinks are free, to add to `choices`.
4. Click through the list in section 5 while signed in. I couldn't sign in from here, so the UI is only
   covered by the unit tests on its helpers plus build/lint/typecheck.

## 4. WIP or failing

Nothing is failing and there are no WIP commits. Known gaps (data, not bugs):
- 27 of the 38 fixed combos are unverified (see DATA_TODO).
- Every Chick-fil-A slot has only its default choice.
- Waffle Potato Fries and Sweetened Iced Tea have unverified allergens. So for anyone with an
  allergen, No seafood or Halal-friendly set, no Chick-fil-A meal can be recommended until those two
  rows (or other verified choices) are filled in. That's the existing safe default, working as
  intended.

## 5. Click-through test list

Explore, Add to Today:
1. Explore: every meal card has a "+" button. Tap "+" on a Chick-fil-A sandwich: toast "Added to
   today". Open the dashboard: the log is there, and calories, protein and spending went up.
2. Tap "+" on a Subway item sold at both Subways: the details page opens instead. The location picker
   shows both locations with prices and defaults to an open one. Pick the other one, tap Add to Today:
   "Adding…", then "Added to today". The dashboard shows that location's price.
3. Open an unpriced item (e.g. Chick-fil-A Sauce or a Panda entree): it says "Price unavailable, not
   counted toward spending". Add it. On the dashboard, spending doesn't change and unknown macros
   don't show as 0.
4. Details page: "Save meal" still toggles the bookmark. "Not interested" is gone; Back works.
5. With Open now off after 10:30, add a breakfast item (e.g. Spicy Chicken Biscuit). It's still
   logged and still labeled "Breakfast · until 10:30 am".
6. MealCard on Dashboard and Saved has no "+".
7. Turn off the network or stop the API and tap Add: an error shows and the button comes back.

Combos & Meals:
8. Tap "Plate": choose Chow Mein, Orange Chicken and Broccoli Beef. Add to Today stays disabled until
   the base and both entrees are picked. Totals show 1270 cal / 50 g protein / 166 g carbs / 44 g fat
   at $11.30. Add it: the dashboard shows "Plate: Chow Mein + Orange Chicken + Broccoli Beef".
9. Plate with a half-and-half base (Chow Mein + Fried Rice): the base macros are halved.
10. Tap "#1 Plate" (after the migration and import): it lists ½ Fried Rice, ½ Chow Mein, The Original
    Orange Chicken and Broccoli Beef, with totals, and logs with nutrition.
11. Tap "Chick-fil-A Deluxe Sandwich Meal": entree, "Side: Waffle Potato Fries (Medium)", "Drink:
    Sweetened Iced Tea (Medium)", 1030 cal / 37 g / 119 g / 45 g, $12.45.
12. Tap a Taco Bell combo, "#4 Plate" or "Chick-fil-A Nuggets Meal": "Contents unverified" plus the
    reason. Add to Today logs the name and price with nutrition unavailable.

New combo recommendations:
13. Profile goals 2000 cal / 75 g protein / 240 g carbs / 90 g fat, a $25 daily target, no
    allergens, no logs, weekday around 13:00: the top pick under "What should I eat next?" is
    Chick-fil-A "Chick-fil-A Deluxe Sandwich Meal: Chick-fil-A Deluxe Sandwich + Waffle Potato Fries
    (Medium) +1 more", $12.45, Macro Match 99. That's cheaper than the $13.73 for the same three items
    bought separately.
14. Open that recommendation: the three items show "in combo", the combo line says "Chick-fil-A
    Deluxe Sandwich Meal combo, $12.45", and allergens are "Allergen info incomplete" plus "Contains
    at least: Milk, Egg, Soy, Wheat, Sesame" (fries and tea are unverified). Add to Today logs it at
    $12.45.
15. Set any allergen in Profile (e.g. Milk): no Chick-fil-A meal is recommended. The fries and tea
    have unverified allergen info, and with an allergen set, unverified items are excluded, so each
    meal's side and drink slots are left with no choices.
16. Taco Bell combos and the unverified Chick-fil-A meals never appear in recommendations.

## 6. Sample run vs. Sprint 3

Same inputs as the Sprint 3 sample: 2000 cal / 150 g protein / 200 g carbs / 65 g fat, no meals
logged, 2 meals left, $25, Wednesday Nov 4 13:00. Real data files run through the import pipeline and
the real solver. Per-meal targets: 1000 cal / 75 g protein / 100 g carbs / 32.5 g fat.

| # | Sprint 4 (with fixed combos) | Sprint 3 |
|---|---|---|
| 1 | Chick-fil-A (1901 Marketplace), $22.66, Macro Match 98: Deluxe Sandwich + Grilled Nuggets (8 ct) + Berry Parfait with Cookie Crumbs + 1% Chocolate Milk | same |
| 2 | Subway (Poly Canyon Village), $21.57, Macro Match 93: Honey Mustard Chicken + Sweet Onion Chicken Teriyaki + Chicken Noodle Soup | same |
| 3 | Subway (Kennedy Library), $17.98, Macro Match 92: Chipotle Philly + Sweet Onion Chicken Teriyaki | same |

Fourth is Panda Express, $11.30, Macro Match 91: a build-your-own Plate of Grilled Teriyaki Chicken
+ Kung Pao Chicken + Chow Mein. Taco Bell is skipped (closed until 16:00).

No change in the top 3. This user needs 75 g of protein per meal, and the best Chick-fil-A meal
(Deluxe Sandwich Meal, 37 g protein, 45 g fat) is far from that, so the optimizer still builds the
meal from separate items. Running the same inputs with fixed combos switched off gives exactly the
same list. For a lower-protein profile (2000 / 75 / 240 / 90), Chick-fil-A's top pick becomes the Deluxe
Sandwich Meal at $12.45 (Macro Match 99), as in step 13 above.
