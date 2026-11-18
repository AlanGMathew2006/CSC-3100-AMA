import { useEffect, useMemo, useState } from "react";
import {
  type MenuItem,
  type Recommendation,
  type NutrientKey,
  NO_RECOMMENDATION_ACTIONS,
  NO_RECOMMENDATION_MESSAGES,
  diningDollarsView,
  displayName as userDisplayName,
  errorMessage,
  greeting,
  macroScoreText,
  maxDailyCalories,
  money,
  nutritionHeading,
  nutritionRingSegments,
  nutritionView,
  recommendationEntries,
  recommendationLog,
  weeklyBarPercent,
  weeklyDays,
} from "@csc-3100-ama/shared";
import { useAuth } from "../../auth";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { MacroMatchSummary } from "../../components/MacroMatch";
import { MealCard } from "../../components/MealCard";
import { useDashboard } from "../../hooks/useDashboard";
import { useMenu } from "../../hooks/useMenu";
import { useRecommendations } from "../../hooks/useRecommendations";
import { useSavedMeals } from "../../hooks/useSavedMeals";
import { fetchPreferences } from "../../lib/api";
import type { UserPreferences } from "../../types/dashboard";
import { NutritionRing } from "../../components/NutritionRing";
import { NutritionSheet } from "./NutritionSheet";

export function DashboardPage({
  onNavigate,
  onSelectMeal,
  onSelectRecommendation,
  onToast,
}: {
  onNavigate: (tab: AppTab) => void;
  onSelectMeal: (item: MenuItem) => void;
  onSelectRecommendation: (rec: Recommendation) => void;
  onToast: (message: string) => void;
}) {
  const { user } = useAuth();
  const { data, error, logging, reload, addMeal } = useDashboard();
  const menu = useMenu();
  // The hero pick plus up to 3 more for "Best options".
  const recs = useRecommendations({ limit: 4 });
  const saved = useSavedMeals();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientKey | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [preferencesError, setPreferencesError] = useState("");

  useEffect(() => {
    let active = true;
    void fetchPreferences()
      .then((savedPreferences) => {
        if (!active) return;
        setPreferences(savedPreferences);
        if (savedPreferences) {
          document.documentElement.dataset.theme = savedPreferences.theme;
        }
      })
      .catch((err: unknown) => {
        if (active) setPreferencesError(errorMessage(err));
      });
    return () => {
      active = false;
    };
  }, []);

  const nutrition = nutritionView(data, view);
  const { caloriesGoal, macros } = nutrition;
  const dollars = diningDollarsView(data, preferences);
  const displayName = userDisplayName(data?.profile, user);

  // Ranked by the optimizer (GET /api/recommendations); each is shown through the existing MealCard.
  // `item` is the whole recommendation for display. A single-item recommendation opens and saves
  // that meal; a multi-item one opens the recommendation view and has no bookmark. They show even
  // if the menu hasn't loaded; then `meal` is missing and the card opens the recommendation view.
  const recommendations = useMemo(
    () => recommendationEntries(recs.data?.recommendations ?? [], menu.menu?.items ?? []),
    [recs.data, menu.menu],
  );
  const emptyReason = recs.loading ? null : recs.data?.reason ?? null;
  const openRecommendation = ({ rec, meal, single }: (typeof recommendations)[number]) =>
    single && meal ? onSelectMeal(meal) : onSelectRecommendation(rec);
  const weekDays = useMemo(() => weeklyDays(data?.week_logs, new Date()), [data?.week_logs]);
  const maxDaily = maxDailyCalories(weekDays, caloriesGoal, view === "daily" ? 1 : 7);

  async function handleAddMeal({ rec }: { rec: Recommendation }) {
    if (await addMeal(recommendationLog(rec))) {
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
              <span className="profile-greeting">{greeting(new Date().getHours())},</span>
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
          {nutritionHeading(view)}
        </h2>

        <section className={`nutrition-card${view === "weekly" ? " nutrition-card--weekly" : ""}`}>
          <NutritionRing
            value={nutrition.centerValue}
            label={nutrition.centerLabel}
            detail={nutrition.centerDetail}
            segments={nutritionRingSegments(data, view)}
          />
          {view === "weekly" && (
            <div className="weekly-chart" aria-label="Calories logged each day this week">
              {weekDays.map((day, index) => (
                <div className="weekly-bar-column" key={`${day.label}-${index}`}>
                  <span className="weekly-bar-track">
                    <i style={{ height: `${weeklyBarPercent(day.calories, maxDaily)}%` }} />
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
              <strong className="summary-value">{macro.text}</strong>
              <span className="summary-progress">
                <i style={{ width: `${macro.percent}%`, background: `var(--macro-${macro.color})` }} />
              </span>
            </button>
          ))}
        </div>

        <section className="dollars-card">
          <span className="dollars-eyebrow">Dining Dollars</span>
          <div className="dollars-header">
            <strong className="dollar-value">{money(dollars.balance)}</strong>
            <span className="remaining-label">remaining</span>
          </div>
          <div className="dollars-meta">
            <span>{dollars.spentText}</span>
            {dollars.tag && <span className="tag">{dollars.tag}</span>}
          </div>
          <div className="progress-track">
            <span className="progress-bar" style={{ width: `${dollars.budgetPercent}%` }} />
          </div>
          <p className="budget-copy">{dollars.weekSpentText}</p>
          {dollars.weeklyBudgetText && (
            <>
              <p className="budget-copy">{dollars.weeklyBudgetText}</p>
              <p className="budget-copy budget-copy--bold">{dollars.weeklyStatusText}</p>
            </>
          )}
        </section>

        {recs.loading && recommendations.length === 0 && (
          <p className="field-helper success" role="status">Loading meal recommendations…</p>
        )}
        {emptyReason && (
          <div className="empty-card">
            <p>{NO_RECOMMENDATION_MESSAGES[emptyReason]}</p>
            <button
              type="button"
              className="link-button"
              onClick={() => onNavigate(NO_RECOMMENDATION_ACTIONS[emptyReason][1])}
            >
              {NO_RECOMMENDATION_ACTIONS[emptyReason][0]}
            </button>
          </div>
        )}
        {recommendations[0] && (
          <>
            <section className="recommend-card">
              <h2>What should I eat next?</h2>
              <MealCard
                item={recommendations[0].item}
                saved={saved.isSaved(recommendations[0].item.id)}
                hideBookmark={!recommendations[0].single}
                onSelect={() => openRecommendation(recommendations[0])}
                onToggleSaved={() => void toggleSaved(recommendations[0].item)}
              />
              {recommendations[0].includes && (
                <p className="recommend-explanation">{recommendations[0].includes}</p>
              )}
              <p className="recommend-explanation">{recommendations[0].rec.explanation}</p>
              <MacroMatchSummary match={recommendations[0].rec.macro_match} />
              <div className="meal-actions">
                <button type="button" className="text-link" onClick={() => openRecommendation(recommendations[0])}>
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
            {recommendations.length > 1 && (
            <section className="recommend-options">
              <h2>Best options for you today</h2>
              {/* The hero pick is shown above, so this lists the next best options. */}
              {recommendations.slice(1).map((entry) => (
                <div key={entry.rec.location.id}>
                  <MealCard
                    item={entry.item}
                    saved={saved.isSaved(entry.item.id)}
                    hideBookmark={!entry.single}
                    onSelect={() => openRecommendation(entry)}
                    onToggleSaved={() => void toggleSaved(entry.item)}
                  />
                  {entry.includes && <p className="recommend-explanation">{entry.includes}</p>}
                  <p className="recommend-explanation">
                    {macroScoreText(entry.rec.macro_match.score)} · {entry.rec.explanation}
                  </p>
                </div>
              ))}
            </section>
            )}
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
