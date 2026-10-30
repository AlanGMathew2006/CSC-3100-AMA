import assert from "node:assert/strict";
import { test } from "node:test";
import type { MenuCombo, MenuItem } from "@csc-3100-ama/shared";
import {
  buildModel,
  defaultMealsRemaining,
  mealBudget,
  mealTargets,
  objectiveWeights,
  recommend,
  type LocationRecord,
  type RecommendationData
} from "./recommendation-service.js";

// Mock data only (not real menu values): Wednesday 2026-10-28 12:00 in Los Angeles.
const NOON_WED = new Date("2026-10-28T12:00:00-07:00");
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const allDay = Object.fromEntries(
  DAYS.map((d) => [d, [{ open: "00:00", close: "24:00" }]])
);
const neverOpen = Object.fromEntries(DAYS.map((d) => [d, []]));

const location = (
  id: string,
  restaurant: string,
  hours: LocationRecord["hours"],
  accepts = true
): LocationRecord => ({
  id,
  name: `${restaurant} (Test)`,
  restaurant,
  campus_area: "Test",
  accepts_dining_dollars: accepts,
  hours
});

const LOCATIONS = [
  location("loc-sub", "Subway", allDay),
  location("loc-panda", "Panda Express", {}), // hours unknown -> still eligible
  location("loc-tb", "Taco Bell", neverOpen),
  location("loc-cafe", "Cafe", allDay, false)
];

const item = (
  id: string,
  restaurant: string,
  macros: [number | null, number, number, number],
  {
    price,
    locationId,
    allergens = [],
    verified = true,
    component = null,
    windows = null
  }: {
    price?: number;
    locationId?: string;
    allergens?: string[];
    verified?: boolean;
    component?: "base" | "entree" | null;
    windows?: MenuItem["serving_windows"];
  } = {}
): MenuItem => ({
  id,
  name: id,
  restaurant,
  category: "Test",
  serving: null,
  calories: macros[0],
  protein_g: macros[1],
  carbs_g: macros[2],
  fat_g: macros[3],
  meal_component: component,
  tags: [],
  allergens,
  allergens_verified: verified,
  serving_windows: windows,
  offerings:
    price == null || !locationId
      ? []
      : [
          {
            location_id: locationId,
            location_name: "x",
            campus_area: null,
            price,
            service_date: "2026-10-05",
            open_status: "open",
            availability: "available"
          }
        ]
});

const sub = (id: string, macros: [number, number, number, number], price: number, allergens: string[], verified = true) =>
  item(id, "Subway", macros, { price, locationId: "loc-sub", allergens, verified });
const panda = (id: string, macros: [number, number, number, number], component: "base" | "entree", allergens: string[]) =>
  item(id, "Panda Express", macros, { component, allergens });

const ITEMS: MenuItem[] = [
  sub("sub-turkey", [280, 18, 46, 3.5], 8.29, ["wheat", "soy"]),
  sub("sub-veggie", [230, 9, 44, 2.5], 7.69, ["wheat"]),
  sub("sub-tuna", [480, 19, 45, 25], 8.19, ["egg", "fish", "wheat"]),
  sub("sub-cookie", [220, 2, 30, 10], 0.99, ["milk", "egg", "wheat", "soy"]),
  sub("sub-meatball", [400, 20, 50, 15], 4.99, [], false),
  item("sub-mystery", "Subway", [null, 5, 5, 5], { price: 3, locationId: "loc-sub" }),
  panda("px-rice", [520, 11, 85, 16], "base", ["egg", "soy", "wheat"]),
  panda("px-greens", [90, 6, 10, 3], "base", []),
  panda("px-orange", [490, 25, 51, 23], "entree", ["egg", "milk", "soy", "wheat"]),
  panda("px-broccoli", [150, 9, 13, 7], "entree", ["soy", "wheat"]),
  panda("px-shrimp", [360, 13, 35, 19], "entree", ["shellfish", "egg", "milk", "soy", "wheat"]),
  item("px-eggroll", "Panda Express", [200, 6, 20, 10], {
    price: 2,
    locationId: "loc-panda",
    allergens: ["wheat", "soy"]
  }),
  item("tb-bean", "Taco Bell", [350, 13, 54, 9], { price: 2.69, locationId: "loc-tb" }),
  item("cafe-bar", "Cafe", [200, 10, 20, 8], { price: 1, locationId: "loc-cafe" })
];

const combo = (id: string, restaurant: string, name: string, price: number, bases: number | null, entrees: number | null): MenuCombo => ({
  id,
  restaurant,
  name,
  description: null,
  base_count: bases,
  entree_count: entrees,
  price
});

const COMBOS = [
  combo("c-bowl", "Panda Express", "Bowl", 9.4, 1, 1),
  combo("c-plate", "Panda Express", "Plate", 11.3, 1, 2),
  combo("c-fixed", "Panda Express", "#1 Plate", 1, 1, 2), // fixed contents: must never be used
  combo("c-tb", "Taco Bell", "3 Crunchy Taco Combo", 9.19, null, null)
];

const data = (overrides: Partial<RecommendationData> = {}): RecommendationData => ({
  profile: { dining_dollars_balance: 100, daily_spending_target: 25 },
  goals: { calories: 2000, protein_g: 100, carbs_g: 250, fat_g: 70 },
  preferences: { dietary_restrictions: [], allergens: [], excluded_foods: [] },
  todayLogs: [{ price: 5, calories: 500, protein_g: 20, carbs_g: 60, fat_g: 20 }],
  locations: LOCATIONS,
  menu: { items: ITEMS, combos: COMBOS },
  ...overrides
});

const itemAllergens = new Map(ITEMS.map((i) => [i.id, i]));

// ---------- Targets and budget ----------

test("default meals remaining depends on Los Angeles time", () => {
  assert.equal(defaultMealsRemaining(new Date("2026-10-28T10:59:00-07:00")), 3);
  assert.equal(defaultMealsRemaining(new Date("2026-10-28T11:00:00-07:00")), 2);
  assert.equal(defaultMealsRemaining(new Date("2026-10-28T15:59:00-07:00")), 2);
  assert.equal(defaultMealsRemaining(new Date("2026-10-28T16:00:00-07:00")), 1);
});

test("mealTargets splits what is left of today's goals, floored at 0", () => {
  const { targets, remaining } = mealTargets(
    { calories: 2000, protein_g: 100, carbs_g: null, fat_g: 70 },
    [
      { price: 5, calories: 1200, protein_g: 110, carbs_g: 10, fat_g: null },
      { price: 3, calories: 300, protein_g: 10, carbs_g: 10, fat_g: 20 }
    ],
    2
  );
  assert.deepEqual(remaining, { calories: 500, protein_g: 0, carbs_g: null, fat_g: 50 });
  assert.deepEqual(targets, { calories: 250, protein_g: 0, carbs_g: null, fat_g: 25 });
});

test("mealBudget is min(balance, daily target - spent), or the balance with no target", () => {
  assert.equal(mealBudget(100, 25, 5), 20);
  assert.equal(mealBudget(12.5, 25, 5), 12.5);
  assert.equal(mealBudget(40, null, 30), 40);
  assert.equal(mealBudget(40, 10, 12), -2);
});

test("nutrition priorities adjust the objective weights", () => {
  assert.deepEqual(objectiveWeights(["Balanced"]), objectiveWeights([]));
  const weights = objectiveWeights(["High protein", "Lower calorie", "Budget-friendly"]);
  assert.equal(weights.under.protein_g, 3);
  assert.equal(weights.over.protein_g, 0.2);
  assert.equal(weights.over.calories, 3);
  assert.equal(weights.lambda, 0.5);
  assert.equal(objectiveWeights([]).lambda, 0.1);
});

// ---------- Model builder (no solver) ----------

const nutrition = (calories: number, protein_g: number, carbs_g: number, fat_g: number) => ({
  calories,
  protein_g,
  carbs_g,
  fat_g
});

test("buildModel writes the goal-programming MILP in CPLEX LP format", () => {
  const model = buildModel({
    standalone: [
      { id: "b", name: "B", price: 4, nutrition: nutrition(400, 20, 40, 10) },
      { id: "a", name: "A", price: 2, nutrition: nutrition(200, 10, 20, 5) }
    ],
    components: [
      { id: "rice", name: "Rice", part: "base", nutrition: nutrition(500, 10, 80, 15) },
      { id: "chicken", name: "Chicken", part: "entree", nutrition: nutrition(300, 25, 10, 15) }
    ],
    combos: [{ id: "bowl", name: "Bowl", price: 9, base_count: 1, entree_count: 1 }],
    targets: { calories: 800, protein_g: 0, carbs_g: null, fat_g: 30 },
    budget: 10,
    weights: objectiveWeights([])
  });
  assert.ok(model);

  // Inputs are sorted by id, so variable names are stable.
  assert.deepEqual(
    Object.entries(model.variables).map(([name, v]) => [name, v.option.id]),
    [["x0", "a"], ["x1", "b"], ["y0", "bowl"], ["z0", "chicken"], ["z1", "rice"]]
  );
  const lines = model.lp.split("\n");
  assert.equal(lines[0], "Minimize");
  // Calories: 1/800 per unit; protein target 0 -> only "over" is penalized (1/max(0,1));
  // cost: 0.1 * price / budget.
  assert.equal(
    lines[1],
    " obj: 0.00125 under_calories + 0.00125 over_calories + 1 over_protein_g + 0.033333 under_fat_g + 0.033333 over_fat_g + 0.02 x0 + 0.04 x1 + 0.09 y0"
  );
  assert.ok(lines.includes(" macro_calories: 200 x0 + 400 x1 + 300 z0 + 500 z1 - 1 over_calories + 1 under_calories = 800"));
  assert.ok(lines.includes(" macro_protein_g: 10 x0 + 20 x1 + 25 z0 + 10 z1 - 1 over_protein_g + 1 under_protein_g = 0"));
  assert.ok(!model.lp.includes("carbs_g"), "no goal -> no carbs row");
  assert.ok(lines.includes(" budget: 2 x0 + 4 x1 + 9 y0 <= 10"));
  assert.ok(lines.includes(" one_combo: 1 y0 <= 1"));
  assert.ok(lines.includes(" bases: 1 z1 - 1 y0 = 0"));
  assert.ok(lines.includes(" entrees: 1 z0 - 1 y0 = 0"));
  assert.ok(lines.includes(" min_items: 1 x0 + 1 x1 + 1 y0 >= 1"));
  assert.ok(lines.includes(" max_items: 1 x0 + 1 x1 + 1 y0 <= 4"));
  assert.ok(lines.includes(" 0 <= x0 <= 2"));
  assert.ok(lines.includes(" 0 <= z1 <= 1"));
  assert.deepEqual(lines.slice(-5), ["Generals", " x0 x1 z0 z1", "Binaries", " y0", "End"]);
});

test("buildModel returns null with nothing to choose and drops combos without components", () => {
  const empty = {
    standalone: [],
    components: [],
    combos: [{ id: "bowl", name: "Bowl", price: 9, base_count: 1, entree_count: 1 }],
    targets: { calories: 800 },
    budget: 10,
    weights: objectiveWeights([])
  };
  assert.equal(buildModel(empty), null);
});

// ---------- Recommending (real HiGHS solver, mock data) ----------

test("returns targets, budget and up to `limit` recommendations with explanations", async () => {
  const result = await recommend(data(), { at: NOON_WED, limit: 3 });
  assert.equal(result.reason, null);
  assert.equal(result.meals_remaining, 2);
  assert.equal(result.budget, 20);
  assert.deepEqual(result.targets, { calories: 750, protein_g: 40, carbs_g: 95, fat_g: 25 });
  assert.ok(result.recommendations.length >= 1 && result.recommendations.length <= 3);
  for (const rec of result.recommendations) {
    assert.ok(rec.items.length > 0);
    assert.match(rec.explanation, /^Covers \d+% of your remaining protein for this meal and (stays \$\d+\.\d\d under|uses the rest of) today's budget\.$/);
    assert.ok(rec.macro_match.score !== null && rec.macro_match.score >= 0 && rec.macro_match.score <= 100);
  }
  // Sorted by objective.
  const objectives = result.recommendations.map((r) => r.objective);
  assert.deepEqual(objectives, [...objectives].sort((a, b) => a - b));
});

test("the budget is never exceeded", async () => {
  for (const spent of [0, 10, 15.6, 18, 21.5, 24]) {
    const result = await recommend(
      data({ todayLogs: [{ price: spent, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }] }),
      { at: NOON_WED, limit: 10 }
    );
    for (const rec of result.recommendations) {
      assert.ok(rec.total_price <= result.budget + 1e-9, `${rec.total_price} > ${result.budget}`);
      const itemsCost = rec.items.reduce((sum, i) => sum + (i.unit_price ?? 0) * i.quantity, 0);
      assert.equal(Math.round((itemsCost + (rec.combo?.price ?? 0)) * 100) / 100, rec.total_price);
    }
  }
});

test("excluded allergens and unverified meals never appear", async () => {
  for (const allergen of ["milk", "wheat", "fish", "shellfish"]) {
    const result = await recommend(
      data({ preferences: { allergens: [allergen] } }),
      { at: NOON_WED, limit: 10 }
    );
    for (const rec of result.recommendations) {
      for (const chosen of rec.items) {
        const meal = itemAllergens.get(chosen.meal_id);
        assert.ok(meal?.allergens_verified, `${chosen.meal_id} is unverified`);
        assert.ok(!meal.allergens?.includes(allergen), `${chosen.meal_id} contains ${allergen}`);
      }
    }
  }
});

test("location_id limits results to that location; preferred locations are respected", async () => {
  const panda = await recommend(data(), { at: NOON_WED, locationId: "loc-panda", limit: 3 });
  assert.deepEqual(panda.recommendations.map((r) => r.location.id), ["loc-panda"]);
  assert.equal(panda.recommendations[0]?.location.open_status, "unknown");

  const preferred = await recommend(
    data({ preferences: { preferred_location_ids: ["loc-sub"] } }),
    { at: NOON_WED, limit: 3 }
  );
  assert.deepEqual(preferred.recommendations.map((r) => r.location.id), ["loc-sub"]);
});

test("closed locations and ones without Dining Dollars are skipped with a reason", async () => {
  const result = await recommend(data(), { at: NOON_WED, limit: 10 });
  assert.deepEqual(
    result.skipped.map((s) => [s.location_id, s.reason]),
    [
      ["loc-cafe", "Doesn't take Dining Dollars"],
      ["loc-tb", "Closed right now"]
    ]
  );
  assert.ok(result.recommendations.every((r) => r.location.id !== "loc-tb" && r.location.id !== "loc-cafe"));
});

test("only build-your-own combos are used, never fixed-content ones", async () => {
  const result = await recommend(data(), { at: NOON_WED, locationId: "loc-panda" });
  const rec = result.recommendations[0];
  assert.ok(rec);
  assert.notEqual(rec.combo?.id, "c-fixed");
  if (rec.combo) {
    const parts = rec.items.filter((i) => i.combo_part !== null);
    const bases = parts.filter((i) => i.combo_part === "base").reduce((n, i) => n + i.quantity, 0);
    const entrees = parts.filter((i) => i.combo_part === "entree").reduce((n, i) => n + i.quantity, 0);
    const chosen = COMBOS.find((c) => c.id === rec.combo?.id);
    assert.equal(bases, chosen?.base_count);
    assert.equal(entrees, chosen?.entree_count);
  }
});

test("the same inputs give the same output, regardless of input order", async () => {
  const first = await recommend(data(), { at: NOON_WED, limit: 10 });
  const second = await recommend(data(), { at: NOON_WED, limit: 10 });
  const shuffled = await recommend(
    data({
      locations: [...LOCATIONS].reverse(),
      menu: { items: [...ITEMS].reverse(), combos: [...COMBOS].reverse() }
    }),
    { at: NOON_WED, limit: 10 }
  );
  assert.deepEqual(second, first);
  assert.deepEqual(shuffled, first);
});

test("no budget left returns an empty result with reason over_daily_budget", async () => {
  const result = await recommend(
    data({ todayLogs: [{ price: 25, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }] }),
    { at: NOON_WED }
  );
  assert.equal(result.reason, "over_daily_budget");
  assert.deepEqual(result.recommendations, []);
  assert.equal(result.budget, 0);
});

test("when nothing fits the budget, every location is skipped and the reason says why", async () => {
  const result = await recommend(
    data({ profile: { dining_dollars_balance: 0.5, daily_spending_target: null } }),
    { at: NOON_WED }
  );
  assert.equal(result.reason, "no_feasible_meals");
  assert.ok(result.skipped.some((s) => s.reason === "Nothing here fits your budget"));
});

test("a location whose filtered menu can't make any meal says so instead of blaming the budget", async () => {
  // No wheat-free entree at Panda and every Subway item has wheat.
  const result = await recommend(data({ preferences: { allergens: ["wheat"] } }), { at: NOON_WED });
  assert.equal(result.reason, "no_feasible_meals");
  assert.deepEqual(
    result.skipped.filter((s) => s.location_id === "loc-panda" || s.location_id === "loc-sub").map((s) => s.reason),
    [
      "No priced meals with nutrition info match your filters",
      "No priced meals with nutrition info match your filters"
    ]
  );
});

test("meals_remaining overrides the time-of-day default", async () => {
  const result = await recommend(data(), { at: NOON_WED, mealsRemaining: 1 });
  assert.equal(result.meals_remaining, 1);
  assert.deepEqual(result.targets, { calories: 1500, protein_g: 80, carbs_g: 190, fat_g: 50 });
});

// Breakfast served 00:00-10:30 every day (same shape as the Chick-fil-A rule).
const BREAKFAST = Object.fromEntries(DAYS.map((d) => [d, [{ open: "00:00", close: "10:30" }]]));
// Exactly the per-meal targets for 2 meals left (750 / 40 / 95 / 25), cheap: the best possible fit.
const perfectBreakfast = (windows: MenuItem["serving_windows"]) =>
  item("sub-breakfast", "Subway", [750, 40, 95, 25], {
    price: 5,
    locationId: "loc-sub",
    windows
  });

test("a breakfast item that is the best macro fit is never picked at 13:00", async () => {
  const menu = { items: [...ITEMS, perfectBreakfast(BREAKFAST)], combos: COMBOS };
  const options = { locationId: "loc-sub", mealsRemaining: 2, limit: 1 };

  const morning = await recommend(data({ menu }), {
    ...options,
    at: new Date("2026-10-28T09:00:00-07:00")
  });
  assert.deepEqual(morning.recommendations[0]?.items.map((i) => i.meal_id), ["sub-breakfast"]);

  const afternoon = await recommend(data({ menu }), {
    ...options,
    at: new Date("2026-10-28T13:00:00-07:00")
  });
  assert.ok(afternoon.recommendations.length > 0);
  for (const rec of afternoon.recommendations) {
    assert.ok(rec.items.every((i) => i.meal_id !== "sub-breakfast"));
  }
});

test("items and combos with an unknown serving time are never recommended", async () => {
  const result = await recommend(
    data({
      menu: {
        items: [...ITEMS, perfectBreakfast("unknown")],
        combos: COMBOS.map((c) => (c.id === "c-bowl" || c.id === "c-plate" ? { ...c, serving_windows: "unknown" as const } : c))
      }
    }),
    { at: new Date("2026-10-28T09:00:00-07:00"), mealsRemaining: 2, limit: 10 }
  );
  for (const rec of result.recommendations) {
    assert.ok(rec.items.every((i) => i.meal_id !== "sub-breakfast"));
    assert.equal(rec.combo, null);
  }
});
