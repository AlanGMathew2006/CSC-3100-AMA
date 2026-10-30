# Data to fill in by hand

Values here could not be verified from an official source, so they are left blank in the data
files. Nothing in this list should be guessed. Fill it in, re-run `npm run import:menu`
from `packages/express-backend` (re-running is safe, it upserts), then tick the box.

Dining hours: done (`data/dining_hours.json`, regular-week hours collected 2026-10-30).
Re-check them at the start of each quarter and before breaks.

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

33 of 192 items are verified (Chick-fil-A item pages that state "This menu item contains: ...").
The other 159 are `allergens_verified=no`. The app shows "Allergen info unavailable" for them, and
anyone with an allergen, "No seafood", or "Halal-friendly" set won't see them as a match.

To verify an item, fill in `allergens` (pipe-separated from milk|egg|wheat|soy|peanut|tree_nut|fish|shellfish|sesame),
`tags` (from vegetarian|vegan|gluten_free|contains_pork), set `allergens_verified=yes`, and put the page or
document you used in `allergen_source`. Only set vegetarian / vegan / gluten_free when the chain says so
explicitly. No item has those tags yet, so the Vegetarian, Vegan and Gluten-free filters match nothing until
they are filled in.

Why each chain is unverified (tried 2026-10-30):

- **Taco Bell**: tacobell.com loads allergen info with JavaScript, so it couldn't be read. Use the
  allergen filter on tacobell.com/nutrition/allergen-info or the Taco Bell app in a browser.
- **Subway**: the official US allergen chart is
  https://media.subway.com/dam/urn:aaid:aem:359a9f3d-2719-453b-9395-030f54968cbe/original/as/us-allergens-en.pdf
  (October 2026). It lists ingredients (breads, meats, cheeses, sauces), not whole subs, so each sub's
  allergens depend on its build. Decide which bread/cheese/sauce the default build uses (see the nutrition
  source) and combine those rows.
- **Panda Express**: pandaexpress.com/nutritioninformation returned HTTP 403. Use its allergen PDF in a browser.
- **Chick-fil-A**: these item pages state no allergens (blank "contains" line, or no statement at all), have no
  item page, or the CSV item doesn't match one page exactly. Check the Allergens tab on chick-fil-a.com.

### Chick-fil-A (45)

- [ ] Grilled Nuggets (8 ct)
- [ ] Grilled Nuggets (12 ct)
- [ ] Buttered Biscuit
- [ ] Hash Brown
- [ ] Waffle Potato Fries (Medium)
- [ ] Waffle Potato Fries (Large)
- [ ] Fruit Cup
- [ ] Waffle Potato Chips
- [ ] Frosted Coffee
- [ ] Chick-fil-A Lemonade (Medium)
- [ ] Chick-fil-A Diet Lemonade (Medium)
- [ ] Sweetened Iced Tea (Medium)
- [ ] Sweetened Iced Tea (Large)
- [ ] Unsweetened Iced Tea
- [ ] Sunjoy (Sweet Tea + Diet Lemonade, Medium)
- [ ] Cold Brew Iced Coffee
- [ ] DASANI Bottled Water
- [ ] Chick-fil-A Sauce
- [ ] Polynesian Sauce
- [ ] Honey Mustard Sauce
- [ ] Garden Herb Ranch Sauce
- [ ] Barbeque Sauce
- [ ] Zesty Buffalo Sauce
- [ ] Honey Roasted BBQ Sauce
- [ ] Chicken and Waffles Breakfast Sandwich
- [ ] Hash Brown Scramble Bowl
- [ ] Breakfast Waffle
- [ ] English Muffin
- [ ] Mini Yeast Rolls (4 ct)
- [ ] Berry Parfait with Cookie Crumbs
- [ ] Simply Orange Juice
- [ ] 1% Chocolate Milk
- [ ] Iced Coffee
- [ ] Toasted Marshmallow Iced Coffee
- [ ] Pineapple Dragonfruit Lemonade
- [ ] Pineapple Dragonfruit Diet Lemonade
- [ ] Pineapple Dragonfruit Iced Tea
- [ ] Pineapple Dragonfruit Sunjoy
- [ ] Pineapple Dragonfruit Sprite
- [ ] S'mores Milkshake
- [ ] S'mores Frosted Coffee
- [ ] Float
- [ ] Frosted Soda
- [ ] Diet Frosted Lemonade
- [ ] Pineapple Dragonfruit Frosted Lemonade

### Panda Express (20)

- [ ] Chow Mein
- [ ] Fried Rice
- [ ] White Steamed Rice
- [ ] Super Greens (as base)
- [ ] The Original Orange Chicken
- [ ] Grilled Teriyaki Chicken
- [ ] Kung Pao Chicken
- [ ] Beijing Beef
- [ ] Broccoli Beef
- [ ] Honey Walnut Shrimp
- [ ] Super Greens (as entree)
- [ ] Chicken Egg Roll
- [ ] Cream Cheese Rangoon
- [ ] Vegetable Spring Roll
- [ ] Apple Pie Roll
- [ ] Fortune Cookie
- [ ] Sweet & Sour Sauce
- [ ] Teriyaki Sauce
- [ ] Chili Sauce
- [ ] Soy Sauce

### Subway (58)

- [ ] Steak Philly
- [ ] Chipotle Philly
- [ ] Chicken & Bacon Ranch
- [ ] Honey Mustard Chicken
- [ ] Sweet Onion Chicken Teriyaki
- [ ] Grilled Chicken
- [ ] B.M.T.
- [ ] Spicy Italian
- [ ] 5 Meat Italian
- [ ] Meatball Pepperoni
- [ ] Meatball Marinara
- [ ] Cold Cut Combo
- [ ] B.L.T.
- [ ] Oven-Roasted Turkey
- [ ] Black Forest Ham
- [ ] Roast Beef
- [ ] Tuna
- [ ] Veggie Delite
- [ ] All American Club
- [ ] Subway Club
- [ ] Turkey & Ham
- [ ] Pizza Sub
- [ ] Veggie Patty
- [ ] Ham & Salami
- [ ] Spicy Pepperoni
- [ ] Hot Honey Turkey Italian
- [ ] Hot Honey Italian
- [ ] Grilled Chicken & Avocado
- [ ] Ham & Turkey Stacker
- [ ] Turkey & Ranch Delite
- [ ] Seasoned Steak & Avocado
- [ ] 6-inch Bacon, Egg & Cheese
- [ ] 6-inch Steak, Egg & Cheese
- [ ] 6-inch Egg & Cheese
- [ ] 6-inch Black Forest Ham, Egg & Cheese
- [ ] Broccoli Cheddar Soup
- [ ] Chicken Noodle Soup
- [ ] Loaded Baked Potato Soup
- [ ] Chocolate Chip Cookie
- [ ] Double Chocolate Cookie
- [ ] Oatmeal Raisin Cookie
- [ ] Raspberry Cheesecake Cookie
- [ ] White Chip Macadamia Nut Cookie
- [ ] Steak Philly (Footlong)
- [ ] Sweet Onion Chicken Teriyaki (Footlong)
- [ ] Grilled Chicken (Footlong)
- [ ] B.M.T. (Footlong)
- [ ] Spicy Italian (Footlong)
- [ ] 5 Meat Italian (Footlong)
- [ ] Meatball Pepperoni (Footlong)
- [ ] Cold Cut Combo (Footlong)
- [ ] Oven-Roasted Turkey (Footlong)
- [ ] Black Forest Ham (Footlong)
- [ ] Roast Beef (Footlong)
- [ ] Tuna (Footlong)
- [ ] Veggie Delite (Footlong)
- [ ] All American Club (Footlong)
- [ ] Subway Club (Footlong)

### Taco Bell (36)

- [ ] Beefy 5-Layer Burrito
- [ ] Burrito Supreme (Steak)
- [ ] Cheesy Bean and Rice Burrito
- [ ] Bean Burrito
- [ ] Crunchwrap Supreme
- [ ] Mexican Pizza
- [ ] Cheese Quesadilla
- [ ] Chicken Quesadilla
- [ ] Steak Quesadilla
- [ ] Chalupa Supreme (Chicken)
- [ ] Crunchy Taco
- [ ] Crunchy Taco Supreme
- [ ] Soft Taco (Beef)
- [ ] Soft Taco Supreme (Beef)
- [ ] Nacho Cheese Doritos Locos Taco
- [ ] Nacho Cheese Doritos Locos Taco Supreme
- [ ] Spicy Potato Soft Taco
- [ ] Nachos BellGrande
- [ ] Chips & Nacho Cheese
- [ ] Cheesy Roll Up
- [ ] Cinnamon Twists
- [ ] Creamy Jalapeño Sauce
- [ ] Reduced-Fat Sour Cream
- [ ] Diablo Sauce
- [ ] Fire Sauce
- [ ] Hot Sauce
- [ ] Mild Sauce
- [ ] Burrito Supreme (Beef)
- [ ] Grilled Cheese Burrito
- [ ] Chalupa Supreme (Beef)
- [ ] Black Bean Chalupa Supreme
- [ ] Cheesy Gordita Crunch
- [ ] Black Bean Crunchwrap Supreme
- [ ] Veggie Mexican Pizza
- [ ] Chips & Guacamole
- [ ] Side of Nacho Cheese
