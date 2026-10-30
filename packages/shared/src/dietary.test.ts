import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isMealAllowed,
  mealRestrictionReasons,
  normalizeAllergen,
  type DietaryMeal,
} from "./dietary.js";

const meal = (overrides: Partial<DietaryMeal> = {}): DietaryMeal => ({
  name: "Test Meal",
  allergens: [],
  tags: [],
  allergens_verified: true,
  ...overrides,
});

test("no preferences allows every meal, verified or not", () => {
  assert.equal(isMealAllowed(meal({ allergens_verified: false }), {}), true);
  assert.equal(isMealAllowed(meal(), { dietary_restrictions: [], allergens: [] }), true);
});

test("Vegetarian requires the vegetarian tag (vegan also counts)", () => {
  const prefs = { dietary_restrictions: ["Vegetarian"] };
  assert.equal(isMealAllowed(meal({ tags: ["vegetarian"] }), prefs), true);
  assert.equal(isMealAllowed(meal({ tags: ["vegan"] }), prefs), true);
  assert.equal(isMealAllowed(meal(), prefs), false);
});

test("Vegan requires the vegan tag", () => {
  const prefs = { dietary_restrictions: ["Vegan"] };
  assert.equal(isMealAllowed(meal({ tags: ["vegan"] }), prefs), true);
  assert.equal(isMealAllowed(meal({ tags: ["vegetarian"] }), prefs), false);
});

test("Gluten-free requires the gluten_free tag", () => {
  const prefs = { dietary_restrictions: ["Gluten-free"] };
  assert.equal(isMealAllowed(meal({ tags: ["gluten_free"] }), prefs), true);
  assert.equal(isMealAllowed(meal(), prefs), false);
});

test("No seafood excludes fish and shellfish, and unverified meals", () => {
  const prefs = { dietary_restrictions: ["No seafood"] };
  assert.equal(isMealAllowed(meal({ allergens: ["fish"] }), prefs), false);
  assert.equal(isMealAllowed(meal({ allergens: ["shellfish"] }), prefs), false);
  assert.equal(isMealAllowed(meal({ allergens: ["milk"] }), prefs), true);
  assert.deepEqual(mealRestrictionReasons(meal({ allergens_verified: false }), prefs), [
    "Allergen info unavailable",
  ]);
});

test("Halal-friendly excludes contains_pork and unverified meals", () => {
  const prefs = { dietary_restrictions: ["Halal-friendly"] };
  assert.equal(isMealAllowed(meal({ tags: ["contains_pork"] }), prefs), false);
  assert.equal(isMealAllowed(meal(), prefs), true);
  assert.equal(isMealAllowed(meal({ allergens_verified: false }), prefs), false);
});

test("user allergens exclude meals containing them, matching common spellings", () => {
  assert.equal(isMealAllowed(meal({ allergens: ["tree_nut"] }), { allergens: ["Tree Nuts"] }), false);
  assert.equal(isMealAllowed(meal({ allergens: ["egg"] }), { allergens: ["eggs"] }), false);
  assert.equal(isMealAllowed(meal({ allergens: ["milk"] }), { allergens: ["peanut"] }), true);
});

test("any allergen set excludes meals whose allergens are not verified", () => {
  const unverified = meal({ allergens: [], allergens_verified: false });
  assert.deepEqual(mealRestrictionReasons(unverified, { allergens: ["peanut"] }), [
    "Allergen info unavailable",
  ]);
  assert.equal(isMealAllowed(meal({ allergens_verified: null }), { allergens: ["sesame"] }), false);
  // An allergen we don't track still switches on the safe default.
  assert.equal(isMealAllowed(unverified, { allergens: ["mustard"] }), false);
});

test("excluded_foods match the meal name case-insensitively", () => {
  const prefs = { excluded_foods: ["  BACON "] };
  assert.equal(isMealAllowed(meal({ name: "Bacon, Egg & Cheese Biscuit" }), prefs), false);
  assert.equal(isMealAllowed(meal({ name: "Chicken Biscuit" }), prefs), true);
  assert.equal(isMealAllowed(meal({ name: "Anything" }), { excluded_foods: ["", " "] }), true);
});

test("reasons list every rule that failed", () => {
  assert.deepEqual(
    mealRestrictionReasons(meal({ name: "Shrimp Plate", allergens: ["shellfish", "egg"] }), {
      dietary_restrictions: ["Vegan", "No seafood"],
      allergens: ["egg"],
      excluded_foods: ["shrimp"],
    }),
    ["Not marked vegan", "Contains seafood", "Contains egg", "Excluded food: shrimp"],
  );
});

test("normalizeAllergen returns null for allergens we don't track", () => {
  assert.equal(normalizeAllergen("Soybeans"), "soy");
  assert.equal(normalizeAllergen("mustard"), null);
});
