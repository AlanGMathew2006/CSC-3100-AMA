import { useCallback, useEffect, useState } from "react";
import type { MenuItem } from "@csc-3100-ama/shared";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { MealCard } from "../../components/MealCard";
import { useMenu } from "../../hooks/useMenu";
import { useSavedMeals } from "../../hooks/useSavedMeals";
import { fetchMealLogs } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import type { MealLogInput } from "../../types/dashboard";

export function SavedMealsPage({
  onNavigate,
  onSelectMeal,
  onToast,
}: {
  onNavigate: (tab: AppTab) => void;
  onSelectMeal: (item: MenuItem) => void;
  onToast: (message: string) => void;
}) {
  const { menu, loading: menuLoading, error: menuError, reload: reloadMenu } = useMenu();
  const saved = useSavedMeals();
  const [recentChoices, setRecentChoices] = useState<MealLogInput[]>([]);
  const [recentError, setRecentError] = useState("");

  const loadRecentChoices = useCallback(() => {
    setRecentError("");
    const from = new Date();
    from.setDate(from.getDate() - 14);
    void fetchMealLogs(from.toISOString())
      .then((logs) => setRecentChoices(logs))
      .catch((err: unknown) => setRecentError(errorMessage(err)));
  }, []);

  useEffect(loadRecentChoices, [loadRecentChoices]);

  const menuItems = menu?.items ?? [];
  const savedItems = saved.meals.flatMap((entry) => {
    const id = entry.meal?.id;
    if (!id || !entry.meal) return [];
    const matched = menuItems.find((item) => item.id === id);
    if (matched) return [matched];
    return [{
      ...entry.meal,
      restaurant: "Campus dining",
      category: "Saved meal",
      serving: null,
      meal_component: null,
      offerings: [],
    } satisfies MenuItem];
  });
  const recentLabel = (date?: string) => {
    if (!date) return "Recently";
    const current = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const dayLabel =
      current.toDateString() === today.toDateString()
        ? "Today"
        : current.toDateString() === yesterday.toDateString()
          ? "Yesterday"
          : current.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${dayLabel}, ${current.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  };

  async function handleUnsave(item: MenuItem) {
    const result = await saved.toggle(item.id);
    if (result === false) onToast("Meal removed from saved plans");
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content saved-content">
        <h1>Saved Plans</h1>
        {saved.error && (
          <p className="field-helper error" role="alert">
            {saved.error}{" "}
            <button type="button" className="link-button" onClick={() => void saved.reload()}>
              Retry
            </button>
          </p>
        )}
        {menuError && (
          <p className="field-helper error" role="alert">
            {menuError}{" "}
            <button type="button" className="link-button" onClick={() => void reloadMenu()}>
              Retry
            </button>
          </p>
        )}
        {recentError && (
          <p className="field-helper error" role="alert">
            {recentError}{" "}
            <button type="button" className="link-button" onClick={loadRecentChoices}>
              Retry
            </button>
          </p>
        )}

        <section className="saved-section">
          <h2>Your Saved Meals ({savedItems.length})</h2>
          {saved.loading || menuLoading ? (
            <p className="field-helper success" role="status">Loading saved meals…</p>
          ) : savedItems.length === 0 ? (
            <p className="empty-card">No saved meals yet. Explore the menu and bookmark a meal.</p>
          ) : (
            <ul className="saved-meal-list">
              {savedItems.map((item) => (
                <li key={item.id}>
                  <MealCard
                    item={item}
                    saved
                    onSelect={() => onSelectMeal(item)}
                    onToggleSaved={() => void handleUnsave(item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {savedItems.length > 0 && (
          <section className="saved-insight">
            <h2>Provision Insights</h2>
            <div className="insight-card">
              <div className="insight-heading">
                <img src="/assets/figma/protein.svg" alt="" />
                <strong>High-value favorites</strong>
              </div>
              <p>
                Your saved meals are ready whenever you need a quick option.
                Compare nutrition and price before your next meal.
              </p>
              <div className="insight-meter">
                <span>Dining Dollars plan</span>
                <span aria-hidden="true"><i /></span>
              </div>
            </div>
          </section>
        )}

        <section className="saved-section">
          <h2>Recent Choices</h2>
          {!recentError && recentChoices.length === 0 ? (
            <p className="empty-card">Your logged meals will appear here.</p>
          ) : (
            <ul className="recent-choice-list">
              {recentChoices.slice(0, 4).map((choice, index) => (
                <li key={`${choice.name}-${choice.eaten_at ?? index}`}>
                  <strong>{choice.name}</strong>
                  <span>{choice.location_name ?? "Campus dining"} · {recentLabel(choice.eaten_at)}</span>
                  <b>${(choice.price ?? 0).toFixed(2)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BottomNav active="saved" onNavigate={onNavigate} />
    </div>
  );
}
