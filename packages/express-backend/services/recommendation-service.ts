import type { SupabaseClient } from "@supabase/supabase-js";
import highsModule from "highs";
import {
  diningClock,
  getOpenStatus,
  isMealAllowed,
  macroMatch,
  MACROS,
  servingWindowStatus,
  startOfDiningDay,
  type DietaryPreferences,
  type Macro,
  type MacroValues,
  type MealTargetsResponse,
  type MenuCombo,
  type MenuItem,
  type OpenStatus,
  type Recommendation,
  type RecommendationItem,
  type RecommendationsResponse,
  type SkippedLocation,
  type WeeklyHours
} from "@csc-3100-ama/shared";
import { getMenu } from "./menu-service.js";
import {
  getGoals,
  getPreferences,
  getProfile,
  listMealLogs
} from "./user-service.js";

// Meal recommender (US-03/US-05/US-07): a small mixed-integer "diet problem" per dining location,
// solved with HiGHS. Deterministic and explainable; no AI services are involved.
// See the "Recommendation algorithm" section in CONTEXT.md.

// ---------- Targets and budget for the next meal ----------

const round = (value: number, places: number) =>
  Math.round(value * 10 ** places) / 10 ** places;

// Before 11:00 -> 3 meals left today, before 16:00 -> 2, otherwise 1 (Los Angeles time).
export function defaultMealsRemaining(at: Date): number {
  const { minute } = diningClock(at);
  if (minute < 11 * 60) return 3;
  if (minute < 16 * 60) return 2;
  return 1;
}

export interface LoggedMeal {
  price: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

// remaining = goal - eaten today (floored at 0); target = remaining / meals left.
// Macros with no goal stay null. A log with an unknown value adds nothing for that macro.
export function mealTargets(
  goals: MacroValues | null,
  todayLogs: LoggedMeal[],
  mealsRemaining: number
): { targets: MacroValues; remaining: MacroValues } {
  const targets: MacroValues = {};
  const remaining: MacroValues = {};
  for (const macro of MACROS) {
    const goal = goals?.[macro];
    if (goal == null) {
      targets[macro] = null;
      remaining[macro] = null;
      continue;
    }
    const eaten = todayLogs.reduce(
      (sum, log) => sum + Number(log[macro] ?? 0),
      0
    );
    const left = Math.max(0, Number(goal) - eaten);
    remaining[macro] = round(left, 1);
    targets[macro] = round(left / mealsRemaining, 1);
  }
  return { targets, remaining };
}

// B = min(balance, daily target - spent today); just the balance when there is no daily target.
export function mealBudget(
  balance: number,
  dailyTarget: number | null,
  spentToday: number
): number {
  const budget =
    dailyTarget == null
      ? balance
      : Math.min(balance, dailyTarget - spentToday);
  return round(budget, 2);
}

export interface ObjectiveWeights {
  under: Record<Macro, number>;
  over: Record<Macro, number>;
  lambda: number; // weight of cost / budget
}

// Defaults wu = wo = 1 and lambda = 0.1; nutrition_priorities from onboarding adjust them.
export function objectiveWeights(priorities: string[]): ObjectiveWeights {
  const ones = () =>
    Object.fromEntries(MACROS.map((m) => [m, 1])) as Record<Macro, number>;
  const weights: ObjectiveWeights = {
    under: ones(),
    over: ones(),
    lambda: 0.1
  };
  if (priorities.includes("High protein")) {
    weights.under.protein_g = 3;
    weights.over.protein_g = 0.2;
  }
  if (priorities.includes("Lower calorie")) weights.over.calories = 3;
  if (priorities.includes("Budget-friendly")) weights.lambda = 0.5;
  // "Balanced" keeps the defaults.
  return weights;
}

// ---------- Model building (pure; testable without the solver) ----------

type Nutrition = Record<Macro, number>;

export interface StandaloneOption {
  id: string;
  name: string;
  price: number;
  nutrition: Nutrition;
}

export interface ComponentOption {
  id: string;
  name: string;
  part: "base" | "entree";
  nutrition: Nutrition;
}

export interface ComboOption {
  id: string;
  name: string;
  price: number;
  base_count: number;
  entree_count: number;
}

export interface ModelInput {
  standalone: StandaloneOption[];
  components: ComponentOption[];
  combos: ComboOption[];
  targets: MacroValues;
  budget: number;
  weights: ObjectiveWeights;
}

export type ModelVariable =
  | { kind: "item"; option: StandaloneOption }
  | { kind: "combo"; option: ComboOption }
  | { kind: "component"; option: ComponentOption };

export interface BuiltModel {
  lp: string;
  variables: Record<string, ModelVariable>; // LP variable name -> meal / combo
}

export const MAX_STANDALONE_QUANTITY = 2;
export const MAX_ITEMS = 4;

const byId = <T extends { id: string }>(list: T[]) =>
  [...list].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

// Fixed decimal text, so the LP string never uses exponent notation.
const num = (value: number) => String(round(value, 6));

// [[3, "x0"], [-1, "y0"]] -> "3 x0 - 1 y0"; zero coefficients are dropped.
function linear(terms: [number, string][]): string {
  return terms
    .map(([coef, name]) => [round(coef, 6), name] as const)
    .filter(([coef]) => coef !== 0)
    .map(
      ([coef, name], i) =>
        `${coef < 0 ? "- " : i === 0 ? "" : "+ "}${num(Math.abs(coef))} ${name}`
    )
    .join(" ");
}

// Builds the goal-programming MILP for one location as CPLEX LP text.
// Returns null when there is nothing to choose from.
export function buildModel(input: ModelInput): BuiltModel | null {
  const standalone = byId(input.standalone);
  const components = input.combos.length ? byId(input.components) : [];
  const combos = components.length ? byId(input.combos) : [];
  if (standalone.length === 0 && combos.length === 0) return null;

  const variables: Record<string, ModelVariable> = {};
  const x = standalone.map((option, i) => {
    variables[`x${i}`] = { kind: "item", option };
    return `x${i}`;
  });
  const y = combos.map((option, i) => {
    variables[`y${i}`] = { kind: "combo", option };
    return `y${i}`;
  });
  const z = components.map((option, i) => {
    variables[`z${i}`] = { kind: "component", option };
    return `z${i}`;
  });

  const budget = input.budget;
  const objective: [number, string][] = [];
  const constraints: string[] = [];

  for (const macro of MACROS) {
    const target = input.targets[macro];
    if (target == null) continue; // no goal for this macro
    const scale = Math.max(target, 1);
    // A target of 0 only penalizes going over.
    const under = target === 0 ? 0 : input.weights.under[macro];
    objective.push([under / scale, `under_${macro}`]);
    objective.push([input.weights.over[macro] / scale, `over_${macro}`]);
    const terms: [number, string][] = [
      ...standalone.map((o, i): [number, string] => [o.nutrition[macro], x[i] as string]),
      ...components.map((o, i): [number, string] => [o.nutrition[macro], z[i] as string]),
      [-1, `over_${macro}`],
      [1, `under_${macro}`]
    ];
    constraints.push(`macro_${macro}: ${linear(terms)} = ${num(target)}`);
  }

  // Cost term keeps the result from being just the cheapest meal (CONTEXT.md rule 5).
  const costTerms: [number, string][] = [
    ...standalone.map((o, i): [number, string] => [o.price, x[i] as string]),
    ...combos.map((o, i): [number, string] => [o.price, y[i] as string])
  ];
  for (const [price, name] of costTerms) {
    objective.push([(input.weights.lambda * price) / budget, name]);
  }
  constraints.push(`budget: ${linear(costTerms)} <= ${num(budget)}`);

  if (combos.length) {
    constraints.push(
      `one_combo: ${linear(y.map((name): [number, string] => [1, name]))} <= 1`
    );
    for (const part of ["base", "entree"] as const) {
      const count = (c: ComboOption) =>
        part === "base" ? c.base_count : c.entree_count;
      const terms: [number, string][] = [
        ...components.flatMap((o, i): [number, string][] =>
          o.part === part ? [[1, z[i] as string]] : []
        ),
        ...combos.map((c, i): [number, string] => [-count(c), y[i] as string])
      ];
      if (terms.some(([coef]) => coef !== 0)) {
        constraints.push(`${part}s: ${linear(terms)} = 0`);
      }
    }
  }

  const counted = [...x, ...y].map((name): [number, string] => [1, name]);
  constraints.push(`min_items: ${linear(counted)} >= 1`);
  constraints.push(`max_items: ${linear(counted)} <= ${MAX_ITEMS}`);

  const maxParts = Math.max(
    0,
    ...combos.map((c) => Math.max(c.base_count, c.entree_count))
  );
  const bounds = [
    ...x.map((name) => ` 0 <= ${name} <= ${MAX_STANDALONE_QUANTITY}`),
    ...z.map((name) => ` 0 <= ${name} <= ${maxParts}`)
  ];

  const lines = [
    "Minimize",
    ` obj: ${linear(objective) || `0 ${x[0] ?? y[0]}`}`,
    "Subject To",
    ...constraints.map((c) => ` ${c}`),
    "Bounds",
    ...bounds,
    ...(x.length || z.length ? ["Generals", ` ${[...x, ...z].join(" ")}`] : []),
    ...(y.length ? ["Binaries", ` ${y.join(" ")}`] : []),
    "End"
  ];
  return { lp: lines.join("\n"), variables };
}

// ---------- Solving ----------

// highs ships CommonJS-style types, so under NodeNext its default import is typed as the module
// namespace. At runtime the ESM build's default export is the loader function itself.
const loadHighs = highsModule as unknown as typeof highsModule.default;

// Loaded once per process; the WebAssembly module is reused for every solve.
const highsReady = loadHighs();

export interface ModelSolution {
  status: string;
  objective: number;
  values: Record<string, number>; // rounded integer value per model variable
}

export async function solveModel(model: BuiltModel): Promise<ModelSolution> {
  const highs = await highsReady;
  const result = highs.solve(model.lp, {
    output_flag: false,
    mip_rel_gap: 1e-6
  });
  if (result.Status !== "Optimal") {
    return { status: result.Status, objective: Infinity, values: {} };
  }
  const values: Record<string, number> = {};
  for (const name of Object.keys(model.variables)) {
    values[name] = Math.round(result.Columns[name]?.Primal ?? 0);
  }
  return {
    status: result.Status,
    objective: round(result.ObjectiveValue, 6),
    values
  };
}

// ---------- Recommending ----------

export interface LocationRecord {
  id: string;
  name: string;
  restaurant: string | null;
  campus_area: string | null;
  accepts_dining_dollars: boolean;
  hours: WeeklyHours | null;
}

export interface RecommendationData {
  profile: {
    dining_dollars_balance: number | null;
    daily_spending_target: number | null;
  } | null;
  goals: MacroValues | null;
  preferences:
    | (DietaryPreferences & {
        preferred_location_ids?: string[] | null;
        nutrition_priorities?: string[] | null;
      })
    | null;
  todayLogs: LoggedMeal[];
  locations: LocationRecord[];
  menu: { items: MenuItem[]; combos: MenuCombo[] };
}

export interface RecommendationOptions {
  at: Date;
  limit?: number;
  locationId?: string;
  mealsRemaining?: number;
}

const fullNutrition = (item: MenuItem): Nutrition | null =>
  MACROS.every((m) => item[m] != null)
    ? (Object.fromEntries(
        MACROS.map((m) => [m, Number(item[m])])
      ) as Nutrition)
    : null;

// Bowl / Plate / Bigger Plate: a base_count + entree_count and the customer picks the contents.
// TODO: fixed-content combos (Panda #1-#6 Plates, Taco Bell and Chick-fil-A meals) are skipped for
// now because their exact contents aren't in the data.
const isBuildYourOwnCombo = (combo: MenuCombo) =>
  combo.base_count != null &&
  combo.entree_count != null &&
  !/^#\d/.test(combo.name);

export function computeMealTargets(
  data: RecommendationData,
  options: RecommendationOptions
): MealTargetsResponse {
  const mealsRemaining =
    options.mealsRemaining ?? defaultMealsRemaining(options.at);
  const { targets, remaining } = mealTargets(
    data.goals,
    data.todayLogs,
    mealsRemaining
  );
  const spentToday = round(
    data.todayLogs.reduce((sum, log) => sum + Number(log.price ?? 0), 0),
    2
  );
  return {
    targets,
    remaining,
    meals_remaining: mealsRemaining,
    budget: mealBudget(
      Number(data.profile?.dining_dollars_balance ?? 0),
      data.profile?.daily_spending_target == null
        ? null
        : Number(data.profile.daily_spending_target),
      spentToday
    ),
    spent_today: spentToday
  };
}

const money = (value: number) => `$${value.toFixed(2)}`;

// One plain-English line built from the Macro Match breakdown.
export function explain(
  breakdown: Recommendation["macro_match"]["breakdown"],
  totalPrice: number,
  budget: number
): string {
  const protein = breakdown.protein_g;
  const calories = breakdown.calories;
  const nutrition =
    protein.pct_of_target != null
      ? `Covers ${protein.pct_of_target}% of your remaining protein for this meal`
      : calories.pct_of_target != null
        ? `Covers ${calories.pct_of_target}% of your remaining calories for this meal`
        : "Fits your dietary filters";
  const left = round(budget - totalPrice, 2);
  const spend =
    left > 0
      ? `stays ${money(left)} under today's budget`
      : "uses the rest of today's budget";
  return `${nutrition} and ${spend}.`;
}

function toRecommendation(
  location: LocationRecord & { open_status: OpenStatus },
  model: BuiltModel,
  solution: ModelSolution,
  targets: MacroValues,
  budget: number
): Recommendation {
  const items: RecommendationItem[] = [];
  let combo: Recommendation["combo"] = null;
  let totalPrice = 0;
  const nutrition = Object.fromEntries(
    MACROS.map((m) => [m, 0])
  ) as Nutrition;

  for (const [name, variable] of Object.entries(model.variables)) {
    const quantity = solution.values[name] ?? 0;
    if (quantity <= 0) continue;
    if (variable.kind === "combo") {
      combo = {
        id: variable.option.id,
        name: variable.option.name,
        price: variable.option.price
      };
      totalPrice += variable.option.price;
      continue;
    }
    const { option } = variable;
    for (const macro of MACROS)
      nutrition[macro] += option.nutrition[macro] * quantity;
    if (variable.kind === "item") totalPrice += variable.option.price * quantity;
    items.push({
      meal_id: option.id,
      name: option.name,
      quantity,
      unit_price: variable.kind === "item" ? variable.option.price : null,
      combo_part: variable.kind === "component" ? variable.option.part : null
    });
  }

  const totals = Object.fromEntries(
    MACROS.map((m) => [m, round(nutrition[m], 1)])
  ) as Nutrition;
  const total = round(totalPrice, 2);
  const match = macroMatch(totals, targets);
  return {
    location: {
      id: location.id,
      name: location.name,
      campus_area: location.campus_area,
      open_status: location.open_status
    },
    combo,
    items,
    total_price: total,
    nutrition: totals,
    targets,
    macro_match: match,
    explanation: explain(match.breakdown, total, budget),
    objective: solution.objective
  };
}

export async function recommend(
  data: RecommendationData,
  options: RecommendationOptions
): Promise<RecommendationsResponse> {
  const base = computeMealTargets(data, options);
  const empty = (
    reason: RecommendationsResponse["reason"],
    skipped: SkippedLocation[] = []
  ): RecommendationsResponse => ({
    ...base,
    recommendations: [],
    reason,
    skipped
  });
  if (base.budget <= 0) return empty("over_daily_budget");

  const prefs = data.preferences ?? {};
  const weights = objectiveWeights(prefs.nutrition_priorities ?? []);
  const preferred = new Set(prefs.preferred_location_ids ?? []);
  const skipped: SkippedLocation[] = [];
  const skip = (location: LocationRecord, reason: string) =>
    skipped.push({
      location_id: location.id,
      location_name: location.name,
      reason
    });

  const candidates = [...data.locations]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((location) =>
      options.locationId
        ? location.id === options.locationId
        : preferred.size === 0 || preferred.has(location.id)
    )
    .map((location) => ({
      ...location,
      open_status: getOpenStatus(location.hours, options.at)
    }))
    .filter((location) => {
      if (location.open_status === "closed") {
        skip(location, "Closed right now");
        return false;
      }
      if (!location.accepts_dining_dollars) {
        skip(location, "Doesn't take Dining Dollars");
        return false;
      }
      return true;
    });
  if (candidates.length === 0)
    return empty("no_eligible_locations", skipped);

  // Only items being served right now: a breakfast item after its window, or one whose serving
  // time is unknown (e.g. Subway breakfast), is never recommended. Locations here are already open
  // (or have unknown hours, see above), so the item's own window decides.
  const servedNow = (windows: MenuItem["serving_windows"]) =>
    servingWindowStatus(windows, options.at) === "open";
  const allowed = data.menu.items.filter(
    (item) => isMealAllowed(item, prefs) && servedNow(item.serving_windows)
  );
  const recommendations: Recommendation[] = [];

  for (const location of candidates) {
    const standalone: StandaloneOption[] = allowed.flatMap((item) => {
      const offering = item.offerings.find(
        (o) => o.location_id === location.id
      );
      const nutrition = fullNutrition(item);
      return offering && nutrition
        ? [{ id: item.id, name: item.name, price: Number(offering.price), nutrition }]
        : [];
    });
    const components: ComponentOption[] = allowed.flatMap((item) => {
      const nutrition = fullNutrition(item);
      return item.meal_component &&
        item.restaurant === location.restaurant &&
        nutrition
        ? [{ id: item.id, name: item.name, part: item.meal_component, nutrition }]
        : [];
    });
    const combos: ComboOption[] = data.menu.combos
      .filter(
        (c) =>
          c.restaurant === location.restaurant &&
          isBuildYourOwnCombo(c) &&
          servedNow(c.serving_windows)
      )
      .map((c) => ({
        id: c.id,
        name: c.name,
        price: Number(c.price),
        base_count: Number(c.base_count),
        entree_count: Number(c.entree_count)
      }))
      // A combo is only possible if the filters leave a base and an entree to put in it.
      .filter(
        (c) =>
          (c.base_count === 0 || components.some((o) => o.part === "base")) &&
          (c.entree_count === 0 || components.some((o) => o.part === "entree"))
      );

    const model = buildModel({
      standalone,
      components,
      combos,
      targets: base.targets,
      budget: base.budget,
      weights
    });
    if (!model) {
      skip(location, "No priced meals with nutrition info match your filters");
      continue;
    }
    const solution = await solveModel(model);
    if (solution.status !== "Optimal") {
      skip(
        location,
        solution.status === "Infeasible"
          ? "Nothing here fits your budget"
          : `Solver stopped: ${solution.status}`
      );
      continue;
    }
    recommendations.push(
      toRecommendation(location, model, solution, base.targets, base.budget)
    );
  }

  // Ties: objective, then cost, then location name.
  recommendations.sort(
    (a, b) =>
      a.objective - b.objective ||
      a.total_price - b.total_price ||
      a.location.name.localeCompare(b.location.name)
  );
  const limit = options.limit ?? 3;
  const top = recommendations.slice(0, limit);
  return top.length
    ? { ...base, recommendations: top, reason: null, skipped }
    : empty("no_feasible_meals", skipped);
}

// ---------- Loading (Supabase) ----------

export async function loadRecommendationData(
  db: SupabaseClient,
  userId: string,
  at: Date
): Promise<RecommendationData> {
  const [profile, goals, preferences, todayLogs, locations, menu] =
    await Promise.all([
      getProfile(db, userId),
      getGoals(db, userId),
      getPreferences(db, userId),
      listMealLogs(db, userId, { from: startOfDiningDay(at).toISOString() }),
      db
        .from("dining_locations")
        .select("id, name, restaurant, campus_area, accepts_dining_dollars, hours")
        .order("name"),
      getMenu(db, { at })
    ]);
  if (locations.error) throw locations.error;
  return {
    profile: profile as RecommendationData["profile"],
    goals: goals as MacroValues | null,
    preferences: preferences as RecommendationData["preferences"],
    todayLogs: todayLogs as unknown as LoggedMeal[],
    locations: locations.data as LocationRecord[],
    menu
  };
}

export async function getRecommendations(
  db: SupabaseClient,
  userId: string,
  options: RecommendationOptions
) {
  return recommend(
    await loadRecommendationData(db, userId, options.at),
    options
  );
}

export async function getMealTargets(
  db: SupabaseClient,
  userId: string,
  options: RecommendationOptions
) {
  return computeMealTargets(
    await loadRecommendationData(db, userId, options.at),
    options
  );
}
