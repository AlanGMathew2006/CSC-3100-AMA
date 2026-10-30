import { useEffect, useMemo, useState } from "react";
import type { MenuItem, Recommendation } from "@csc-3100-ama/shared";
import { useAuth } from "../../auth";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { MacroMatchSummary, macroScoreText } from "../../components/MacroMatch";
import { MealCard } from "../../components/MealCard";
import { useDashboard } from "../../hooks/useDashboard";
import { useMenu } from "../../hooks/useMenu";
import { useRecommendations } from "../../hooks/useRecommendations";
import { useSavedMeals } from "../../hooks/useSavedMeals";
import { fetchPreferences } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import { NO_RECOMMENDATION_MESSAGES, recommendationAsMenuItem } from "../../lib/recommendations";
import type { UserPreferences } from "../../types/dashboard";
import { NutritionSheet } from "./NutritionSheet";

type NutrientKey = "protein_g" | "carbs_g" | "fat_g" | "fiber_g";

const money = (amount: number) => `$${amount.toFixed(2)}`;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage({
  onNavigate,
  onSelectMeal,
  onToast,
}: {
  onNavigate: (tab: AppTab) => void;
  onSelectMeal: (item: MenuItem) => void;
  onToast: (message: string) => void;
}) {
  const { user } = useAuth();
  const { data, error, logging, reload, addMeal } = useDashboard();
  const menu = useMenu();
  const recs = useRecommendations({ limit: 3 });
  const saved = useSavedMeals();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientKey | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesError, setPreferencesError] = useState("");

  useEffect(() => {
    void fetchPreferences()
      .then(setPreferences)
      .catch((err: unknown) => setPreferencesError(errorMessage(err)));
  }, []);

  const days = view === "daily" ? 1 : 7;
  const totals = data ? (view === "daily" ? data.today : data.week) : null;
  const goalFor = (value: number | null | undefined) =>
    value == null ? null : value * days;
  const caloriesGoal = goalFor(data?.goals?.calories);
  const caloriesEaten = Math.round(totals?.calories ?? 0);
  const caloriesRemaining =
    caloriesGoal == null ? null : Math.max(caloriesGoal - caloriesEaten, 0);
  const macros = [
    { key: "protein_g" as const, label: "Protein", eaten: totals?.protein_g, goal: goalFor(data?.goals?.protein_g), color: "protein" },
    { key: "carbs_g" as const, label: "Carbs", eaten: totals?.carbs_g, goal: goalFor(data?.goals?.carbs_g), color: "carbs" },
    { key: "fat_g" as const, label: "Fat", eaten: totals?.fat_g, goal: goalFor(data?.goals?.fat_g), color: "fat" },
    { key: "fiber_g" as const, label: "Fiber", eaten: totals?.fiber_g, goal: goalFor(data?.goals?.fiber_g), color: "fiber" },
  ];
  const balance = data?.profile?.dining_dollars_balance ?? 0;
  const dailyTarget = data?.profile?.daily_spending_target ?? null;
  const spentToday = data?.today.spent ?? 0;
  const spentWeek = data?.week.spent ?? 0;
  const weeklyBudget = dailyTarget == null ? null : dailyTarget * 7;
  const budgetPercent =
    dailyTarget && dailyTarget > 0
      ? Math.min((spentToday / dailyTarget) * 100, 100)
      : 0;
  const metadata = user?.user_metadata ?? {};
  const displayName =
    data?.profile?.display_name ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "Student";

  // Ranked by the optimizer (GET /api/recommendations); each is shown through the existing MealCard.
  // `item` is the whole recommendation for display; `meal` is its first real menu item, which is
  // what details and saving use, so allergen info always matches the meal shown.
  const recommendations = useMemo(
    () =>
      (recs.data?.recommendations ?? []).flatMap((rec) => {
        const items = menu.menu?.items ?? [];
        const item = recommendationAsMenuItem(rec, items);
        const meal = item && items.find((candidate) => candidate.id === item.id);
        return item && meal ? [{ rec, item, meal }] : [];
      }),
    [recs.data, menu.menu],
  );
  const weeklyDays = useMemo(() => {
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
    const labels = ["M", "T", "W", "T", "F", "S", "S"];
    return labels.map((label, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const calories = (data?.week_logs ?? [])
        .filter((log) => {
          if (!log.eaten_at) return false;
          const eaten = new Date(log.eaten_at);
          return eaten.getFullYear() === day.getFullYear() &&
            eaten.getMonth() === day.getMonth() &&
            eaten.getDate() === day.getDate();
        })
        .reduce((sum, log) => sum + (log.calories ?? 0), 0);
      return { label, calories };
    });
  }, [data?.week_logs]);
  const maxDailyCalories = Math.max(
    caloriesGoal == null ? 1 : caloriesGoal / days,
    ...weeklyDays.map((day) => day.calories),
    1,
  );

  async function handleAddMeal({ rec, item }: { rec: Recommendation; item: MenuItem }) {
    const single = !rec.combo && rec.items.length === 1;
    const succeeded = await addMeal({
      meal_id: single ? item.id : undefined,
      location_id: rec.location.id,
      name: item.name,
      location_name: rec.location.name,
      price: rec.total_price,
      calories: rec.nutrition.calories ?? undefined,
      protein_g: rec.nutrition.protein_g ?? undefined,
      carbs_g: rec.nutrition.carbs_g ?? undefined,
      fat_g: rec.nutrition.fat_g ?? undefined,
    });
    if (succeeded) {
      onToast("Meal added to today");
      void recs.reload();
    }
  }

  async function toggleSaved(item: MenuItem) {
    const result = await saved.toggle(item.id);
    if (result !== null) {
      onToast(result ? "Meal saved to your plans" : "Meal removed from saved plans");
    } else {
      onToast("Couldn't update saved meals");
    }
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content dashboard-content">
        <header className="user-header">
          <div className="profile-pill">
            <img
              className="avatar"
              src={`/assets/figma/dashboard-${view}-avatar.jpg`}
              alt=""
            />
            <div className="profile-copy">
              <span className="profile-greeting">{greeting()},</span>
              <strong>{displayName}</strong>
            </div>
          </div>
          <button type="button" className="alert-button" aria-label="Notifications">
            <img src="/assets/figma/bell-dot.svg" alt="" aria-hidden="true" />
          </button>
        </header>

        {error && (
          <p className="field-helper error" role="alert">
            {error}{" "}
            <button type="button" className="link-button" onClick={() => void reload()}>
              Retry
            </button>
          </p>
        )}
        {menu.error && <p className="field-helper error" role="alert">{menu.error}</p>}
        {recs.error && (
          <p className="field-helper error" role="alert">
            {recs.error}{" "}
            <button type="button" className="link-button" onClick={() => void recs.reload()}>
              Retry
            </button>
          </p>
        )}
        {saved.error && <p className="field-helper error" role="alert">{saved.error}</p>}
        {preferencesError && <p className="field-helper error" role="alert">{preferencesError}</p>}
        <div className="toggle-pill" aria-label="Daily or weekly view">
          {(["daily", "weekly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={`toggle-option${view === option ? " toggle-option--active" : ""}`}
              aria-pressed={view === option}
              onClick={() => setView(option)}
            >
              {option === "daily" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>

        <h2 className="section-header">
          {view === "daily" ? "Today's Nutrition" : "This Week's Nutrition"}
        </h2>

        <section className={`nutrition-card${view === "weekly" ? " nutrition-card--weekly" : ""}`}>
          <div className="nutrition-chart" aria-label="Nutrition summary">
            <div className="chart-center">
              <strong>
                {view === "weekly" && caloriesGoal != null
                  ? Math.round(caloriesEaten / 7).toLocaleString()
                  : (caloriesRemaining ?? caloriesEaten).toLocaleString()}
              </strong>
              <span>
                {view === "weekly" ? "Weekly average" : caloriesRemaining == null ? "Calories Logged" : "Calories Remaining"}
              </span>
              <small>
                {caloriesGoal == null
                  ? "No calorie goal set"
                  : `${caloriesEaten.toLocaleString()} / ${caloriesGoal.toLocaleString()} kcal`}
              </small>
            </div>
          </div>
          <div className="legend-list">
            {macros.map((macro) => (
              <div className="legend-item" key={macro.key}>
                <span className={`legend-dot legend-dot--${macro.color}`} />
                {macro.label}
              </div>
            ))}
          </div>
          {view === "weekly" && (
            <div className="weekly-chart" aria-label="Calories logged each day this week">
              {weeklyDays.map((day, index) => (
                <div className="weekly-bar-column" key={`${day.label}-${index}`}>
                  <span className="weekly-bar-track">
                    <i style={{ height: `${Math.max((day.calories / maxDailyCalories) * 100, day.calories ? 8 : 0)}%` }} />
                  </span>
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          )}
        </section>

        <h2 className="section-header">Nutrient Summary</h2>
        <div className="summary-row">
          {macros.map((macro) => (
            <button
              type="button"
              className="summary-box"
              key={macro.key}
              onClick={() => setSelectedNutrient(macro.key)}
            >
              <span className="summary-title">
                <span className={`legend-dot legend-dot--${macro.color}`} />
                {macro.label}
              </span>
              <strong className="summary-value">
                {Math.round(macro.eaten ?? 0)} / {macro.goal ?? "—"}g
              </strong>
              <span className="summary-progress">
                <i style={{ width: `${macro.goal ? Math.min(((macro.eaten ?? 0) / macro.goal) * 100, 100) : 0}%` }} />
              </span>
            </button>
          ))}
        </div>

        <section className="dollars-card">
          <span className="dollars-eyebrow">Dining Dollars</span>
          <div className="dollars-header">
            <strong className="dollar-value">{money(balance)}</strong>
            <span className="remaining-label">remaining</span>
          </div>
          <div className="dollars-meta">
            <span>{dailyTarget == null ? money(spentToday) : `${money(spentToday)} of ${money(dailyTarget)} target spent today`}</span>
            {preferences?.budget_alerts_enabled && dailyTarget != null && (
              <span className="tag">
                {spentToday > dailyTarget
                  ? "Over target"
                  : spentToday >= dailyTarget * 0.8
                    ? "Near target"
                    : "On track"}
              </span>
            )}
          </div>
          <div className="progress-track">
            <span className="progress-bar" style={{ width: `${budgetPercent}%` }} />
          </div>
          <p className="budget-copy">Spent this week: {money(spentWeek)}</p>
          {weeklyBudget != null && (
            <>
              <p className="budget-copy">Recommended weekly budget: {money(weeklyBudget)}</p>
              <p className="budget-copy budget-copy--bold">
                {spentWeek <= weeklyBudget
                  ? `You're ${money(weeklyBudget - spentWeek)} under your weekly budget.`
                  : `You're ${money(spentWeek - weeklyBudget)} over your weekly budget.`}
              </p>
            </>
          )}
        </section>

        {(recs.loading || menu.loading) && recommendations.length === 0 && (
          <p className="field-helper success" role="status">Loading meal recommendations…</p>
        )}
        {!recs.loading && recs.data?.reason && (
          <p className="empty-card">{NO_RECOMMENDATION_MESSAGES[recs.data.reason]}</p>
        )}
        {recommendations[0] && (
          <>
            <section className="recommend-card">
              <h2>What should I eat next?</h2>
              <MealCard
                item={recommendations[0].item}
                saved={saved.isSaved(recommendations[0].item.id)}
                onSelect={() => onSelectMeal(recommendations[0].meal)}
                onToggleSaved={() => void toggleSaved(recommendations[0].meal)}
              />
              <p className="recommend-explanation">{recommendations[0].rec.explanation}</p>
              <MacroMatchSummary match={recommendations[0].rec.macro_match} />
              <div className="meal-actions">
                <button type="button" className="text-link" onClick={() => onSelectMeal(recommendations[0].meal)}>
                  View Meal
                </button>
                <button
                  type="button"
                  className="action-button"
                  disabled={logging}
                  onClick={() => void handleAddMeal(recommendations[0])}
                >
                  {logging ? "Adding…" : "Add to Today"}
                </button>
              </div>
            </section>
            <section className="recommend-options">
              <h2>Best options for you today</h2>
              {recommendations.map(({ rec, item, meal }) => (
                <div key={rec.location.id}>
                  <MealCard
                    item={item}
                    saved={saved.isSaved(item.id)}
                    onSelect={() => onSelectMeal(meal)}
                    onToggleSaved={() => void toggleSaved(meal)}
                  />
                  <p className="recommend-explanation">
                    {macroScoreText(rec.macro_match.score)} · {rec.explanation}
                  </p>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
      <BottomNav active="home" onNavigate={onNavigate} />
      {selectedNutrient && (
        <NutritionSheet
          nutrient={selectedNutrient}
          consumed={data?.today[selectedNutrient] ?? 0}
          goal={data?.goals?.[selectedNutrient] ?? null}
          recentLogs={data?.recent_logs ?? []}
          onClose={() => setSelectedNutrient(null)}
        />
      )}
    </div>
  );
}
