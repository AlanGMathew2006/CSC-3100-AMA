# Data to fill in by hand

Values here could not be verified from an official source, so they are left blank in the data
files. Nothing in this list should be guessed. Fill it in, re-run `npm run import:menu`
from `packages/express-backend` (re-running is safe, it upserts), then tick the box.

Dining hours: done (`data/dining_hours.json`, regular-week hours collected 2026-10-30).
Re-check them at the start of each quarter and before breaks.

## Item serving windows (`data/serving_windows.json`)

- [ ] Subway breakfast cutoff (PCV and Kennedy Library). The cutoff varies by franchise and neither
  campus Subway lists one, so the 4 Subway "Breakfast" items have `"windows": "unknown"`. Explore
  shows "Serving time unknown" and they are never recommended. Ask each store or check the Grubhub
  campus app, then replace "unknown" in the Subway meal rule with the per-day windows (e.g. every day
  `{"open": "00:00", "close": "10:30"}`), a source, and a `verified` note. If the two stores differ,
  add overrides by `source_id`. Note that the import file matches meals by restaurant, not location.
- [ ] Confirm the Chick-fil-A breakfast cutoff at the campus store. 10:30 is the chain-wide time from
  chick-fil-a.com; the Cal Poly menu lists no breakfast times.
- [ ] Check Chick-fil-A "Mini Yeast Rolls (4 ct)". It is in the Breakfast category so it gets the
  breakfast window, but it may be sold all day. If so, add an override with `"windows": null`.

## Combo contents (`data/combo_contents.json`)

Each fixed-content combo has an entry keyed by its source_id. Only entries with `"verified": true`
are recommended or show nutrition in Explore; the rest show "Contents unverified" and can only be
logged without nutrition. After fixing an entry, set `"verified": true`, update `"source"`, re-run
`npm run import:menu -- --dry-run` (it checks every id) and then `npm run import:menu`.

- [ ] **Panda #4 Plate: second entree.** menu_combos.csv lists "Fried Rice + Chow Mein, Orange
  Chicken (as listed)" for a 2-entree plate. Check the Grubhub campus app and add the second entree.
- [ ] **Taco Bell combos (all 10): exact contents.** The CSV only says "Includes a drink; see Grubhub
  item details for exact contents". For each combo, check in the Grubhub campus app: which food
  items and how many (e.g. which 3 tacos, beef or chicken), and which drink is included and its
  size. There are no Taco Bell drinks in menu_items.csv yet, so add those rows (with official
  nutrition) first. Combos: 3 Crunchy Taco Combo, 3 Crunchy Taco Supreme Combo, Chicken Quesadilla
  Combo, 3 Soft Taco Combo, 3 Soft Taco Supreme Combo, 3 Doritos Locos Tacos Combo, 3 Doritos Locos
  Tacos Supreme Combo, Crunchwrap Supreme Combo, Burrito Supreme Combo, 2 Chicken Chalupas Supreme
  Combo.
- [ ] **Chick-fil-A Nuggets Meal and Grilled Nuggets Meal: nugget count.** The meal names don't give a
  size, so the 8 ct rows are used as placeholders (Grubhub lists one price for the item, assumed to
  be the 8 ct). Confirm the count in Grubhub.
- [ ] **Chick-fil-A Chicken and Waffles Sandwich Meal (lunch): entree.** menu_items.csv only has the
  breakfast Chicken and Waffles Sandwich, which Grubhub prices differently ($10.35 for the lunch
  version), so there is no matching lunch entree row. Add one (price + official nutrition), then
  reference it.
- [ ] **Chick-fil-A breakfast meals (13): side and drink.** Waffle Potato Fries may not be offered
  at breakfast, so these use Hash Brown and Sweetened Iced Tea (Medium) as placeholders and stay
  unverified. Check in Grubhub which side and drink (and size) a breakfast meal includes.
- [ ] **CFA meal side/drink substitutions.** Lunch meals list only the defaults (side: Waffle Potato
  Fries (Medium), drink: Sweetened Iced Tea (Medium)). Check in Grubhub which other sides and drinks
  can be chosen at no extra charge (and their sizes) and add them to each slot's `choices`.

## Missing prices (`price_usd` in `data/menu_items.csv`)

47 items have no `price_usd`. They import as meals with no offering, so the app shows
"Price unavailable" and the optimizer skips them (except Panda combo parts, below).

- **Combo-only**: sold only inside a Panda Bowl/Plate/Bigger Plate. These should stay blank;
  `menu_combos.csv` already has the combo prices.
- **Look up in Grubhub**: check the Cal Poly Grubhub campus app and fill in `price_usd` and
  `price_source`. If an item isn't sold on its own (e.g. a free sauce), leave it blank and add a note.

### Chick-fil-A (15)

Look up in Grubhub:

- [ ] Chick-fil-A Nuggets (12 ct) (note: Not priced on Grubhub.)
- [ ] Grilled Nuggets (12 ct) (note: Not priced on Grubhub.)
- [ ] Chicken, Egg & Cheese Biscuit (note: Not priced on Grubhub.)
- [ ] Waffle Potato Fries (Large) (note: Not priced on Grubhub.)
- [ ] Mac & Cheese (Small) (note: Not priced on Grubhub.)
- [ ] Mac & Cheese (Large) (note: Not priced on Grubhub. Large size not in the national nutrition guide; calories from campus menu.)
- [ ] Sweetened Iced Tea (Large) (note: Not priced on Grubhub.)
- [ ] Cold Brew Iced Coffee (note: Not priced on Grubhub. Not in the national nutrition guide; calories from campus menu.)
- [ ] Chick-fil-A Sauce (note: Free with entrees.)
- [ ] Polynesian Sauce (note: Free with entrees.)
- [ ] Honey Mustard Sauce (note: Free with entrees.)
- [ ] Garden Herb Ranch Sauce (note: Free with entrees.)
- [ ] Barbeque Sauce (note: Free with entrees.)
- [ ] Zesty Buffalo Sauce (note: Free with entrees.)
- [ ] Honey Roasted BBQ Sauce (note: Free with entrees.)

### Panda Express (17)

Combo-only (leave blank):

- [x] Chow Mein (base)
- [x] Fried Rice (base)
- [x] White Steamed Rice (base)
- [x] Super Greens (as base) (base)
- [x] The Original Orange Chicken (entree)
- [x] Grilled Teriyaki Chicken (entree)
- [x] Kung Pao Chicken (entree)
- [x] Beijing Beef (entree)
- [x] Broccoli Beef (entree)
- [x] Honey Walnut Shrimp (entree)
- [x] Super Greens (as entree) (entree)

Look up in Grubhub:

- [ ] Apple Pie Roll (note: Not in Panda's published nutrition guide; calories from campus menu.)
- [ ] Fortune Cookie (note: Usually free with a meal.)
- [ ] Sweet & Sour Sauce (note: Usually free with a meal.)
- [ ] Teriyaki Sauce (note: Usually free with a meal.)
- [ ] Chili Sauce (note: Usually free with a meal.)
- [ ] Soy Sauce (note: Usually free with a meal.)

### Taco Bell (15)

Look up in Grubhub:

- [ ] Burrito Supreme (Steak) (note: Campus menu lists steak version, 390 cal; macros from TB calculator with steak swapped for beef)
- [ ] Cheese Quesadilla
- [ ] Chicken Quesadilla
- [ ] Steak Quesadilla
- [ ] Chalupa Supreme (Chicken) (note: Campus menu lists chicken version, 350 cal; macros from TB calculator with grilled chicken)
- [ ] Spicy Potato Soft Taco
- [ ] Nachos BellGrande
- [ ] Cheesy Roll Up
- [ ] Cinnamon Twists
- [ ] Creamy Jalapeño Sauce (note: Campus serves 1 packet (70 cal); official values are for a 1.5 oz cup. Protein listed as <1 g)
- [ ] Reduced-Fat Sour Cream (note: Campus packet lists 30 cal. Protein listed as <1 g)
- [ ] Diablo Sauce (note: Calories from campus menu)
- [ ] Fire Sauce (note: Calories from campus menu)
- [ ] Hot Sauce (note: Calories from campus menu)
- [ ] Mild Sauce (note: Calories from campus menu)

## Allergens and dietary tags (`allergens`, `tags`, `allergens_verified`, `allergen_source`)

**120 of 192 items are verified** (was 33): Chick-fil-A 76 of 78, Taco Bell 32 of 36, Subway 12 of 58,
Panda Express 0 of 20. The other 72 are `allergens_verified=no`. The app shows "Allergen info unavailable"
for them, and anyone with an allergen, "No seafood", or "Halal-friendly" set won't see them as a match.
`scripts/menu-import/menu-data.test.ts` checks the real CSV (allowed tokens, a source on every verified
row, tags only on verified rows, no vegan + milk/egg, no gluten_free + wheat) and the per-chain counts
above, so update both together.

To verify an item, fill in `allergens` (pipe-separated from milk|egg|wheat|soy|peanut|tree_nut|fish|shellfish|sesame),
`tags` (from vegetarian|vegan|gluten_free|contains_pork), set `allergens_verified=yes`, and put the page or
document you used in `allergen_source`. Only set vegetarian / vegan / gluten_free when the chain says so
explicitly. Tags can only be set on verified rows (the import rejects them otherwise).

Sources used (2026-11-13):

- **Chick-fil-A**: the Allergens table on https://www.chick-fil-a.com/nutrition-allergens (milk, egg, soy,
  wheat, sesame, tree nuts, peanut, fish; no shellfish column, same as the item pages used before).
- **Taco Bell**: the official allergen tool on https://www.tacobell.com/nutrition/allergen-info, which is
  embedded from nutritionix.com/taco-bell/menu/special-diets/premium. Vegetarian = items marked "(V)"
  (American Vegetarian Association certified) there, which also have `hasAVA` on their tacobell.com
  product page. Taco Bell says it does not claim gluten-free for any item, so no gluten_free tags.
  No item is marked vegan.
- **Subway**: the October 2026 US allergen chart (link below) plus the October 2026 US nutrition guide
  (https://media.subway.com/dam/urn:aaid:aem:f20a4541-8c88-496b-940d-4aa8318cae26/original/as/us-nutrition-en.pdf).
  "May contain" (x), refined-oil-only (*) and the cookies' nut cross-contact (**) marks are not counted as
  "contains".

### Chick-fil-A (2 left)

- [ ] Iced Coffee: our row (200 cal / 7 g protein / 4 g fat) matches the "Iced Coffee" entry under Drinks,
  which lists no allergens, but the "Iced Coffee" entries under Coffee list milk. Conflicting, so left
  unverified. Check the item page or ask Chick-fil-A CARES.
- [ ] Cold Brew Iced Coffee: 130 cal from the campus menu matches no entry in the national table (the
  Cream Cold Brews are 370-530 cal and contain milk).

### Panda Express (20, none verified)

- [ ] All 20 items. pandaexpress.com (/nutritioninformation, /-/media/... PDF paths) and the ordering API
  (nomnom-prod-api.pandaexpress.com) answer HTTP 403 with a captcha page to scripts and headless browsers
  (tried 2026-11-13). Only third-party copies of the PDF turned up in search, and those don't count. Open
  https://www.pandaexpress.com/nutritioninformation in a normal browser, download the allergen PDF, and fill
  each row from it.

### Subway (46 left)

Verified: the 4 breakfast subs (the nutrition guide says "Values include 6" Artisan Italian, egg and
American cheese"), the 3 soups and the 5 cookies.

- [ ] The 6-inch and footlong subs (30 + 15) and the 4 Fresh Fit items. The nutrition guide says its values
  are "based on standard recipes" but doesn't list the bread, cheese or sauce each sub uses, so the build
  can't be taken from the nutrition source. Find each sub's default build on its subway.com menu page (in a
  browser; subway.com timed out for scripts), then take the union of those ingredients' rows in the
  allergen chart and write the build in `allergen_source`.
- When verifying them, also set `contains_pork` (from the item name or the chart): B.L.T. (bacon), Chicken &
  Bacon Ranch (bacon), Black Forest Ham and its footlong (ham), Meatball Pepperoni and its footlong
  (pepperoni), Turkey & Ham (ham), Ham & Salami, Spicy Pepperoni, Ham & Turkey Stacker (ham), Spicy Italian
  and its footlong ("Spicy Italian Meats (pepperoni, salami)" in the chart). B.M.T., Cold Cut Combo,
  5 Meat Italian, Pizza Sub, All American Club, Subway Club and the Hot Honey subs need their meats checked.

### Taco Bell (4 left)

- [ ] Creamy Jalapeño Sauce, Reduced-Fat Sour Cream, Chips & Guacamole, Side of Nacho Cheese: not listed on
  their own in the tacobell.com allergen tool. When Chips & Guacamole is verified, also tag it vegetarian
  (its tacobell.com product page has `hasAVA`).
