// Allergen and dietary filtering (US-08). Pure functions shared by the backend and the web app.
// Missing or unverified allergen data never counts as "allergen-free": when a rule depends on
// allergen/tag data, an unverified meal is excluded.

export const ALLERGENS = [
  "milk",
  "egg",
  "wheat",
  "soy",
  "peanut",
  "tree_nut",
  "fish",
  "shellfish",
  "sesame",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const DIETARY_TAGS = ["vegetarian", "vegan", "gluten_free", "contains_pork"] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

export interface DietaryMeal {
  name: string;
  allergens?: string[] | null;
  tags?: string[] | null;
  // True only when allergens and tags were confirmed from an official source.
  allergens_verified?: boolean | null;
}

export interface DietaryPreferences {
  dietary_restrictions?: string[] | null; // labels from the app, e.g. "Vegetarian", "No seafood"
  allergens?: string[] | null;
  excluded_foods?: string[] | null;
}

const key = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

const ALLERGEN_ALIASES: Record<string, Allergen> = {
  eggs: "egg",
  dairy: "milk",
  gluten: "wheat",
  soybean: "soy",
  soybeans: "soy",
  peanuts: "peanut",
  tree_nuts: "tree_nut",
  nuts: "tree_nut",
  shellfish: "shellfish",
};

// "Tree Nuts" -> "tree_nut"; returns null for allergens we don't track.
export function normalizeAllergen(value: string): Allergen | null {
  const normalized = key(value);
  if ((ALLERGENS as readonly string[]).includes(normalized)) return normalized as Allergen;
  return ALLERGEN_ALIASES[normalized] ?? null;
}

const SEAFOOD: Allergen[] = ["fish", "shellfish"];

// Every reason the meal is filtered out for these preferences; empty means it is allowed.
export function mealRestrictionReasons(meal: DietaryMeal, prefs: DietaryPreferences): string[] {
  const reasons: string[] = [];
  const allergens = new Set((meal.allergens ?? []).map(key));
  const tags = new Set((meal.tags ?? []).map(key));
  const verified = meal.allergens_verified === true;
  const restrictions = new Set((prefs.dietary_restrictions ?? []).map(key));
  const userAllergens = (prefs.allergens ?? []).filter((value) => value.trim() !== "");
  let needsVerifiedData = userAllergens.length > 0;

  if (restrictions.has("vegetarian") && !tags.has("vegetarian") && !tags.has("vegan")) {
    reasons.push("Not marked vegetarian");
  }
  if (restrictions.has("vegan") && !tags.has("vegan")) reasons.push("Not marked vegan");
  if (restrictions.has("gluten_free") && !tags.has("gluten_free")) {
    reasons.push("Not marked gluten-free");
  }
  if (restrictions.has("no_seafood")) {
    needsVerifiedData = true;
    if (SEAFOOD.some((allergen) => allergens.has(allergen))) reasons.push("Contains seafood");
  }
  // "Halal-friendly" only excludes meals tagged contains_pork. It is NOT halal certification:
  // it says nothing about how meat was slaughtered or prepared.
  if (restrictions.has("halal_friendly")) {
    needsVerifiedData = true;
    if (tags.has("contains_pork")) reasons.push("Contains pork");
  }

  for (const value of userAllergens) {
    const allergen = normalizeAllergen(value);
    if (allergen && allergens.has(allergen)) reasons.push(`Contains ${allergen.replace("_", " ")}`);
  }
  // Safe default for US-08: without verified data we can't promise the meal is free of anything.
  if (needsVerifiedData && !verified) reasons.push("Allergen info unavailable");

  const name = meal.name.toLowerCase();
  for (const food of prefs.excluded_foods ?? []) {
    const term = food.trim().toLowerCase();
    if (term && name.includes(term)) reasons.push(`Excluded food: ${food.trim()}`);
  }
  return reasons;
}

// Shown wherever the "Halal-friendly" option appears.
export const HALAL_FRIENDLY_NOTE =
  "Halal-friendly only hides meals marked as containing pork. It is not halal certification.";

export function isMealAllowed(meal: DietaryMeal, prefs: DietaryPreferences): boolean {
  return mealRestrictionReasons(meal, prefs).length === 0;
}
