// MOCK DATA ONLY, for the DOM tests and the Playwright smoke test. Shaped like the API responses;
// the values are made up and are not real menu data.
import {
  macroMatch,
  type MacroValues,
  type MealTargetsResponse,
  type MenuCombo,
  type MenuItem,
  type MenuOffering,
  type Recommendation,
  type RecommendationsResponse,
} from "@csc-3100-ama/shared";
import type { DashboardData, Profile, UserPreferences } from "../types/dashboard";

const offering = (
  location_id: string,
  location_name: string,
  campus_area: string,
  price: number,
  availability: MenuOffering["availability"] = "available",
): MenuOffering => ({
  location_id,
  location_name,
  campus_area,
  price,
  service_date: "2026-11-01",
  open_status: availability === "not_now" ? "closed" : "open",
  availability,
});

const CFA = { id: "loc-cfa", name: "Chick-fil-A (1901 Marketplace)", area: "1901 Marketplace" };
const PANDA = { id: "loc-panda", name: "Panda Express (1901 Marketplace)", area: "1901 Marketplace" };

const item = (fields: Partial<MenuItem> & Pick<MenuItem, "id" | "name" | "restaurant">): MenuItem => ({
  category: "Entrees",
  serving: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  meal_component: null,
  tags: [],
  allergens: [],
  allergens_verified: false,
  serving_windows: null,
  meal_role: "main",
  offerings: [],
  ...fields,
});

const restaurantLocation = (loc: typeof CFA) => ({
  location_id: loc.id,
  location_name: loc.name,
  campus_area: loc.area,
  open_status: "open" as const,
  availability: "available" as const,
});

export const sandwich = item({
  id: "cfa-deluxe",
  name: "Chick-fil-A Deluxe Sandwich",
  restaurant: "Chick-fil-A",
  calories: 490,
  protein_g: 29,
  carbs_g: 44,
  fat_g: 22,
  allergens: ["milk", "egg", "soy", "wheat", "sesame"],
  allergens_verified: true,
  offerings: [offering(CFA.id, CFA.name, CFA.area, 7.45)],
});

export const fries = item({
  id: "cfa-fries",
  name: "Waffle Potato Fries (Medium)",
  restaurant: "Chick-fil-A",
  category: "Sides",
  meal_role: "side",
  calories: 420,
  protein_g: 5,
  carbs_g: 45,
  fat_g: 24,
  allergens: [],
  allergens_verified: true,
  offerings: [offering(CFA.id, CFA.name, CFA.area, 3.45)],
});

// Unverified allergens and an unknown macro, to check "incomplete" and "unavailable" text.
export const tea = item({
  id: "cfa-tea",
  name: "Sweetened Iced Tea (Medium)",
  restaurant: "Chick-fil-A",
  category: "Beverages",
  meal_role: "drink",
  calories: 120,
  protein_g: 0,
  carbs_g: 31,
  fat_g: null,
  offerings: [offering(CFA.id, CFA.name, CFA.area, 2.89)],
});

export const sauce = item({
  id: "cfa-sauce",
  name: "Chick-fil-A Sauce",
  restaurant: "Chick-fil-A",
  category: "Sauces",
  meal_role: "sauce",
  calories: 140,
  protein_g: 0,
  carbs_g: 7,
  fat_g: 13,
  free_with_meal: true,
  restaurant_locations: [restaurantLocation(CFA)],
  availability: "available",
});

// Sold at two locations, so quick add opens the details page to pick one.
export const subwaySub = item({
  id: "sub-turkey",
  name: "Oven-Roasted Turkey",
  restaurant: "Subway",
  calories: 280,
  protein_g: 18,
  carbs_g: 46,
  fat_g: 3.5,
  offerings: [
    offering("loc-sub-lib", "Subway (Kennedy Library)", "Kennedy Library", 8.29, "not_now"),
    offering("loc-sub-pcv", "Subway (Poly Canyon Village)", "Poly Canyon Village", 8.49),
  ],
});

// Panda combo parts: no standalone price.
const pandaPart = (id: string, name: string, part: "base" | "entree", macros: [number, number, number, number]) =>
  item({
    id,
    name,
    restaurant: "Panda Express",
    category: part === "base" ? "Bases" : "Entrees",
    meal_component: part,
    calories: macros[0],
    protein_g: macros[1],
    carbs_g: macros[2],
    fat_g: macros[3],
    restaurant_locations: [restaurantLocation(PANDA)],
    availability: "available",
  });

export const chowMein = pandaPart("px-chow-mein", "Chow Mein", "base", [520, 14, 89, 12]);
export const friedRice = pandaPart("px-fried-rice", "Fried Rice", "base", [610, 15, 109, 13]);
export const orangeChicken = pandaPart("px-orange", "The Original Orange Chicken", "entree", [560, 19, 63, 25]);
export const broccoliBeef = pandaPart("px-broccoli", "Broccoli Beef", "entree", [150, 9, 13, 7]);

export const MENU_ITEMS: MenuItem[] = [sandwich, fries, tea, sauce, subwaySub, chowMein, friedRice, orangeChicken, broccoliBeef];

const pandaLocations = [restaurantLocation(PANDA)];
const cfaLocations = [restaurantLocation(CFA)];

export const plate: MenuCombo = {
  id: "combo-plate",
  restaurant: "Panda Express",
  name: "Plate",
  description: "1 base + 2 entrees",
  base_count: 1,
  entree_count: 2,
  price: 11.3,
  serving_windows: null,
  contents: null,
  locations: pandaLocations,
  availability: "available",
};

export const deluxeMeal: MenuCombo = {
  id: "combo-deluxe-meal",
  restaurant: "Chick-fil-A",
  name: "Chick-fil-A Deluxe Sandwich Meal",
  description: "Entree + side + drink",
  base_count: null,
  entree_count: null,
  price: 12.45,
  serving_windows: null,
  contents: {
    source: "mock",
    verified: true,
    components: [
      { meal: sandwich.id, servings: 1 },
      { slot: "side", choices: [fries.id], default: fries.id },
      { slot: "drink", choices: [tea.id], default: tea.id },
    ],
  },
  locations: cfaLocations,
  availability: "available",
};

export const tacoCombo: MenuCombo = {
  id: "combo-taco",
  restaurant: "Taco Bell",
  name: "3 Crunchy Taco Combo",
  description: "Includes a drink",
  base_count: null,
  entree_count: null,
  price: 9.19,
  serving_windows: null,
  contents: { source: "mock", verified: false, components: [], notes: "Exact contents not checked yet." },
  locations: [],
  availability: "unknown",
};

export const MENU = { items: MENU_ITEMS, combos: [plate, deluxeMeal, tacoCombo] };

export const TARGETS: MacroValues = { calories: 1000, protein_g: 40, carbs_g: 120, fat_g: 45 };

export const MEAL_TARGETS: MealTargetsResponse = {
  targets: TARGETS,
  remaining: { calories: 2000, protein_g: 80, carbs_g: 240, fat_g: 90 },
  meals_remaining: 2,
  budget: 25,
  spent_today: 0,
};

const nutrition: MacroValues = { calories: 1030, protein_g: 34, carbs_g: 120, fat_g: null };

// A Chick-fil-A meal combo: the parts are "in combo" (no unit price).
export const comboRecommendation: Recommendation = {
  location: { id: CFA.id, name: CFA.name, campus_area: CFA.area, open_status: "open" },
  combo: { id: deluxeMeal.id, name: deluxeMeal.name, price: 12.45 },
  items: [
    { meal_id: sandwich.id, name: sandwich.name, quantity: 1, unit_price: null, combo_part: "entree", meal_role: "main" },
    { meal_id: fries.id, name: fries.name, quantity: 1, unit_price: null, combo_part: "side", meal_role: "side" },
    { meal_id: tea.id, name: tea.name, quantity: 1, unit_price: null, combo_part: "drink", meal_role: "drink" },
  ],
  total_price: 12.45,
  nutrition,
  targets: TARGETS,
  macro_match: macroMatch(nutrition, TARGETS),
  explanation: "Close to your protein and carbs targets, and within today's Dining Dollar target.",
  objective: 1,
};

// A Panda #1 Plate with a half-and-half base.
const plateNutrition: MacroValues = { calories: 1275, protein_g: 42.5, carbs_g: 175, fat_g: 44.5 };
export const plateRecommendation: Recommendation = {
  location: { id: PANDA.id, name: PANDA.name, campus_area: PANDA.area, open_status: "open" },
  combo: { id: "combo-1-plate", name: "#1 Plate", price: 11.3 },
  items: [
    { meal_id: orangeChicken.id, name: orangeChicken.name, quantity: 1, unit_price: null, combo_part: "entree", meal_role: "main" },
    { meal_id: broccoliBeef.id, name: broccoliBeef.name, quantity: 1, unit_price: null, combo_part: "entree", meal_role: "main" },
    { meal_id: friedRice.id, name: friedRice.name, quantity: 0.5, unit_price: null, combo_part: "base", meal_role: "main" },
    { meal_id: chowMein.id, name: chowMein.name, quantity: 0.5, unit_price: null, combo_part: "base", meal_role: "main" },
  ],
  total_price: 11.3,
  nutrition: plateNutrition,
  targets: TARGETS,
  macro_match: macroMatch(plateNutrition, TARGETS),
  explanation: "High protein and within today's Dining Dollar target.",
  objective: 2,
};

// Standalone items with their own prices.
const subNutrition: MacroValues = { calories: 560, protein_g: 36, carbs_g: 92, fat_g: 7 };
export const subRecommendation: Recommendation = {
  location: { id: "loc-sub-pcv", name: "Subway (Poly Canyon Village)", campus_area: "Poly Canyon Village", open_status: "open" },
  combo: null,
  items: [{ meal_id: subwaySub.id, name: subwaySub.name, quantity: 2, unit_price: 8.49, combo_part: null, meal_role: "main" }],
  total_price: 16.98,
  nutrition: subNutrition,
  targets: TARGETS,
  macro_match: macroMatch(subNutrition, TARGETS),
  explanation: "Lower fat and within today's Dining Dollar target.",
  objective: 3,
};

export const RECOMMENDATIONS: RecommendationsResponse = {
  ...MEAL_TARGETS,
  recommendations: [comboRecommendation, plateRecommendation, subRecommendation],
  reason: null,
  skipped: [],
};

export const PROFILE: Profile = {
  id: "user-1",
  display_name: "Test Student",
  dining_dollars_balance: 412.5,
  daily_spending_target: 25,
  onboarding_completed: true,
};

const zeroTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, spent: 0 };

export const DASHBOARD: DashboardData = {
  profile: PROFILE,
  goals: { calories: 2000, protein_g: 80, carbs_g: 240, fat_g: 90, fiber_g: null },
  today: zeroTotals,
  week: zeroTotals,
  recent_logs: [],
  week_logs: [],
};

export const PREFERENCES: UserPreferences = {
  dietary_restrictions: [],
  allergens: [],
  cuisine_preferences: [],
  preferred_location_ids: [],
  excluded_foods: [],
  nutrition_priorities: [],
  budget_alerts_enabled: false,
  theme: "light",
};
