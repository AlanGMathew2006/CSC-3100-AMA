import assert from "node:assert/strict";
import { test } from "node:test";
import { isBuildYourOwnCombo, sumMacros } from "./combos.js";

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
