import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { macroMatch, type MenuItem, type Recommendation } from "@csc-3100-ama/shared";
import {
  combinedAllergens,
  recommendationAsMenuItem,
  recommendationLabel,
  recommendationLog,
} from "./recommendations";

// Mock data only.
const meal = (id: string): MenuItem => ({
  id,
  name: id,
  restaurant: "Panda Express",
  category: "Entrees",
  serving: null,
  calories: 100,
  protein_g: 1,
  carbs_g: 1,
  fat_g: 1,
  meal_component: "entree",
  offerings: [],
});

const rec = (overrides: Partial<Recommendation> = {}): Recommendation => ({
  location: { id: "loc", name: "Panda Express (1901 Marketplace)", campus_area: "1901 Marketplace", open_status: "open" },
  combo: { id: "plate", name: "Plate", price: 11.3 },
  items: [
    { meal_id: "rice", name: "Fried Rice", quantity: 1, unit_price: null, combo_part: "base", meal_role: "main" },
    { meal_id: "beef", name: "Broccoli Beef", quantity: 2, unit_price: null, combo_part: "entree", meal_role: "main" },
  ],
  total_price: 11.3,
  nutrition: { calories: 820, protein_g: 29, carbs_g: 111, fat_g: 30 },
  targets: { calories: 800, protein_g: 40 },
  macro_match: macroMatch({}, {}),
  explanation: "",
  objective: 0,
  ...overrides,
});

describe("recommendationLabel", () => {
  it("names the combo and its parts in the order given (main first), with quantities", () => {
    assert.equal(recommendationLabel(rec()), "Plate: Fried Rice + 2× Broccoli Beef");
  });
  it("cuts off long titles with +N more", () => {
    const four = rec({
      combo: { id: "bp", name: "Bigger Plate", price: 13.3 },
      items: ["Broccoli Beef", "Orange Chicken", "Kung Pao Chicken", "Chow Mein"].map((name) => ({
        meal_id: name, name, quantity: 1, unit_price: null, combo_part: "entree" as const, meal_role: "main" as const,
      })),
    });
    assert.equal(recommendationLabel(four, 2), "Bigger Plate: Broccoli Beef + Orange Chicken +2 more");
    assert.equal(recommendationLabel(four, 4), "Bigger Plate: Broccoli Beef + Orange Chicken + Kung Pao Chicken + Chow Mein");
  });
  it("joins standalone items without a combo", () => {
    assert.equal(
      recommendationLabel(rec({ combo: null, items: [{ meal_id: "a", name: "Tuna", quantity: 1, unit_price: 8, combo_part: null, meal_role: "main" }] })),
      "Tuna",
    );
  });
});

describe("recommendationAsMenuItem", () => {
  it("keeps the first meal's id and shows the whole recommendation's totals", () => {
    const item = recommendationAsMenuItem(rec(), [meal("beef"), meal("rice")]);
    assert.equal(item?.id, "rice");
    assert.equal(item?.calories, 820);
    assert.equal(item?.offerings[0]?.price, 11.3);
    assert.equal(item?.offerings[0]?.location_id, "loc");
  });
  it("keeps unknown nutrition as null, not 0", () => {
    const item = recommendationAsMenuItem(rec({ nutrition: { calories: null } }), [meal("rice")]);
    assert.equal(item?.calories, null);
    assert.equal(item?.protein_g, null);
  });
  it("returns null when the meal is not in the menu", () => {
    assert.equal(recommendationAsMenuItem(rec(), []), null);
  });
});

describe("recommendationLog", () => {
  it("logs the whole meal at its total price", () => {
    const log = recommendationLog(rec());
    assert.equal(log.meal_id, undefined);
    assert.equal(log.price, 11.3);
    assert.equal(log.calories, 820);
    assert.equal(log.name, "Plate: Fried Rice + 2× Broccoli Beef");
  });
  it("keeps the meal id for a single standalone item and omits unknown nutrition", () => {
    const log = recommendationLog(
      rec({
        combo: null,
        items: [{ meal_id: "tuna", name: "Tuna", quantity: 1, unit_price: 8, combo_part: null, meal_role: "main" }],
        nutrition: { calories: 480, protein_g: null },
      }),
    );
    assert.equal(log.meal_id, "tuna");
    assert.equal(log.protein_g, undefined);
  });
});

describe("combinedAllergens", () => {
  const withAllergens = (id: string, allergens: string[], verified = true, tags: string[] = []): MenuItem => ({
    ...meal(id),
    allergens,
    allergens_verified: verified,
    tags,
  });
  it("unions verified allergens in the standard order", () => {
    const result = combinedAllergens(rec(), [
      withAllergens("rice", ["wheat", "egg"]),
      withAllergens("beef", ["soy", "wheat"], true, ["contains_pork"]),
    ]);
    assert.deepEqual(result, { allergens: ["egg", "wheat", "soy"], containsPork: true, complete: true });
  });
  it("is incomplete when any item is unverified or missing", () => {
    assert.equal(combinedAllergens(rec(), [withAllergens("rice", ["egg"]), withAllergens("beef", [], false)]).complete, false);
    assert.equal(combinedAllergens(rec(), [withAllergens("rice", ["egg"])]).complete, false);
  });
});
