import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diningDollarsView, displayName, greeting, nutritionView, weeklyBarPercent, weeklyDays } from "./dashboard.js";
import type { DashboardData } from "./dashboard-types.js";

// Mock data only.
const totals = (calories: number, protein_g: number, spent: number) => ({
  calories,
  protein_g,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  spent,
});

const data: DashboardData = {
  profile: {
    id: "u1",
    display_name: null,
    dining_dollars_balance: 120.5,
    daily_spending_target: 20,
    onboarding_completed: true,
  },
  goals: { calories: 2000, protein_g: 100, carbs_g: null, fat_g: 70, fiber_g: null },
  today: totals(1200.4, 60, 16),
  week: totals(9000, 400, 90),
};

describe("greeting", () => {
  it("changes at noon and 6 pm", () => {
    assert.equal(greeting(5), "Good morning");
    assert.equal(greeting(12), "Good afternoon");
    assert.equal(greeting(18), "Good evening");
  });
});

describe("displayName", () => {
  it("prefers the profile, then sign-up metadata, then the email", () => {
    assert.equal(displayName({ ...data.profile!, display_name: "Sam" }, null), "Sam");
    assert.equal(displayName(null, { user_metadata: { full_name: "Pat Lee" } }), "Pat Lee");
    assert.equal(displayName(null, { email: "kai@example.com" }), "kai");
    assert.equal(displayName(null, null), "Student");
  });
});

describe("nutritionView", () => {
  it("shows calories remaining for today and macro text with and without goals", () => {
    const view = nutritionView(data, "daily");
    assert.equal(view.centerValue, "800");
    assert.equal(view.centerLabel, "Calories Remaining");
    assert.equal(view.centerDetail, "1,200 / 2,000 kcal");
    assert.equal(view.macros[0]?.text, "60 / 100g");
    assert.equal(view.macros[0]?.percent, 60);
    assert.equal(view.macros[1]?.text, "0g · no goal");
    assert.equal(view.macros[1]?.percent, 0);
  });

  it("shows the weekly average with weekly goals", () => {
    const view = nutritionView(data, "weekly");
    assert.equal(view.centerValue, "1,286");
    assert.equal(view.centerLabel, "Weekly average");
    assert.equal(view.centerDetail, "9,000 / 14,000 kcal");
  });

  it("says no calorie goal is set without one", () => {
    const view = nutritionView({ ...data, goals: null }, "daily");
    assert.equal(view.centerLabel, "Calories Logged");
    assert.equal(view.centerDetail, "No calorie goal set");
  });
});

describe("diningDollarsView", () => {
  it("describes spending against the daily target and the weekly budget", () => {
    const view = diningDollarsView(data, { budget_alerts_enabled: true });
    assert.equal(view.spentText, "$16.00 of $20.00 target spent today");
    assert.equal(view.tag, "Near target");
    assert.equal(view.budgetPercent, 80);
    assert.equal(view.weeklyBudgetText, "Recommended weekly budget: $140.00");
    assert.equal(view.weeklyStatusText, "You're $50.00 under your weekly budget.");
  });

  it("hides the tag when budget alerts are off and has no weekly lines without a target", () => {
    const noTarget = { ...data, profile: { ...data.profile!, daily_spending_target: null } };
    const view = diningDollarsView(noTarget, { budget_alerts_enabled: false });
    assert.equal(view.tag, null);
    assert.equal(view.spentText, "$16.00");
    assert.equal(view.weeklyBudgetText, null);
    assert.equal(view.weeklyStatusText, null);
  });
});

describe("weeklyDays", () => {
  it("adds up calories per day, Monday first", () => {
    const wednesday = new Date(2026, 10, 18, 12);
    const days = weeklyDays(
      [
        { name: "a", calories: 300, eaten_at: new Date(2026, 10, 16, 9).toISOString() },
        { name: "b", calories: 200, eaten_at: new Date(2026, 10, 16, 18).toISOString() },
        { name: "c", eaten_at: new Date(2026, 10, 18, 9).toISOString() },
      ],
      wednesday,
    );
    assert.deepEqual(days.map((day) => day.calories), [500, 0, 0, 0, 0, 0, 0]);
    assert.equal(weeklyBarPercent(0, 2000), 0);
    assert.equal(weeklyBarPercent(10, 2000), 8);
  });
});
