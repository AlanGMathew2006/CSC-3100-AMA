import assert from "node:assert/strict";
import { test } from "node:test";
import { comboNutrition, comboParts, isBuildYourOwnCombo, sumMacros, type ComboContents } from "./combos.js";

// Mock values only.
const rice = { calories: 600, protein_g: 14, carbs_g: 100, fat_g: 12 };
const noodles = { calories: 500, protein_g: 14, carbs_g: 90, fat_g: 20 };
const chicken = { calories: 300, protein_g: 35, carbs_g: 10, fat_g: 10 };

test("sumMacros multiplies by servings, so half-and-half bases count as half each", () => {
  assert.deepEqual(
    sumMacros([
      { item: rice, servings: 0.5 },
      { item: noodles, servings: 0.5 },
      { item: chicken, servings: 2 }
    ]),
    { calories: 1150, protein_g: 84, carbs_g: 115, fat_g: 36 }
  );
});

test("an unknown macro on any part makes that macro null, never 0", () => {
  const totals = sumMacros([
    { item: rice, servings: 1 },
    { item: { ...chicken, fat_g: null }, servings: 1 }
  ]);
  assert.equal(totals.fat_g, null);
  assert.equal(totals.calories, 900);
});

test("no parts means every macro is unknown", () => {
  assert.deepEqual(sumMacros([]), { calories: null, protein_g: null, carbs_g: null, fat_g: null });
});

test("only Bowl / Plate / Bigger Plate style combos are build-your-own", () => {
  assert.ok(isBuildYourOwnCombo({ name: "Plate", base_count: 1, entree_count: 2 }));
  assert.ok(!isBuildYourOwnCombo({ name: "#1 Plate", base_count: 1, entree_count: 2 }));
  assert.ok(!isBuildYourOwnCombo({ name: "3 Crunchy Taco Combo", base_count: null, entree_count: null }));
});

// Mock combo: a sandwich meal with a side and a drink slot.
const ITEMS = [
  { id: "sandwich", calories: 400, protein_g: 30, carbs_g: 40, fat_g: 15 },
  { id: "fries", calories: 400, protein_g: 5, carbs_g: 45, fat_g: 24 },
  { id: "fruit", calories: 60, protein_g: 1, carbs_g: 14, fat_g: 0 },
  { id: "tea", calories: 120, protein_g: 0, carbs_g: 31, fat_g: 0 },
  { id: "mystery", calories: 100, protein_g: null, carbs_g: 5, fat_g: 1 }
];
const meal: { contents: ComboContents } = {
  contents: {
    source: "mock",
    verified: true,
    components: [
      { meal: "sandwich", servings: 1 },
      { slot: "side", choices: ["fries", "fruit"], default: "fries" },
      { slot: "drink", choices: ["tea"], default: "tea" }
    ]
  }
};

test("comboNutrition sums fixed parts and the default slot items", () => {
  assert.deepEqual(comboNutrition(meal, ITEMS), { calories: 920, protein_g: 35, carbs_g: 116, fat_g: 39 });
});

test("comboNutrition uses a slot pick when it is one of the choices, else the default", () => {
  assert.equal(comboNutrition(meal, ITEMS, { side: "fruit" }).calories, 580);
  assert.equal(comboNutrition(meal, ITEMS, { side: "mystery" }).calories, 920);
  assert.deepEqual(
    comboParts(meal, ITEMS, { side: "fruit" }).map((p) => [p.meal_id, p.servings, p.slot]),
    [["sandwich", 1, null], ["fruit", 1, "side"], ["tea", 1, "drink"]]
  );
});

test("comboNutrition keeps unknown macros null, never 0", () => {
  const withMystery = {
    contents: { ...meal.contents, components: [...meal.contents.components, { meal: "mystery", servings: 2 }] }
  };
  const totals = comboNutrition(withMystery, ITEMS);
  assert.equal(totals.protein_g, null);
  assert.equal(totals.calories, 1120);
  // A part missing from the menu makes every macro unknown.
  assert.deepEqual(comboNutrition(meal, ITEMS.filter((i) => i.id !== "tea")), {
    calories: null, protein_g: null, carbs_g: null, fat_g: null
  });
  // No contents at all (e.g. build-your-own or not imported yet).
  assert.equal(comboNutrition({ contents: null }, ITEMS).calories, null);
});

test("comboNutrition handles half servings (Panda half-and-half base)", () => {
  const plate = {
    contents: {
      source: "mock",
      verified: true,
      components: [
        { meal: "fries", servings: 0.5 },
        { meal: "fruit", servings: 0.5 },
        { meal: "sandwich", servings: 2 }
      ]
    }
  };
  assert.equal(comboNutrition(plate, ITEMS).calories, 1030);
});
