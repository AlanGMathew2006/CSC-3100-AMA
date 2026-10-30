// Response types for GET /api/recommendations and GET /api/meal-targets.
import type { OpenStatus } from "./hours.js";
import type { MealRole } from "./index.js";
import type { MacroMatchResult, MacroValues } from "./macro-match.js";

export interface MealTargetsResponse {
  // Per-meal targets: what is left of today's goals, split over the meals left today.
  // A macro is null when the user has no goal for it.
  targets: MacroValues;
  remaining: MacroValues;
  meals_remaining: number;
  // Dining Dollars available for this meal: min(balance, daily target - spent today).
  budget: number;
  spent_today: number;
}

export interface RecommendationItem {
  meal_id: string;
  name: string;
  quantity: number;
  // Standalone price each; null for parts of a combo (the combo carries the price).
  unit_price: number | null;
  combo_part: "base" | "entree" | null;
  meal_role: MealRole;
}

export interface Recommendation {
  location: {
    id: string;
    name: string;
    campus_area: string | null;
    open_status: OpenStatus;
  };
  combo: { id: string; name: string; price: number } | null;
  items: RecommendationItem[];
  total_price: number;
  nutrition: MacroValues;
  targets: MacroValues;
  macro_match: MacroMatchResult;
  explanation: string;
  objective: number;
}

export type RecommendationsReason =
  | "over_daily_budget"
  | "no_eligible_locations"
  | "no_feasible_meals";

export interface SkippedLocation {
  location_id: string;
  location_name: string;
  reason: string;
}

export interface RecommendationsResponse extends MealTargetsResponse {
  recommendations: Recommendation[];
  // Set when recommendations is empty, so the UI can explain why.
  reason: RecommendationsReason | null;
  skipped: SkippedLocation[];
}
