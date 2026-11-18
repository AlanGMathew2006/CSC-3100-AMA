import type { Macro, MacroMatchResult, MacroStatus } from "./macro-match.js";

// Display text for the Macro Match summary, shared by the web and mobile apps.
export const MACRO_LABELS: Record<Macro, [string, string]> = {
  calories: ["Calories", ""],
  protein_g: ["Protein", "g"],
  carbs_g: ["Carbs", "g"],
  fat_g: ["Fat", "g"],
};

export const MACRO_STATUS_TEXT: Record<MacroStatus, string> = {
  under: "Under",
  on_target: "On target",
  over: "Over",
  unavailable: "Unavailable",
};

export const macroScoreText = (score: number | null) =>
  score == null ? "Macro Match unavailable" : `Macro Match ${score}`;

// "120g / 150g", or "unavailable" when the value or its target is unknown.
export function macroRowAmount(
  breakdown: MacroMatchResult["breakdown"][Macro],
  unit: string,
): string {
  const { actual, target } = breakdown;
  return actual == null || target == null
    ? "unavailable"
    : `${Math.round(actual)}${unit} / ${Math.round(target)}${unit}`;
}
