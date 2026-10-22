import { useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@csc-3100-ama/shared";
import { useAuth } from "../../auth";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { cheapestOffering, MealCard, mealPrice } from "../../components/MealCard";
import { useDashboard } from "../../hooks/useDashboard";
import { useMenu } from "../../hooks/useMenu";
import { useSavedMeals } from "../../hooks/useSavedMeals";
import { fetchPreferences } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
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

  const recommendations = useMemo(() => {
    const items = [...(menu.menu?.items ?? [])];
    const priorities = preferences?.nutrition_priorities ?? [];
    const preferredLocations = new Set(preferences?.preferred_location_ids ?? []);
    const score = (item: MenuItem) => {
      let value = 0;
      if (preferredLocations.size && item.offerings.some((offering) => preferredLocations.has(offering.location_id))) value -= 100;
      if (priorities.includes("High protein")) value -= item.protein_g ?? 0;
      if (priorities.includes("Lower calorie")) value += item.calories ?? 10000;
      if (priorities.includes("Budget-friendly")) value += (mealPrice(item) ?? 10000) * 10;
      if (priorities.includes("Balanced")) {
        const calorieGoal = data?.goals?.calories ?? 2000;
        const proteinGoal = data?.goals?.protein_g ?? 100;
        value += Math.abs((item.calories ?? calorieGoal) - calorieGoal) / Math.max(calorieGoal, 1);
        value += Math.abs((item.protein_g ?? proteinGoal) - proteinGoal) / Math.max(proteinGoal, 1);
      }
      return value;
    };
    return items.sort((a, b) => score(a) - score(b)).slice(0, 3);
  }, [data?.goals, menu.menu, preferences]);
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

  async function handleAddMeal(item: MenuItem) {
    const price = mealPrice(item);
    const offering = cheapestOffering(item);
    const succeeded = await addMeal({
      meal_id: item.id,
      location_id: offering?.location_id,
      name: item.name,
      location_name: offering?.location_name ?? item.restaurant,
      price: price ?? 0,
      calories: item.calories ?? 0,
      protein_g: item.protein_g ?? 0,
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
    });
    if (succeeded) onToast("Meal added to today");
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

        {menu.loading && !menu.menu && (
          <p className="field-helper success" role="status">Loading meal recommendations…</p>
        )}
        {recommendations.length > 0 && (
          <>
            <section className="recommend-card">
              <h2>What should I eat next?</h2>
              <MealCard
                item={recommendations[0]}
                saved={saved.isSaved(recommendations[0].id)}
                onSelect={() => onSelectMeal(recommendations[0])}
                onToggleSaved={() => void toggleSaved(recommendations[0])}
              />
              <div className="meal-actions">
                <button type="button" className="text-link" onClick={() => onSelectMeal(recommendations[0])}>
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
              {recommendations.map((item) => (
                <MealCard
                  key={item.id}
                  item={item}
                  saved={saved.isSaved(item.id)}
                  onSelect={() => onSelectMeal(item)}
                  onToggleSaved={() => void toggleSaved(item)}
                />
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
