// Display helpers so every page shows numbers the same way: whole calories and grams, and
// "unavailable" (never 0 or a dash) for anything unknown.

export const UNAVAILABLE = "unavailable";

// 12.5 -> "13g", null -> "unavailable".
export function formatAmount(value: number | null | undefined, unit = ""): string {
  return value == null ? UNAVAILABLE : `${Math.round(Number(value))}${unit}`;
}
