// Nutrition for meals made of several items (combos, a Panda plate built in the app).
import { MACROS, type Macro, type MacroValues } from "./macro-match.js";

// What a fixed-content combo contains (menu_combos.contents, from data/combo_contents.json).
// Meal ids are meals.id. A slot is a choice the customer makes (e.g. the side of a Chick-fil-A
// meal); its choices are included in the combo price.
export const COMBO_SLOTS = ["side", "drink"] as const;
export type ComboSlot = (typeof COMBO_SLOTS)[number];

export type ComboComponent =
  | { meal: string; servings: number }
  | { slot: ComboSlot; choices: string[]; default: string };

export interface ComboContents {
  source: string;
  // Only verified contents are recommended or shown as the combo's nutrition.
  verified: boolean;
  components: ComboComponent[];
  notes?: string | null;
}

export interface MacroPart {
  item: Partial<Record<Macro, number | null>>;
  servings: number;
}

// Sums each macro over the parts (value x servings). If any part's value is unknown, that macro
// is null (unavailable), never 0. Rounded to 0.1.
export function sumMacros(parts: MacroPart[]): Record<Macro, number | null> {
  const totals = {} as Record<Macro, number | null>;
  for (const macro of MACROS) {
    let sum: number | null = parts.length ? 0 : null;
    for (const { item, servings } of parts) {
      const value = item[macro];
      if (value == null || sum == null) {
        sum = null;
        break;
      }
      sum += Number(value) * servings;
    }
    totals[macro] = sum == null ? null : Math.round(sum * 10) / 10;
  }
  return totals satisfies MacroValues;
}

// Bowl / Plate / Bigger Plate: a base and entree count, and the customer picks the contents.
// Numbered plates (#1-#6) also have counts, but their contents are fixed.
export const isBuildYourOwnCombo = (combo: {
  name: string;
  base_count: number | null;
  entree_count: number | null;
}) => combo.base_count != null && combo.entree_count != null && !/^#\d/.test(combo.name);

export type SlotPicks = Partial<Record<ComboSlot, string>>;

export interface ComboPart<T> {
  meal_id: string;
  item: T | undefined; // undefined when the meal isn't in the menu
  servings: number;
  slot: ComboSlot | null;
}

// Every part of a combo: fixed parts, then each slot's pick (or its default when the pick isn't
// one of its choices). Empty when the combo has no contents.
export function comboParts<T extends { id: string }>(
  combo: { contents?: ComboContents | null },
  items: T[],
  slotPicks: SlotPicks = {}
): ComboPart<T>[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return (combo.contents?.components ?? []).map((component) => {
    if ("meal" in component) {
      return {
        meal_id: component.meal,
        item: byId.get(component.meal),
        servings: component.servings,
        slot: null
      };
    }
    const pick = slotPicks[component.slot];
    const mealId = pick && component.choices.includes(pick) ? pick : component.default;
    return { meal_id: mealId, item: byId.get(mealId), servings: 1, slot: component.slot };
  });
}

// Total nutrition of a combo with the chosen (or default) slot items. A macro is null when any
// part's value is unknown, a part isn't in the menu, or the combo has no contents.
export function comboNutrition<T extends { id: string } & Partial<Record<Macro, number | null>>>(
  combo: { contents?: ComboContents | null },
  items: T[],
  slotPicks: SlotPicks = {}
): Record<Macro, number | null> {
  return sumMacros(
    comboParts(combo, items, slotPicks).map(({ item, servings }) => ({
      item: item ?? {},
      servings
    }))
  );
}
