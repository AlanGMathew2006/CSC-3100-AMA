// Macro Match score (US-07): how closely a meal's macros hit the targets for the next meal.
// Pure and deterministic, so the web app and the backend always agree on the score.

export const MACROS = ["calories", "protein_g", "carbs_g", "fat_g"] as const;
export type Macro = (typeof MACROS)[number];

// null/undefined = unknown. Never treat an unknown value as 0 (US-04).
export type MacroValues = Partial<Record<Macro, number | null>>;
export type MacroWeights = Partial<Record<Macro, number>>;

export type MacroStatus = "under" | "on_target" | "over" | "unavailable";

export interface MacroBreakdown {
  actual: number | null;
  target: number | null;
  pct_of_target: number | null; // rounded percent; null when the target is 0 or unknown
  status: MacroStatus;
}

export interface MacroMatchResult {
  // 0-100, or null when no macro has both a value and a target.
  score: number | null;
  breakdown: Record<Macro, MacroBreakdown>;
}

// Within 10% of the target counts as on target.
export const ON_TARGET_TOLERANCE = 0.1;

const known = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value);

function macroStatus(actual: number, target: number): MacroStatus {
  if (target === 0) return actual === 0 ? "on_target" : "over";
  if (actual < target * (1 - ON_TARGET_TOLERANCE)) return "under";
  if (actual > target * (1 + ON_TARGET_TOLERANCE)) return "over";
  return "on_target";
}

// score = round(100 * max(0, 1 - sum_k w_k * |actual_k - target_k| / target_k / sum_k w_k)),
// over the macros that have both a value and a target. A target of 0 divides by 1 instead
// (same as the optimizer), so any amount counts as going over.
export function macroMatch(
  nutrition: MacroValues,
  targets: MacroValues,
  weights: MacroWeights = {},
): MacroMatchResult {
  let weightedError = 0;
  let weightSum = 0;
  const breakdown = {} as Record<Macro, MacroBreakdown>;

  for (const macro of MACROS) {
    const actual = known(nutrition[macro]) ? (nutrition[macro] as number) : null;
    const target = known(targets[macro]) ? Math.max(targets[macro] as number, 0) : null;
    if (actual === null || target === null) {
      breakdown[macro] = { actual, target, pct_of_target: null, status: "unavailable" };
      continue;
    }
    breakdown[macro] = {
      actual,
      target,
      pct_of_target: target > 0 ? Math.round((100 * actual) / target) : null,
      status: macroStatus(actual, target),
    };
    const weight = weights[macro] ?? 1;
    if (weight <= 0) continue;
    weightedError += (weight * Math.abs(actual - target)) / Math.max(target, 1);
    weightSum += weight;
  }

  const score =
    weightSum === 0 ? null : Math.round(100 * Math.max(0, 1 - weightedError / weightSum));
  return { score, breakdown };
}
