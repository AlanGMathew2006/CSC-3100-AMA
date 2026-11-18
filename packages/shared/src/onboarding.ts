import type { OnboardingInput } from "./index.js";
import type { UserPreferences } from "./dashboard-types.js";

// Onboarding and Profile form rules shared by the web and mobile apps.

export const NUTRITION_PRIORITIES = ["High protein", "Lower calorie", "Balanced", "Budget-friendly"];
export const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Halal-friendly", "Gluten-free", "No seafood"];

export const EMPTY_PREFERENCES: UserPreferences = {
  dietary_restrictions: [],
  allergens: [],
  cuisine_preferences: [],
  preferred_location_ids: [],
  excluded_foods: [],
  nutrition_priorities: [],
  budget_alerts_enabled: true,
  theme: "light",
};

export type OnboardingFieldName = "balance" | "target" | "calories" | "protein" | "carbs" | "fat";
export type OnboardingValues = Record<OnboardingFieldName, string>;

export const DEFAULT_ONBOARDING_VALUES: OnboardingValues = {
  balance: "",
  target: "",
  calories: "2000",
  protein: "100",
  carbs: "250",
  fat: "70",
};

export const ALLERGEN_SAVE_FAILED_MESSAGE =
  "Your plan was saved, but we couldn't save your allergens and avoided foods. Try again.";

export const toNumber = (value: string): number => Number(value.trim());

const isValid = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
};

export function toggleValue(value: string, values: string[]): string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

// The first problem in the onboarding form, or null when it can be submitted.
export function validateOnboarding(
  values: OnboardingValues,
): { field: OnboardingFieldName; message: string } | null {
  const invalid = (Object.keys(values) as OnboardingFieldName[]).find(
    (name) => !isValid(values[name]),
  );
  if (invalid) return { field: invalid, message: "Enter a number of 0 or more in every field." };
  const fractionalGoal = (["calories", "protein", "carbs", "fat"] as const).find(
    (name) => !Number.isInteger(toNumber(values[name])),
  );
  if (fractionalGoal) {
    return { field: fractionalGoal, message: "Enter whole numbers for your nutrition goals." };
  }
  return null;
}

export function onboardingInput(
  values: OnboardingValues,
  choices: {
    nutritionPriorities: string[];
    dietaryRestrictions: string[];
    preferredLocations: string[];
  },
): OnboardingInput {
  return {
    dining_dollars_balance: toNumber(values.balance),
    daily_spending_target: toNumber(values.target),
    calories: toNumber(values.calories),
    protein_g: toNumber(values.protein),
    carbs_g: toNumber(values.carbs),
    fat_g: toNumber(values.fat),
    nutrition_priorities: choices.nutritionPriorities,
    dietary_restrictions: choices.dietaryRestrictions,
    preferred_location_ids: choices.preferredLocations,
  };
}

// The Profile page's money fields; returns the error to show, or null. Both stay as typed text.
export function validateProfileMoney(balance: string, target: string): string | null {
  const balanceValue = Number(balance);
  const targetValue = Number(target);
  if (!Number.isFinite(balanceValue) || balanceValue < 0) {
    return "Enter a valid non-negative Dining Dollars balance.";
  }
  if (!Number.isFinite(targetValue) || targetValue < 0) {
    return "Enter a valid non-negative daily target.";
  }
  return null;
}
