import { normalizeAllergen } from "./dietary.js";

// Allergen and avoided-food list rules used by the allergen picker in onboarding and Profile.
// Allergens are stored as codes ("tree_nut"); older values like "Nuts" still count.

export const MAX_FOOD_LENGTH = 100; // the API accepts strings up to 100 characters

export const ALLERGEN_HIDDEN_NOTE =
  "Meals without verified allergen information are hidden while an allergen is selected.";
export const AVOID_FOOD_NOTE = "Hides meals with this word in their name.";

export const isAllergenSelected = (allergens: string[], code: string): boolean =>
  allergens.some((value) => normalizeAllergen(value) === code);

export function toggleAllergen(allergens: string[], code: string): string[] {
  return isAllergenSelected(allergens, code)
    ? allergens.filter((value) => normalizeAllergen(value) !== code)
    : [...allergens, code];
}

// Adds a trimmed food unless it is blank or already listed (ignoring case).
export function addExcludedFood(foods: string[], input: string): string[] {
  const name = input.trim();
  if (!name) return foods;
  if (foods.some((entry) => entry.toLowerCase() === name.toLowerCase())) return foods;
  return [...foods, name];
}
