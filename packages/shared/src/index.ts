// Shared utilities and types used across apps/packages.
import type { ItemAvailability, OpenStatus, ServingWindows } from "./hours.js";

export * from "./dietary.js";
export * from "./hours.js";
export * from "./macro-match.js";
export * from "./recommendations.js";

export interface OnboardingInput {
  dining_dollars_balance: number;
  daily_spending_target: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  nutrition_priorities?: string[];
  dietary_restrictions?: string[];
  preferred_location_ids?: string[];
}

// ---------- Menu (GET /api/menu) ----------
export interface MenuOffering {
  location_id: string;
  location_name: string;
  campus_area: string | null;
  price: number;
  service_date: string;
  // From the location's hours at request time; "unknown" when hours have not been collected.
  open_status: OpenStatus;
  // Location hours AND the item's serving window (e.g. breakfast) at request time.
  availability: ItemAvailability;
}

export interface MenuItem {
  id: string;
  name: string;
  restaurant: string;
  category: string;
  serving: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_component: "base" | "entree" | null;
  tags?: string[];
  // Only meaningful when allergens_verified is true; otherwise show "Allergen info unavailable".
  allergens?: string[];
  allergens_verified?: boolean;
  serving_windows?: ServingWindows;
  // Latest price at each location; empty when the item has no standalone price (combo only).
  offerings: MenuOffering[];
}

export interface MenuCombo {
  id: string;
  restaurant: string;
  name: string;
  description: string | null;
  base_count: number | null;
  entree_count: number | null;
  price: number;
  serving_windows?: ServingWindows;
  // Across the restaurant's locations: available if any is serving it now.
  availability?: ItemAvailability;
}

export interface MenuResponse {
  items: MenuItem[];
  combos: MenuCombo[];
}
