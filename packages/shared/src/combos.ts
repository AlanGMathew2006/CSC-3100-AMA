// Nutrition for meals made of several items (combos, a Panda plate built in the app).
import { MACROS, type Macro, type MacroValues } from "./macro-match.js";

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
