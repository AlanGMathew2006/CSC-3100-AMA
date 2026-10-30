import assert from "node:assert/strict";
import { test } from "node:test";
import { macroMatch } from "./macro-match.js";

const targets = { calories: 800, protein_g: 40, carbs_g: 90, fat_g: 30 };

test("a meal exactly on target scores 100 and every macro is on_target", () => {
  const result = macroMatch(targets, targets);
  assert.equal(result.score, 100);
  for (const macro of Object.values(result.breakdown)) {
    assert.equal(macro.status, "on_target");
    assert.equal(macro.pct_of_target, 100);
  }
});

test("score follows the weighted relative-error formula", () => {
  // Errors: calories 0.25, protein 0.5, carbs 0, fat 0 -> mean 0.1875 -> 81.25 -> 81.
  const result = macroMatch({ calories: 1000, protein_g: 20, carbs_g: 90, fat_g: 30 }, targets);
  assert.equal(result.score, 81);
  assert.equal(result.breakdown.calories.status, "over");
  assert.equal(result.breakdown.protein_g.status, "under");
  assert.equal(result.breakdown.protein_g.pct_of_target, 50);
});

test("weights change how much each macro counts", () => {
  const meal = { calories: 800, protein_g: 20, carbs_g: 90, fat_g: 30 };
  // Protein error 0.5 with weight 3 out of 6 -> 0.25 -> 75.
  assert.equal(macroMatch(meal, targets, { protein_g: 3 }).score, 75);
  // Weight 0 drops the macro from the score but keeps it in the breakdown.
  assert.equal(macroMatch(meal, targets, { protein_g: 0 }).score, 100);
});

test("on_target means within 10% either way", () => {
  const result = macroMatch({ calories: 880, protein_g: 36, carbs_g: 80, fat_g: 33.1 }, targets);
  assert.equal(result.breakdown.calories.status, "on_target"); // +10%
  assert.equal(result.breakdown.protein_g.status, "on_target"); // -10%
  assert.equal(result.breakdown.carbs_g.status, "under"); // -11%
  assert.equal(result.breakdown.fat_g.status, "over"); // +10.3%
});

test("a null value is unavailable and skipped, never scored as 0", () => {
  const result = macroMatch({ calories: 800, protein_g: null, carbs_g: 90, fat_g: 30 }, targets);
  assert.equal(result.breakdown.protein_g.status, "unavailable");
  assert.equal(result.breakdown.protein_g.actual, null);
  assert.equal(result.score, 100);
});

test("macros without a target are skipped", () => {
  const result = macroMatch(targets, { calories: 800, protein_g: null });
  assert.equal(result.breakdown.carbs_g.status, "unavailable");
  assert.equal(result.score, 100);
});

test("nothing comparable gives a null score, not 0", () => {
  assert.equal(macroMatch({}, targets).score, null);
  assert.equal(macroMatch(targets, {}).score, null);
});

test("a target of 0 only accepts 0 and divides the error by 1", () => {
  const result = macroMatch({ calories: 0, protein_g: 0.5 }, { calories: 0, protein_g: 0 });
  assert.equal(result.breakdown.calories.status, "on_target");
  assert.equal(result.breakdown.protein_g.status, "over");
  assert.equal(result.breakdown.protein_g.pct_of_target, null);
  assert.equal(result.score, 75); // errors 0 and 0.5 -> mean 0.25
});

test("the score never goes below 0", () => {
  assert.equal(macroMatch({ calories: 5000 }, { calories: 800 }).score, 0);
});

test("identical inputs give identical output", () => {
  const meal = { calories: 733, protein_g: 31.5, carbs_g: 77, fat_g: 29 };
  assert.deepEqual(macroMatch(meal, targets, { protein_g: 2 }), macroMatch(meal, targets, { protein_g: 2 }));
});
