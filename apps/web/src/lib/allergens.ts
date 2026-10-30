// Display names for the allergen codes in meals.allergens.
const LABELS: Record<string, string> = {
  milk: "Milk",
  egg: "Egg",
  wheat: "Wheat",
  soy: "Soy",
  peanut: "Peanut",
  tree_nut: "Tree nuts",
  fish: "Fish",
  shellfish: "Shellfish",
  sesame: "Sesame",
};

export const allergenLabel = (code: string): string => LABELS[code] ?? code.replace(/_/g, " ");
