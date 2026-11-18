import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addExcludedFood, toggleAllergen } from "./avoidance.js";
import { DEFAULT_ONBOARDING_VALUES, onboardingInput, validateOnboarding, validateProfileMoney } from "./onboarding.js";

const good = { ...DEFAULT_ONBOARDING_VALUES, balance: "500", target: "25.5" };

describe("validateOnboarding", () => {
  it("accepts the defaults with a balance and a target", () => {
    assert.equal(validateOnboarding(good), null);
  });

  it("flags blank, negative or non-numeric fields", () => {
    assert.deepEqual(validateOnboarding(DEFAULT_ONBOARDING_VALUES), {
      field: "balance",
      message: "Enter a number of 0 or more in every field.",
    });
    assert.equal(validateOnboarding({ ...good, fat: "-1" })?.field, "fat");
    assert.equal(validateOnboarding({ ...good, target: "abc" })?.field, "target");
  });

  it("requires whole numbers for nutrition goals but not for money", () => {
    assert.deepEqual(validateOnboarding({ ...good, protein: "99.5" }), {
      field: "protein",
      message: "Enter whole numbers for your nutrition goals.",
    });
  });
});

describe("onboardingInput", () => {
  it("builds the request body", () => {
    assert.deepEqual(
      onboardingInput(good, {
        nutritionPriorities: ["Balanced"],
        dietaryRestrictions: [],
        preferredLocations: ["loc-1"],
      }),
      {
        dining_dollars_balance: 500,
        daily_spending_target: 25.5,
        calories: 2000,
        protein_g: 100,
        carbs_g: 250,
        fat_g: 70,
        nutrition_priorities: ["Balanced"],
        dietary_restrictions: [],
        preferred_location_ids: ["loc-1"],
      },
    );
  });
});

describe("validateProfileMoney", () => {
  it("returns the message for the first bad field", () => {
    assert.equal(validateProfileMoney("10", "5"), null);
    assert.equal(validateProfileMoney("-1", "5"), "Enter a valid non-negative Dining Dollars balance.");
    assert.equal(validateProfileMoney("10", "x"), "Enter a valid non-negative daily target.");
  });
});

describe("allergen and avoided-food lists", () => {
  it("toggles allergen codes and treats older names as selected", () => {
    assert.deepEqual(toggleAllergen([], "milk"), ["milk"]);
    assert.deepEqual(toggleAllergen(["Nuts", "milk"], "tree_nut"), ["milk"]);
  });

  it("adds trimmed foods once, ignoring case", () => {
    assert.deepEqual(addExcludedFood([], "  Mushroom "), ["Mushroom"]);
    const list = ["Mushroom"];
    assert.equal(addExcludedFood(list, "mushroom"), list);
    assert.equal(addExcludedFood(list, "   "), list);
  });
});
