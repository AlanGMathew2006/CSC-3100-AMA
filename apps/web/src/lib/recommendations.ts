import {
  ALLERGENS,
  type MenuItem,
  type Recommendation,
  type RecommendationsReason,
} from "@csc-3100-ama/shared";
import type { MealLogInput } from "../types/dashboard";

// "2× Broccoli Beef", "½ Fried Rice" (half of a half-and-half base), "Chow Mein".
export const quantityLabel = (quantity: number, name: string) =>
  quantity === 0.5 ? `½ ${name}` : quantity > 1 ? `${quantity}× ${name}` : name;

// Every item of a recommendation, in the optimizer's order (main first).
export const recommendationParts = (rec: Recommendation): string[] =>
  rec.items.map((item) => quantityLabel(item.quantity, item.name));

// Items arrive main first from the optimizer. "Plate: 2× Broccoli Beef + Fried Rice", or with
// `maxItems`, "Bigger Plate: Broccoli Beef + Orange Chicken +2 more" so card titles stay short.
export function recommendationLabel(rec: Recommendation, maxItems = Infinity): string {
  const names = recommendationParts(rec);
  const shown = names.slice(0, maxItems).join(" + ");
  const hidden = names.length - Math.min(names.length, maxItems);
  const parts = hidden > 0 ? `${shown} +${hidden} more` : shown;
  return rec.combo ? `${rec.combo.name}: ${parts}` : parts;
}

// A recommendation is several items, so it is logged as one entry at its total price.
// meal_id is only set when it is a single standalone item; unknown nutrition is left out, not 0.
export function recommendationLog(rec: Recommendation): MealLogInput {
  const single = !rec.combo && rec.items.length === 1 ? rec.items[0] : undefined;
  return {
    meal_id: single?.meal_id,
    location_id: rec.location.id,
    name: recommendationLabel(rec),
    location_name: rec.location.name,
    price: rec.total_price,
    calories: rec.nutrition.calories ?? undefined,
    protein_g: rec.nutrition.protein_g ?? undefined,
    carbs_g: rec.nutrition.carbs_g ?? undefined,
    fat_g: rec.nutrition.fat_g ?? undefined,
  };
}

// Union of every item's allergens. `complete` is false when any item's allergens aren't verified
// (or the item isn't in the menu), so the UI must say "Allergen info incomplete".
export function combinedAllergens(
  rec: Recommendation,
  menuItems: MenuItem[],
): { allergens: string[]; containsPork: boolean; complete: boolean } {
  const found = new Set<string>();
  let containsPork = false;
  let complete = true;
  for (const part of rec.items) {
    const meal = menuItems.find((item) => item.id === part.meal_id);
    if (!meal?.allergens_verified) {
      complete = false;
      continue;
    }
    for (const allergen of meal.allergens ?? []) found.add(allergen);
    if (meal.tags?.includes("contains_pork")) containsPork = true;
  }
  const order = ALLERGENS as readonly string[];
  const allergens = [...found].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { allergens, containsPork, complete };
}

// MealCard shows one MenuItem; this wraps a whole recommendation in one. It keeps the first
// item's real id so saving and opening details still point at an actual meal. When the menu
// hasn't loaded (or failed), the card is built from the recommendation alone, so it still shows.
export function recommendationAsMenuItem(
  rec: Recommendation,
  menuItems: MenuItem[],
): MenuItem | null {
  const first = rec.items[0];
  if (!first) return null;
  const meal: MenuItem = menuItems.find((item) => item.id === first.meal_id) ?? {
    id: first.meal_id,
    name: first.name,
    restaurant: rec.location.name,
    category: "",
    serving: null,
    calories: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    meal_component: null,
    allergens_verified: false,
    meal_role: first.meal_role,
    offerings: [],
  };
  return {
    ...meal,
    name: recommendationLabel(rec, 2),
    calories: rec.nutrition.calories ?? null,
    protein_g: rec.nutrition.protein_g ?? null,
    carbs_g: rec.nutrition.carbs_g ?? null,
    fat_g: rec.nutrition.fat_g ?? null,
    offerings: [
      {
        location_id: rec.location.id,
        location_name: rec.location.name,
        campus_area: rec.location.campus_area,
        price: rec.total_price,
        service_date: "",
        open_status: rec.location.open_status,
        // The optimizer only picks items being served right now.
        availability: "available",
      },
    ],
  };
}

// What the user can do next when there are no recommendations: [button label, tab to open].
export const NO_RECOMMENDATION_ACTIONS: Record<RecommendationsReason, [string, "profile" | "explore"]> = {
  over_daily_budget: ["Browse all meals", "explore"],
  no_eligible_locations: ["Browse all meals", "explore"],
  no_feasible_meals: ["Adjust your filters", "profile"],
};

export const NO_RECOMMENDATION_MESSAGES: Record<RecommendationsReason, string> = {
  over_daily_budget:
    "You've reached today's Dining Dollar target, so there are no recommendations right now.",
  no_eligible_locations:
    "None of your dining locations are open and taking Dining Dollars right now.",
  no_feasible_meals:
    "No meals fit your budget and dietary filters right now. Try adjusting your filters.",
};
