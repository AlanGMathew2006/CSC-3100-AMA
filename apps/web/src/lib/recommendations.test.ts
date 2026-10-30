import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { macroMatch, type MenuItem, type Recommendation } from "@csc-3100-ama/shared";
import { recommendationAsMenuItem, recommendationLabel } from "./recommendations";

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
    { meal_id: "rice", name: "Fried Rice", quantity: 1, unit_price: null, combo_part: "base" },
    { meal_id: "beef", name: "Broccoli Beef", quantity: 2, unit_price: null, combo_part: "entree" },
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
  it("names the combo and its parts, with quantities", () => {
    assert.equal(recommendationLabel(rec()), "Plate: Fried Rice + 2× Broccoli Beef");
  });
  it("joins standalone items without a combo", () => {
    assert.equal(
      recommendationLabel(rec({ combo: null, items: [{ meal_id: "a", name: "Tuna", quantity: 1, unit_price: 8, combo_part: null }] })),
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
