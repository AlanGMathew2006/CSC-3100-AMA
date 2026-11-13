# Sprint 4 part 2 notes (#51, #52, #53)

Three stacked branches, all local (nothing pushed, no PRs opened). **Merge in order:**
`sprint4/allergen-tags` into main, then `sprint4/prices-serving-times`, then
`sprint4/recommendations-ui-polish`. Each PR targets the branch before it; after one merges,
retarget the next to `main`.

Before every commit these all passed: `npm run build`, `npm run lint`, `npm test`,
`npm run typecheck --workspace=packages/express-backend`, and `npm run import:menu -- --dry-run`.
`npm run test:e2e` (apps/web) also passed for the last branch (6 runs: 3 tests x phone/desktop).

Main was green before I started (build, lint, test, typecheck, import dry run), so nothing had to be
fixed first.

## 1. Branches, commits and PRs

### sprint4/allergen-tags (base: main)

- `70616ad` Verify allergens and dietary tags for Taco Bell, Subway and Chick-fil-A

**PR title:** Verify allergens and dietary tags (Taco Bell, Subway, Chick-fil-A)

**PR description:**

```
Part of #51 (Panda Express and the Subway subs come in a follow-up PR, see "Left for a follow-up")

## What
Verified allergens go from 33 to 120 of 192 items, each with its source in allergen_source.

- Taco Bell: 32 of 36, from the official allergen tool on tacobell.com/nutrition/allergen-info
  (embedded from nutritionix.com/taco-bell/menu/special-diets/premium). Items matched by protein and
  build (beef/chicken/steak, Supreme or not, sauce packets). Default proteins checked on the
  tacobell.com product pages (e.g. Nachos BellGrande = seasoned beef, 730 cal, same as our row).
  Vegetarian tag on the 14 items marked "(V)" (AVA certified), which also have hasAVA on their
  product pages. No gluten_free tags: Taco Bell says it doesn't claim gluten-free for any item.
  Still unverified: Creamy Jalapeño Sauce, Reduced-Fat Sour Cream, Chips & Guacamole, Side of
  Nacho Cheese (not listed on their own).
- Subway: 12 of 58, from the October 2026 US allergen chart. Breakfast subs use the build the
  October 2026 nutrition guide states ("6" Artisan Italian, egg and American cheese" + the meat);
  soups and cookies come straight from the chart. "May contain", refined-oil-only and the cookies'
  nut cross-contact marks are not counted as "contains". contains_pork on the bacon and ham
  breakfast subs and the Loaded Baked Potato soup ("with Bacon" in the nutrition guide). The 6-inch
  and footlong subs stay unverified: the nutrition guide doesn't say which bread/cheese/sauce each
  one uses.
- Chick-fil-A: 43 more (76 of 78), from the Allergens table on chick-fil-a.com/nutrition-allergens,
  including Waffle Potato Fries (Medium) and Sweetened Iced Tea (Medium), the two items that
  blocked every Chick-fil-A meal for anyone with an allergen set. Still unverified: Iced Coffee
  (the table contradicts itself) and Cold Brew Iced Coffee (no matching entry).
- Panda Express: still 0 of 20. pandaexpress.com and its ordering API return 403 with a captcha
  page to scripts; only third-party copies of the PDF exist, which don't count.
- New scripts/menu-import/menu-data.test.ts on the real CSV: allowed tokens, a source on every
  verified row, tags only on verified rows, no vegan + milk/egg, no gluten_free + wheat, no
  vegetarian + contains_pork, and the per-chain counts.
- DATA_TODO: allergen section rewritten with what's verified, the sources used, and what's left
  (with what was tried).

## Left for a follow-up PR
- Panda Express: 0 of 20 verified. Needs the allergen PDF from pandaexpress.com, opened in a normal
  browser.
- Subway: the 46 regular subs (27 six-inch, 15 footlong, 4 Fresh Fit). Needs each sub's default
  bread/cheese/sauce from its subway.com page, then the union of those rows in the allergen chart.
- Also still open: Chick-fil-A Iced Coffee and Cold Brew Iced Coffee; Taco Bell Creamy Jalapeño
  Sauce, Reduced-Fat Sour Cream, Chips & Guacamole and Side of Nacho Cheese.
  data/DATA_TODO.md lists each one with what was tried.

## Effect on recommendations
Same sample inputs as Sprint 4 (Wed Nov 4, 2 meals left, $25):
- No allergens: no change.
- Milk, 2000/75/240/90: Chick-fil-A goes from 2x Grilled Chicken Sandwich + Kale Crunch Side
  (Macro Match 74) to Grilled Chicken Sandwich + Waffle Potato Fries + Simply Orange Juice (91).
- Evening (Taco Bell open), Soy: Taco Bell now gets a recommendation (2x Black Bean Crunchwrap
  Supreme + Chips & Nacho Cheese); before, every Taco Bell item was unverified.

## Testing
- menu-data.test.ts (6 tests) plus the existing pipeline tests (verified count updated to 120).
- npm run build, lint, test, backend typecheck and the import dry run all pass.
- No schema change.
```

### sprint4/prices-serving-times (base: sprint4/allergen-tags)

- `8bb1065` Add a fill-in sheet for missing prices, serving times and combo contents

**PR title:** Fill-in sheet for prices, serving times and combo contents; "Free with a meal"

**PR description:**

```
Part of #52 (the Grubhub values come in a follow-up PR, filled in through data/manual_fill_in.csv)

## What
No missing price, serving time or combo content could be verified without logging in to the
Grubhub campus app, so this makes the manual pass as quick as possible.

- data/manual_fill_in.csv: one row per missing value (97): 36 prices, 3 serving windows (Subway
  breakfast cutoff, campus Chick-fil-A breakfast cutoff, Mini Yeast Rolls), and 58 combo rows
  (Panda #4's second entree, the 10 Taco Bell combos, the nugget counts, the lunch Chicken and
  Waffles entree, the 13 breakfast meals' side and drink, and the no-charge side/drink choices for
  the lunch meals). Each row has the current note and blank value/source columns.
- npm run apply:fill-in [-- --dry-run] (root or packages/express-backend): pipe and filter like the
  import (scripts/fill-in/fill-in.ts). Validates every filled row (price > 0 with two decimals or
  "none", HH:MM-HH:MM or "all day", known ids, source required), merges into menu_items.csv,
  serving_windows.json and combo_contents.json, runs the import's own validation stages on the
  result, and removes the applied rows from the sheet. All or nothing. A combo is marked verified
  once none of its blocking rows are left (the "_choices" rows only add options).
- free_with_meal: new CSV column, meals column (migration 20261113000000_meal_free_with_meal.sql,
  schema.sql updated) and MenuItem field, set on the 12 sauces + fortune cookie whose note says
  "Free with entrees." / "Usually free with a meal.". They keep a blank price (the import rejects
  $0), Explore and meal details say "Free with a meal" instead of "Price unavailable", logging one
  says "Free with a meal, not counted toward spending", and the recommender never picks them on
  their own, even if a price is added later.
- DATA_TODO points at the sheet and the command, with the value format for each kind of row.
- CONTEXT.md: recommendation rule for free_with_meal.

## Follow-up PR
The 36 prices, 3 serving times and 58 combo-contents values need the logged-in Grubhub campus app.
They'll be typed into data/manual_fill_in.csv and applied with npm run apply:fill-in in a follow-up
PR, which will close #52.

## Deploy order
Run packages/express-backend/supabase/migrations/20261113000000_meal_free_with_meal.sql in the
Supabase SQL editor before deploying this backend (GET /api/menu selects free_with_meal), then
npm run import:menu from packages/express-backend.

## Testing
- fill-in.test.ts (12 tests): CSV round trip of the real files, value parsing, every validation
  error, each kind of merge, verification only when no blocking row is left, inputs not mutated,
  the real sheet is valid and covers every unpriced item and unverified combo, and filling real rows
  gives files that pass the import's checks.
- Pipeline: free_with_meal parsing ($0 rejected, note required) and the real count (12).
- Optimizer: a priced, perfectly fitting free_with_meal item is never picked; the same item without
  the flag is.
- Web: priceText / unpricedLogNote.
- npm run build, lint, test, backend typecheck and the import dry run all pass.
```

### sprint4/recommendations-ui-polish (base: sprint4/prices-serving-times)

- `20b9311` Add UI tests for recommendations and meal logging, and polish the UI
- `ca6fec2` Add Sprint 4 part 2 notes
- (latest) Update Sprint 4 part 2 PR notes

**PR title:** UI tests and polish for recommendations, meal details and combos

**PR description:**

```
Closes #53

## Tests
- The web workspace now uses Vitest with jsdom (npm test runs it). The existing unit tests only
  changed their import from node:test to vitest. Page tests mock the API layer
  (vi.mock("../../lib/api")); mock data is in src/test/fixtures.ts.
- DashboardPage: loading, error + Retry, empty result with a next step, the list with Macro Match,
  menu failing, Add to Today. RecommendationDetailPage: "in combo", combo price line, ½ servings,
  "each" prices, allergen "incomplete" vs complete, Add to Today success and error. MealDetailPage:
  Add to Today, location picker, unpriced and free notes, "unavailable" nutrition, error. MenuPage:
  "+" quick add (one location, two locations, free sauce, failure), unavailable/rounded card values,
  opening a combo. ComboDetailPage: build-your-own enable/disable, half-and-half, rounding, verified
  vs unverified fixed combos, error.
- npm run test:e2e (apps/web): Playwright smoke test of the SPRINT4_NOTES section 5 list against the
  dev server, with a fake session in localStorage and the API stubbed by route interception; every
  other request is blocked. Runs at 390x844 and 1280x800 and saves screenshots to
  test-results/screenshots (git-ignored). Not part of npm test. First run:
  npx playwright install chromium.

## Fixes (each has a test)
- Dashboard recommendations disappeared when the menu failed to load (and only showed once both had
  loaded). They now show from the recommendation alone.
- Half servings in a recommended plate (#1 Plate's half Fried Rice / Chow Mein) showed no "½".
- Add to Today errors were shown at the top of the page, out of view of the button; quick-add
  errors on Explore could be scrolled away entirely.

## Polish
- Unknown values say "unavailable" everywhere (meal details, cards, combo totals), never "—" or 0;
  calories and grams are whole numbers everywhere (lib/format.ts).
- Panda bases/entrees say "Combo only" instead of "Price unavailable".
- Dashboard: an "Includes: ..." line lists every item when the card title is cut to "+N more"; empty
  results get a button ("Adjust your filters" / "Browse all meals"); nutrients without a goal say
  "no goal" instead of "/ —g".
- Recommendation detail: a combo's heading is the combo name (its parts are listed below); item
  lines wrap instead of being cut off; "Loading nutrition…" while the menu loads.
- Meal details: "Free with a meal" / "Price unavailable" in a smaller size where the price goes.
- Visible keyboard focus on buttons, selects and the Explore search; card titles get two lines;
  long headings wrap.
- CONTEXT.md (test setup, display conventions) and SPRINT4_NOTES section 5 updated.

## Testing
- 76 web tests, 79 backend tests, 49 shared tests; 6 e2e runs.
- npm run build, lint, test, backend typecheck and the import dry run all pass. npm ci works with
  the updated lockfile.
- No schema change.
```

## Team setup after merge

After these PRs are merged into main, everyone should:

1. Supabase SQL editor (once per project, in this order; skip any already run):
   1. `packages/express-backend/supabase/migrations/20261106000000_combo_contents.sql`
   2. `packages/express-backend/supabase/migrations/20261113000000_meal_free_with_meal.sql`
2. `npm install` from the repo root (new dev dependencies: Vitest, jsdom, Testing Library,
   Playwright).
3. `npm run import:menu` in `packages/express-backend` (loads the verified allergens, tags and
   free_with_meal; `-- --dry-run` first to check).
4. Web tests now run on Vitest: `npm test` works as before (tests import `describe`/`it` from
   `vitest`, not `node:test`). `npm run test:e2e` in `apps/web` needs
   `npx playwright install chromium` once per machine.

## 2. What's done per issue

**#51 allergens and tags**

| Chain | Verified before | Verified after | Left |
|---|---|---|---|
| Chick-fil-A | 33 / 78 | 76 / 78 | Iced Coffee, Cold Brew Iced Coffee |
| Taco Bell | 0 / 36 | 32 / 36 | 2 sauces, Chips & Guacamole, Side of Nacho Cheese |
| Subway | 0 / 58 | 12 / 58 | 27 six-inch subs, 15 footlongs, 4 Fresh Fit (46) |
| Panda Express | 0 / 20 | 0 / 20 | all (site blocked) |
| **Total** | **33 / 192** | **120 / 192** | 72 |

Tags: vegetarian 0 -> 14 (Taco Bell), contains_pork 5 -> 8. No vegan or gluten_free tags (no chain
claims them for these items).

**#52 prices and serving times**

- Prices filled: 0 of 36 (none is on a public page). Fill-in rows: 97 (36 prices, 3 serving windows,
  58 combo rows).
- Free-with-a-meal items marked: 12.
- Serving times: none confirmed. The campus Chick-fil-A page lists "Breakfast" but no cutoff, so
  10:30 stays as the chain-wide default.

**#53 UI**

- 36 new web DOM tests (76 total in apps/web), 3 bug fixes, the polish list above, a 3-test smoke
  test at two sizes.

**Allergen sample run (step 8 of #51).** Real data through the import pipeline and real solver,
Wednesday Nov 4, 2 meals left, $25 target:

| Inputs | Before (main) | After |
|---|---|---|
| 13:00, 2000/150/200/65, no allergens | unchanged (CFA $22.66 MM 98, Subway, Subway, Panda) | same |
| 13:00, 2000/75/240/90, no allergens | CFA Deluxe Sandwich Meal $12.45 MM 99 | same |
| 13:00, 2000/150/200/65, Milk | CFA 2x Grilled Chicken Sandwich + Kale Crunch Side, MM 92 | same |
| 13:00, 2000/75/240/90, Milk | CFA 2x Grilled Chicken Sandwich + Kale Crunch Side, MM 74 | CFA Grilled Chicken Sandwich + Waffle Potato Fries + Simply Orange Juice, MM 91 |
| 19:00, 2000/150/200/65, Milk | CFA same, MM 48 | CFA 2x Grilled Chicken Sandwich + Fries + Lemonade, MM 71 |
| 19:00, 2000/150/200/65, Soy | CFA only, MM 60 | CFA MM 74, plus Taco Bell 2x Black Bean Crunchwrap Supreme + Chips & Nacho Cheese, MM 61 |

With Milk set, Panda (unverified) and Subway (no verified priced main) are still skipped, and every
Taco Bell main contains milk. The Grilled Chicken Sandwich Meal is now eligible for Milk users, but
the optimizer prefers the items separately in these runs.

## 3. Decisions I made on my own

**Git**
- `git config` gives `aababel` / `113000924+aababel@users.noreply.github.com`, same identity as
  before, so I committed with it unchanged. The git-ignored local settings file already had the
  attribution settings; `git check-ignore` prints its path.
- Nothing was pushed; no PRs or issues opened. `git pull` on main only fetched (already up to date).
- Task C is one code commit, not two: the converted unit-test files also hold new tests for the
  polish, so a clean split would have needed hunk-level staging.

**Skipped because already done:** nothing. DATA_TODO matched the data exactly; no teammate had
started any of these items.

**Allergens (#51)**
- Taco Bell's allergen page embeds a Nutritionix tool. Since that is the official page's own data, I
  used it and cite both URLs. Its table marks each allergen "contains" or "does not contain"; there
  were no "not analyzed" marks on our items.
- "(V)" in that tool, plus hasAVA on the product page, counts as Taco Bell saying "vegetarian".
- Chick-fil-A's table has no shellfish column. The 33 rows verified in Sprint 3 came from item pages
  with the same coverage, so I treated it the same way.
- Subway: "x" (may contain), "*" (refined oil only, FDA-exempt) and "**" (cookies may touch nut
  cookies on display) are not "contains". Breakfast egg = "Egg Omelet Patty (Regular)" in the chart
  (both egg rows list egg + soy, so the result is the same either way).
- Matching: Nachos BellGrande = the beef version (default protein and 730 cal match); Chips & Nacho
  Cheese = "Chips and Nacho Cheese Sauce"; sauce rows = the "Packet" entries; Chick-fil-A Hash Brown
  Scramble Bowl = the default "w/ Nuggets" (470 / 29 / 30 matches); Float = Dr Pepper Float (320 / 7 /
  7 matches); Waffle Potato Chips = Original (both flavors list nothing); Pineapple Dragonfruit Iced
  Tea and Sunjoy = all versions list nothing, so the sweet/unsweet choice doesn't matter.
- Left unverified rather than guessing: Chick-fil-A Iced Coffee (our row matches an entry with no
  allergens but 7 g protein, while the other iced coffees list milk), and the 6-inch/footlong
  Subway subs (no build in the nutrition guide, as you asked).
- The pipeline rejects tags on unverified rows, so I didn't add contains_pork to the unverified
  B.L.T., ham, pepperoni and salami subs or vegetarian to Chips & Guacamole. They're listed in
  DATA_TODO so whoever verifies those rows adds them.

**Prices and serving times (#52)**
- "Free with a meal" is a boolean column `free_with_meal` (CSV + migration), not a note convention:
  notes are free text, and a flag is easy to validate and test. Never $0. If Grubhub does sell a
  sauce separately, a price can be filled in and it's still never recommended on its own.
- Fill-in rows for Chick-fil-A meals: breakfast meals get blocking side/drink rows; lunch meals get
  non-blocking "_choices" rows, so filling extra options never un-verifies a meal and leaving them
  blank doesn't block anything.
- Fill-in serving windows apply to every day (combined with store hours). A restaurant rule row
  (`rule:Chick-fil-A:Breakfast`) also updates that restaurant's combo rule with the same label, so
  the breakfast meals follow the breakfast items.
- Applied rows are removed from the sheet, so it always shows what's left and re-running is safe.
- The apply step writes files only. You still run the import, so you can check the dry run first.

**UI (#53)**
- Vitest instead of node:test + jsdom: the pages import `lib/api.ts`, which reads `import.meta.env`,
  so they can't load outside Vite. Vitest also gives `vi.mock` for the API layer. Vitest 5.0.5
  (needed for Vite 8). npm 10.9.2 crashed resolving Vitest's optional peers, so it was installed
  once with `--legacy-peer-deps`; `npm install` and `npm ci` from the lockfile work normally.
- The e2e test runs Vite with fake `VITE_*` values (they override apps/web/.env.local) and blocks
  every request that isn't to the dev server, so it can't reach the real Supabase project or API.
- MealCard (Max's) changed only in the price and macro text (priceText, "unavailable", rounding).
  BottomNav and BrandHeader weren't touched.
- The combo view still shows "—" for totals before a Plate is fully picked; the line below explains
  what to pick, so it isn't an unknown value.

**Things that went wrong and were fixed**
- While testing `npm run apply:fill-in -- --dry-run` from the repo root, npm didn't pass
  `--dry-run` through to the workspace script, so one test row was written. I restored that row
  (checked cell by cell against the committed CSV) and fixed the root script (it now ends with
  `--`); the dry run was then re-tested and writes nothing.
- Twice my editing tools turned the `﻿` escape into a literal BOM character; lint caught it and
  I restored the escape.

**Noticed, not changed**
- chick-fil-a.com shows the campus store opening at 11:00 on Wednesday this week (Nov 11 is
  Veterans Day). dining_hours.json has regular-week hours, so I left it.
- The toast always shows a check icon, even for "Couldn't ..." messages.
- MacroMatch shows calories without a unit ("1030 / 1000").

## 4. Manual steps for you

1. **Supabase SQL editor**: run
   `packages/express-backend/supabase/migrations/20261113000000_meal_free_with_meal.sql`
   (after any earlier migrations you haven't run yet, see SPRINT4_NOTES section 3). Do it before
   deploying the backend from the prices branch, since GET /api/menu selects the new column.
2. From `packages/express-backend`: `npm run import:menu -- --dry-run`, then `npm run import:menu`
   (loads the 120 verified allergens, tags and free_with_meal).
3. **Grubhub pass** (data/manual_fill_in.csv, 97 rows):
   - Open the Grubhub campus app. For each row, type the answer in `value` and where it came from in
     `source`, e.g. `Grubhub campus app, 2026-11-20`. DATA_TODO has the format for each kind of row
     (price `9.15` or `none`, window `00:00-10:30` or `all day`, combo ids like
     `taco-bell--crunchy-taco x3; drink=<id>`).
   - Before the Taco Bell combo rows: add the Taco Bell drink(s) to menu_items.csv (with official
     nutrition). Before the lunch Chicken and Waffles meal row: add its entree row.
   - From the repo root: `npm run apply:fill-in -- --dry-run`, then `npm run apply:fill-in`, then
     step 2 again.
4. **Panda allergens**: open https://www.pandaexpress.com/nutritioninformation in a normal browser,
   download the allergen PDF, fill the 20 rows (see DATA_TODO), and update the counts in
   scripts/menu-import/menu-data.test.ts.
5. **Subway subs**: each sub's default bread/cheese/sauce from its subway.com page, then the union of
   those chart rows (see DATA_TODO).
6. First e2e run on a new machine: `cd apps/web && npx playwright install chromium`, then
   `npm run test:e2e`.

## 5. WIP, failures, and sources I couldn't reach

Nothing is WIP; every check passes on all three branches.

Sources I couldn't use (2026-11-13):
- pandaexpress.com (/nutritioninformation, /-/media PDF paths) and nomnom-prod-api.pandaexpress.com:
  HTTP 403 with a captcha page to scripts and headless browsers. I didn't try to get past it.
- subway.com pages (nutrition page, store menus): time out for scripts. The two Subway PDFs on
  media.subway.com did load.
- Grubhub: public pages are only the app shell; campus menus need the logged-in app.
- Dine On Campus (dineoncampus.com/calpoly) menu pages: the scripted fetch was declined in the
  permission prompt, so I didn't use the campus menu as a source this time. The location page
  (hours, description) loaded but lists no allergens or breakfast times.
- No official page gives the Subway breakfast cutoff, the campus Chick-fil-A breakfast cutoff or
  whether Mini Yeast Rolls are sold all day.

## 6. Click-through to do signed in

1. After the migration and import: Explore shows "Free with a meal" on Chick-fil-A Sauce and "Combo
   only" on a Panda entree; adding the sauce says "Added to today. Free with a meal, not counted
   toward spending." and spending doesn't change.
2. Dashboard: the top pick has an "Includes: ..." line; open it: the heading is the combo name,
   allergens say "Contains: Milk, Egg, Wheat, Soy, Sesame" with no "incomplete".
3. Set Milk in Profile: Chick-fil-A still gets a recommendation (Grilled Chicken Sandwich with
   fries); no Taco Bell main shows up. Clear it again.
4. Evening (Taco Bell open) with Soy set: a Taco Bell recommendation appears.
5. Recommendation detail for a #1 Plate (if one comes up, or via the dashboard on a low-protein
   profile): "½ Fried Rice", "½ Chow Mein".
6. Turn off the network and tap Add to Today on a meal page: the error shows under the buttons;
   tap "+" on Explore: the error shows in a toast.
7. Tab through Explore and a details page with the keyboard: the focus ring is visible.
8. A phone (or 390 px wide window): card titles wrap to two lines, long headings don't push the
   price off screen.
9. Explore -> Combos & Meals -> Plate: totals are whole numbers with a half-and-half base.
