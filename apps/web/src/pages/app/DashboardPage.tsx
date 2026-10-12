import { useState } from "react";
import { useAuth } from "../../auth";
import { BrandHeader } from "../../components/BrandHeader";
import { useDashboard } from "../../hooks/useDashboard";

// Mock/seed meal shown until live menu offerings are wired to recommendations.
const MOCK_MEAL = {
  name: "Chicken Teriyaki Bowl",
  location_name: "Vista Grande",
  price: 9.5,
  calories: 520,
  protein_g: 38,
  carbs_g: 62,
  fat_g: 14,
};

const money = (amount: number) => `$${amount.toFixed(2)}`;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const { data, error, logging, reload, addMeal } = useDashboard();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [logoutError, setLogoutError] = useState("");

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
    } catch {
      setLogoutError("Couldn't log out. Please try again.");
    }
  }

  const days = view === "daily" ? 1 : 7;
  const totals = data ? (view === "daily" ? data.today : data.week) : null;
  const goalFor = (value: number | null | undefined) =>
    value == null ? null : value * days;

  const caloriesGoal = goalFor(data?.goals?.calories);
  const caloriesEaten = Math.round(totals?.calories ?? 0);
  const caloriesRemaining =
    caloriesGoal == null ? null : Math.max(caloriesGoal - caloriesEaten, 0);

  const macros = [
    { key: "protein", label: "Protein", eaten: totals?.protein_g, goal: goalFor(data?.goals?.protein_g) },
    { key: "carbs", label: "Carbs", eaten: totals?.carbs_g, goal: goalFor(data?.goals?.carbs_g) },
    { key: "fat", label: "Fat", eaten: totals?.fat_g, goal: goalFor(data?.goals?.fat_g) },
    { key: "fiber", label: "Fiber", eaten: totals?.fiber_g, goal: goalFor(data?.goals?.fiber_g) },
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

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />

      <section className="dashboard-shell">
        <header className="user-header">
          <div className="profile-pill">
            <div className="avatar" aria-label="profile avatar" />
            <div className="profile-copy">
              <span className="profile-greeting">{greeting()}</span>
              <strong>{displayName}</strong>
            </div>
          </div>
          <button type="button" className="alert-button" aria-label="Notifications">
            <svg
              className="bell-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
              <circle className="bell-notification" cx="19" cy="5" r="3" />
            </svg>
          </button>
        </header>

        {error && (
          <p className="field-helper error" role="alert">
            <span className="alert-icon" aria-hidden="true" />
            {error}{" "}
            <button type="button" className="link-button" onClick={() => void reload()}>
              Retry
            </button>
          </p>
        )}
        {logoutError && (
          <p className="field-helper error" role="alert">
            {logoutError}
          </p>
        )}

        <div className="toggle-pill" aria-label="Daily or weekly view">
          <button
            type="button"
            className={`toggle-option${view === "daily" ? " toggle-option--active" : ""}`}
            onClick={() => setView("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={`toggle-option${view === "weekly" ? " toggle-option--active" : ""}`}
            onClick={() => setView("weekly")}
          >
            Weekly
          </button>
        </div>

        <div className="section-header">
          {view === "daily" ? "Today's Nutrition" : "This Week's Nutrition"}
        </div>

        <div className="nutrition-card">
          <div className="nutrition-chart" aria-label="Nutrition summary">
            <div className="chart-center">
              <strong>{(caloriesRemaining ?? caloriesEaten).toLocaleString()}</strong>
              <span>
                {caloriesRemaining == null ? "Calories Logged" : "Calories Remaining"}
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
                <span className={`legend-dot legend-dot--${macro.key}`} />
                {macro.label}
              </div>
            ))}
          </div>
        </div>

        <div className="section-header">Nutrient Summary</div>

        <div className="summary-row">
          {macros.map((macro) => (
            <div className="summary-box" key={macro.key}>
              <div className="summary-title">
                <span className={`legend-dot legend-dot--${macro.key}`} /> {macro.label}
              </div>
              <div className="summary-value">
                {Math.round(macro.eaten ?? 0)}
                {macro.goal == null ? "g" : ` / ${macro.goal}g`}
              </div>
            </div>
          ))}
        </div>

        <div className="dollars-card">
          <div className="dollars-header">
            <span className="dollar-value">{money(balance)}</span>
            <span className="remaining-label">remaining</span>
          </div>
          <div className="dollars-meta">
            <span>
              {dailyTarget == null
                ? money(spentToday)
                : `${money(spentToday)} of ${money(dailyTarget)}`}
            </span>
            <span className="tag">spent today</span>
          </div>
          <div className="progress-track">
            <span className="progress-bar" style={{ width: `${budgetPercent}%` }} />
          </div>
          <div className="budget-copy">Spent this week: {money(spentWeek)}</div>
          {weeklyBudget != null && (
            <>
              <div className="budget-copy">
                Recommended weekly budget: {money(weeklyBudget)}
              </div>
              <div className="budget-copy budget-copy--bold">
                {spentWeek <= weeklyBudget
                  ? `You’re ${money(weeklyBudget - spentWeek)} under your weekly budget.`
                  : `You’re ${money(spentWeek - weeklyBudget)} over your weekly budget.`}
              </div>
            </>
          )}
        </div>

        <div className="recommend-card">
          <h2>What should I eat next?</h2>
          <div className="meal-row">
            <div>
              <span className="meal-label">{MOCK_MEAL.location_name} · sample meal</span>
              <h3>{MOCK_MEAL.name}</h3>
              <div className="meal-meta">
                <span>{MOCK_MEAL.calories} kcal</span>
                <span>{MOCK_MEAL.protein_g}g protein</span>
                <span>{MOCK_MEAL.carbs_g}g carbs</span>
                <span>{MOCK_MEAL.fat_g}g fat</span>
              </div>
            </div>
            <button type="button" className="mini-tag">High protein</button>
          </div>
          <div className="meal-actions">
            <button type="button" className="text-link">View Meal</button>
            <button
              type="button"
              className="action-button"
              onClick={() => void addMeal(MOCK_MEAL)}
              disabled={logging}
            >
              {logging ? "Adding…" : "Add to Today"}
            </button>
          </div>
        </div>

        <div className="bottom-nav" aria-label="Main navigation">
          <button type="button" className="nav-item nav-item--active">Home</button>
          <button type="button" className="nav-item">Explore</button>
          <button type="button" className="nav-item">Saved</button>
          <button type="button" className="nav-item" onClick={() => void handleSignOut()}>
            Log out
          </button>
        </div>
      </section>
    </div>
  );
}
