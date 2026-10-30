import type { MenuItem, Recommendation, RecommendationsReason } from "@csc-3100-ama/shared";

// "Plate: Fried Rice + Orange Chicken + 2× Broccoli Beef" or "Tuna + Turkey".
export function recommendationLabel(rec: Recommendation): string {
  const parts = rec.items
    .map((item) => (item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name))
    .join(" + ");
  return rec.combo ? `${rec.combo.name}: ${parts}` : parts;
}

// MealCard shows one MenuItem; this wraps a whole recommendation in one. It keeps the first
// item's real id so saving and opening details still point at an actual meal.
export function recommendationAsMenuItem(
  rec: Recommendation,
  menuItems: MenuItem[],
): MenuItem | null {
  const first = rec.items[0];
  const meal = first && menuItems.find((item) => item.id === first.meal_id);
  if (!meal) return null;
  return {
    ...meal,
    name: recommendationLabel(rec),
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

export const NO_RECOMMENDATION_MESSAGES: Record<RecommendationsReason, string> = {
  over_daily_budget:
    "You've reached today's Dining Dollar target, so there are no recommendations right now.",
  no_eligible_locations:
    "None of your dining locations are open and taking Dining Dollars right now.",
  no_feasible_meals:
    "No meals fit your budget and dietary filters right now. Try adjusting your filters.",
};
