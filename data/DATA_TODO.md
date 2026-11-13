# Data to fill in by hand

Values here could not be verified from an official source, so they are left blank in the data
files. Nothing in this list should be guessed. Fill it in, re-run `npm run import:menu`
from `packages/express-backend` (re-running is safe, it upserts), then tick the box.

Dining hours: done (`data/dining_hours.json`, regular-week hours collected 2026-10-30).
Re-check them at the start of each quarter and before breaks.

## Prices, serving windows and combo contents: `data/manual_fill_in.csv`

Everything below needs the Grubhub campus app (login required) or the store itself, so it is collected
in one sheet: **`data/manual_fill_in.csv`**, one row per missing value (97 rows on 2026-11-13: 36 prices,
3 serving windows, 58 combo-contents rows). Then:

1. Open the Grubhub campus app and go down the sheet. For each row, type the answer in `value` and where
   it came from in `source` (e.g. `Grubhub campus app, 2026-11-20`). Leave rows you can't answer blank.
2. From the repo root: `npm run apply:fill-in -- --dry-run` (checks everything, writes nothing), then
   `npm run apply:fill-in`. It validates every filled row, merges them into `menu_items.csv`,
   `serving_windows.json` and `combo_contents.json`, runs the import's own checks on the result, and
   removes the applied rows from the sheet. If anything is wrong it writes nothing and says which row.
3. From `packages/express-backend`: `npm run import:menu -- --dry-run`, then `npm run import:menu`.

What goes in `value`, by the `missing` column:

| missing | value | example |
|---|---|---|
| `price` | price with two decimals, more than 0; or `none` if it isn't sold on its own | `9.15` |
| `serving_window` | `HH:MM-HH:MM` every day (combined with the store's hours), or `all day` | `00:00-10:30` |
| `combo_contents` | parts separated by `;`, each `<id> x<count>`, plus `drink=<id>` / `side=<id>` | `taco-bell--crunchy-taco x3; drink=<drink id>` |
| `combo_entree` | the meal's entree (one `menu_items.csv` id) | `chick-fil-a--chick-fil-a-nuggets-8-ct` |
| `combo_part` | a part to add, `<id>` or `<id> x<count>` | `panda-express--beijing-beef` |
| `combo_side` / `combo_drink` | the side/drink the meal includes; several with `\|`, default first | `chick-fil-a--hash-brown` |
| `combo_side_choices` / `combo_drink_choices` | every side/drink you can pick at no extra charge, default first | `chick-fil-a--waffle-potato-fries-medium\|chick-fil-a--fruit-cup` |

A combo is marked verified (and can be recommended) once all of its `combo_contents`, `combo_entree`,
`combo_part`, `combo_side` and `combo_drink` rows are filled. The `_choices` rows only add options.

Before filling some rows, add a row to `menu_items.csv` first (with official nutrition), then use its id:

- **Taco Bell combos (10)**: there are no Taco Bell drink rows yet.
- **Chick-fil-A Chicken and Waffles Sandwich Meal (lunch)**: there is no lunch Chicken and Waffles Sandwich
  row yet (Grubhub prices it at $10.35, differently from the breakfast one).

What was checked without logging in (2026-11-13), so it is in the sheet:

- Grubhub: public grubhub.com pages only return the app shell; campus menus need the logged-in app.
- Subway breakfast cutoff: not in the nutrition guide or allergen chart; subway.com store pages time out
  for scripts.
- Chick-fil-A breakfast cutoff: the campus store's page (chick-fil-a.com/californiapolytechnicstate)
  lists "Breakfast" and store hours but no cutoff. 10:30 stays as the chain-wide default until confirmed.
- Mini Yeast Rolls (4 ct): no official page says whether it is sold all day.

### Free with a meal

Sauces and the Panda fortune cookie are marked `free_with_meal=yes` in `menu_items.csv` (12 items, all
with a note saying "Free with entrees." or "Usually free with a meal."). They keep a blank price (never
$0), Explore and meal details say "Free with a meal" instead of "Price unavailable", logging one doesn't
count toward spending, and the recommender never picks them on their own. Their price rows in the sheet
are optional: put `none` if Grubhub doesn't sell them separately.

### Combo-only Panda items (11, no action)

Chow Mein, Fried Rice, White Steamed Rice, Super Greens (base and entree) and the 6 entrees are only sold
inside a Bowl/Plate/Bigger Plate, so they stay without a standalone price.

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

- [ ] The 27 six-inch and 15 footlong subs and the 4 Fresh Fit items. The nutrition guide says its values
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
