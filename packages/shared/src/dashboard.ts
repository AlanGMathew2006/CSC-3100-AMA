import type { DashboardData, MealLogInput, UserPreferences } from "./dashboard-types.js";
import type { MenuItem, Profile } from "./index.js";
import type { Recommendation } from "./recommendations.js";
import { recommendationAsMenuItem, recommendationParts } from "./recommendation-helpers.js";

// Numbers and text for the dashboard, so the web and mobile apps compute them the same way.

export type NutrientKey = "protein_g" | "carbs_g" | "fat_g" | "fiber_g";
export type DashboardView = "daily" | "weekly";

export const money = (amount: number) => `$${amount.toFixed(2)}`;

export function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

interface UserLike {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

// Profile name, then the sign-up name, then the part of the email before "@".
export function displayName(profile: Profile | null | undefined, user: UserLike | null | undefined): string {
  const metadata = user?.user_metadata ?? {};
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return (
    profile?.display_name ||
    text(metadata.display_name) ||
    text(metadata.full_name) ||
    text(metadata.name) ||
    user?.email?.split("@")[0] ||
    "Student"
  );
}

export interface MacroSummaryRow {
  key: NutrientKey;
  label: string;
  eaten: number | undefined;
  goal: number | null;
  color: "protein" | "carbs" | "fat" | "fiber";
  // "12 / 100g", or "12g · no goal" when there is no goal.
  text: string;
  // 0-100, for the progress bar.
  percent: number;
}

export interface NutritionView {
  caloriesGoal: number | null;
  caloriesEaten: number;
  caloriesRemaining: number | null;
  // The big number in the ring, its caption and the line under it.
  centerValue: string;
  centerLabel: string;
  centerDetail: string;
  // 0-100 share of the calorie goal eaten (0 without a goal).
  caloriesPercent: number;
  macros: MacroSummaryRow[];
}

export function nutritionView(data: DashboardData | null, view: DashboardView): NutritionView {
  const days = view === "daily" ? 1 : 7;
  const totals = data ? (view === "daily" ? data.today : data.week) : null;
  const goalFor = (value: number | null | undefined) => (value == null ? null : value * days);
  const caloriesGoal = goalFor(data?.goals?.calories);
  const caloriesEaten = Math.round(totals?.calories ?? 0);
  const caloriesRemaining =
    caloriesGoal == null ? null : Math.max(caloriesGoal - caloriesEaten, 0);
  const rows: Array<[NutrientKey, string, MacroSummaryRow["color"]]> = [
    ["protein_g", "Protein", "protein"],
    ["carbs_g", "Carbs", "carbs"],
    ["fat_g", "Fat", "fat"],
    ["fiber_g", "Fiber", "fiber"],
  ];
  const macros = rows.map(([key, label, color]) => {
    const eaten = totals?.[key];
    const goal = goalFor(data?.goals?.[key]);
    return {
      key,
      label,
      eaten,
      goal,
      color,
      text:
        goal == null
          ? `${Math.round(eaten ?? 0)}g · no goal`
          : `${Math.round(eaten ?? 0)} / ${goal}g`,
      percent: goal ? Math.min(((eaten ?? 0) / goal) * 100, 100) : 0,
    };
  });
  return {
    caloriesGoal,
    caloriesEaten,
    caloriesRemaining,
    centerValue:
      view === "weekly" && caloriesGoal != null
        ? Math.round(caloriesEaten / 7).toLocaleString()
        : (caloriesRemaining ?? caloriesEaten).toLocaleString(),
    centerLabel:
      view === "weekly"
        ? "Weekly average"
        : caloriesRemaining == null
          ? "Calories Logged"
          : "Calories Remaining",
    centerDetail:
      caloriesGoal == null
        ? "No calorie goal set"
        : `${caloriesEaten.toLocaleString()} / ${caloriesGoal.toLocaleString()} kcal`,
    caloriesPercent: caloriesGoal ? Math.min((caloriesEaten / caloriesGoal) * 100, 100) : 0,
    macros,
  };
}

export type RingColor = "protein" | "carbs" | "fat";

export interface RingSegment {
  key: RingColor;
  label: string;
  // Calories from this macro: protein and carbs 4 per gram, fat 9 per gram.
  kcal: number;
  // Share of the whole circle (0-1). The rest of the circle stays the gray track.
  fraction: number;
}

const KCAL_PER_GRAM: Record<RingColor, number> = { protein: 4, carbs: 4, fat: 9 };

// The three colored parts of the nutrition ring, in drawing order starting at 12 o'clock.
// Uses the same totals and calorie goal as nutritionView. Missing macros count as 0.
// Each share is kcal / max(calorie goal, total macro kcal), so the ring never overflows;
// without a calorie goal the ring is scaled to the total macro kcal.
export function nutritionRingSegments(data: DashboardData | null, view: DashboardView): RingSegment[] {
  const totals = data ? (view === "daily" ? data.today : data.week) : null;
  const goal = data?.goals?.calories == null ? 0 : data.goals.calories * (view === "daily" ? 1 : 7);
  const parts: Array<[RingColor, string, number | undefined]> = [
    ["protein", "Protein", totals?.protein_g],
    ["carbs", "Carbs", totals?.carbs_g],
    ["fat", "Fat", totals?.fat_g],
  ];
  const kcals = parts.map(([key, , grams]) => (Number.isFinite(grams) ? Math.max(grams ?? 0, 0) : 0) * KCAL_PER_GRAM[key]);
  const denominator = Math.max(goal, kcals.reduce((sum, kcal) => sum + kcal, 0));
  return parts.map(([key, label], index) => ({
    key,
    label,
    kcal: kcals[index],
    fraction: denominator > 0 ? kcals[index] / denominator : 0,
  }));
}

export const ringLegendText = (segment: RingSegment) => `${segment.label} · ${Math.round(segment.kcal)} kcal`;

export interface RingArc {
  key: RingColor;
  // stroke-dasharray "<dash> <circumference>" and stroke-dashoffset for a circle starting at 12 o'clock
  // (rotate the circle -90 degrees), drawn with round caps.
  dash: number;
  offset: number;
}

// Dash lengths for drawing the segments as round-capped arcs with a small gap between them.
export function ringArcs(segments: RingSegment[], radius: number, stroke: number, gap = 3): RingArc[] {
  const circumference = 2 * Math.PI * radius;
  const visible = segments.filter((segment) => segment.fraction > 0);
  let start = 0;
  const arcs: RingArc[] = [];
  for (const segment of segments) {
    const length = segment.fraction * circumference;
    if (segment.fraction > 0) {
      // Round caps stick out half a stroke at each end, so shorten the dash to keep the gap.
      const inset = visible.length > 1 ? (gap + stroke) / 2 : 0;
      arcs.push({
        key: segment.key,
        dash: Math.max(length - 2 * inset, 0.01),
        offset: -(start + inset),
      });
    }
    start += length;
  }
  return arcs;
}

export interface WeeklyDay {
  label: string;
  calories: number;
}

// Monday to Sunday of the current week with the calories logged on each day.
export function weeklyDays(weekLogs: MealLogInput[] | undefined, now: Date): WeeklyDay[] {
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return labels.map((label, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const calories = (weekLogs ?? [])
      .filter((log) => {
        if (!log.eaten_at) return false;
        const eaten = new Date(log.eaten_at);
        return (
          eaten.getFullYear() === day.getFullYear() &&
          eaten.getMonth() === day.getMonth() &&
          eaten.getDate() === day.getDate()
        );
      })
      .reduce((sum, log) => sum + (log.calories ?? 0), 0);
    return { label, calories };
  });
}

// The tallest weekly bar: the daily goal or the busiest day, whichever is larger.
export function maxDailyCalories(days: WeeklyDay[], caloriesGoal: number | null, dayCount: number): number {
  return Math.max(caloriesGoal == null ? 1 : caloriesGoal / dayCount, ...days.map((day) => day.calories), 1);
}

// Bar height as a percent of the track; a day with any calories always shows a sliver.
export const weeklyBarPercent = (calories: number, max: number): number =>
  Math.max((calories / max) * 100, calories ? 8 : 0);

export interface DiningDollarsView {
  balance: number;
  dailyTarget: number | null;
  spentToday: number;
  spentWeek: number;
  weeklyBudget: number | null;
  budgetPercent: number;
  // "$4.00 of $20.00 target spent today", or just the amount without a target.
  spentText: string;
  // Shown when budget alerts are on and there is a target.
  tag: "Over target" | "Near target" | "On track" | null;
  weekSpentText: string;
  weeklyBudgetText: string | null;
  weeklyStatusText: string | null;
}

export function diningDollarsView(
  data: DashboardData | null,
  preferences: Pick<UserPreferences, "budget_alerts_enabled"> | null,
): DiningDollarsView {
  const balance = data?.profile?.dining_dollars_balance ?? 0;
  const dailyTarget = data?.profile?.daily_spending_target ?? null;
  const spentToday = data?.today.spent ?? 0;
  const spentWeek = data?.week.spent ?? 0;
  const weeklyBudget = dailyTarget == null ? null : dailyTarget * 7;
  return {
    balance,
    dailyTarget,
    spentToday,
    spentWeek,
    weeklyBudget,
    budgetPercent:
      dailyTarget && dailyTarget > 0 ? Math.min((spentToday / dailyTarget) * 100, 100) : 0,
    spentText:
      dailyTarget == null
        ? money(spentToday)
        : `${money(spentToday)} of ${money(dailyTarget)} target spent today`,
    tag:
      preferences?.budget_alerts_enabled && dailyTarget != null
        ? spentToday > dailyTarget
          ? "Over target"
          : spentToday >= dailyTarget * 0.8
            ? "Near target"
            : "On track"
        : null,
    weekSpentText: `Spent this week: ${money(spentWeek)}`,
    weeklyBudgetText: weeklyBudget == null ? null : `Recommended weekly budget: ${money(weeklyBudget)}`,
    weeklyStatusText:
      weeklyBudget == null
        ? null
        : spentWeek <= weeklyBudget
          ? `You're ${money(weeklyBudget - spentWeek)} under your weekly budget.`
          : `You're ${money(spentWeek - weeklyBudget)} over your weekly budget.`,
  };
}

export interface RecommendationEntry {
  rec: Recommendation;
  // The whole recommendation shown as one meal card.
  item: MenuItem;
  // The real menu item for a single-item recommendation, when the menu has loaded.
  meal: MenuItem | undefined;
  single: boolean;
  // "Includes: A + B + C" when the card title hides some items.
  includes: string | null;
}

// Each recommendation as a meal card entry. They show even when the menu hasn't loaded.
export function recommendationEntries(
  recommendations: Recommendation[],
  menuItems: MenuItem[],
): RecommendationEntry[] {
  return recommendations.flatMap((rec) => {
    const item = recommendationAsMenuItem(rec, menuItems);
    const meal = item ? menuItems.find((candidate) => candidate.id === item.id) : undefined;
    const single = !rec.combo && rec.items.length === 1;
    // The card title is shortened to 2 items; list them all when some are hidden.
    const parts = recommendationParts(rec);
    const includes = parts.length > 2 ? `Includes: ${parts.join(" + ")}` : null;
    return item ? [{ rec, item, meal, single: single && Boolean(meal), includes }] : [];
  });
}

// "Today's Nutrition" / "This Week's Nutrition".
export const nutritionHeading = (view: DashboardView) =>
  view === "daily" ? "Today's Nutrition" : "This Week's Nutrition";

function localDayStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Weeks start on Monday.
function localWeekStart(now: Date): Date {
  const start = localDayStart(now);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

// Query string for GET /api/dashboard: the start of today and of this week in the device's time zone.
export function dashboardQuery(now: Date = new Date()): string {
  return (
    `?day_start=${encodeURIComponent(localDayStart(now).toISOString())}` +
    `&week_start=${encodeURIComponent(localWeekStart(now).toISOString())}`
  );
}

export interface RecommendationParams {
  limit?: number;
  locationId?: string;
  mealsRemaining?: number;
}

// Query string for GET /api/recommendations and GET /api/meal-targets.
export function recommendationQuery({ limit, locationId, mealsRemaining }: RecommendationParams): string {
  const parts: string[] = [];
  if (limit != null) parts.push(`limit=${encodeURIComponent(String(limit))}`);
  if (locationId) parts.push(`location_id=${encodeURIComponent(locationId)}`);
  if (mealsRemaining != null) parts.push(`meals_remaining=${encodeURIComponent(String(mealsRemaining))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}
