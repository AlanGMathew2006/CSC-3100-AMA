import type { MealLogInput } from "../../types/dashboard";

type NutrientKey = "protein_g" | "carbs_g" | "fat_g" | "fiber_g";
const labels: Record<NutrientKey, string> = {
  protein_g: "Protein",
  carbs_g: "Carbs",
  fat_g: "Fat",
  fiber_g: "Fiber",
};
const sourceIcon = (name: string, nutrient: NutrientKey) => {
  if (/chicken|bowl/i.test(name)) return "/assets/figma/circle-x.svg";
  if (/yogurt|milk/i.test(name)) return "/assets/figma/milk.svg";
  if (/sandwich/i.test(name)) return "/assets/figma/sandwich.svg";
  if (nutrient === "protein_g") return "/assets/figma/protein.svg";
  return "/assets/figma/sandwich.svg";
};

export function NutritionSheet({
  nutrient,
  consumed,
  goal,
  recentLogs,
  onClose,
}: {
  nutrient: NutrientKey;
  consumed: number;
  goal: number | null;
  recentLogs: MealLogInput[];
  onClose: () => void;
}) {
  const label = labels[nutrient];
  const remaining = goal == null ? null : Math.max(goal - consumed, 0);
  const percent = goal ? Math.min((consumed / goal) * 100, 100) : 0;
  const sources = recentLogs
    .map((log) => ({ name: log.name, amount: log[nutrient] ?? 0 }))
    .filter((source) => source.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="nutrition-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <h2 id="nutrition-sheet-title">{label}</h2>
          <button type="button" className="sheet-close" aria-label="Close nutrition details" onClick={onClose}>
            <img src="/assets/figma/close-circle.svg" alt="" aria-hidden="true" />
          </button>
        </header>
        <div className="sheet-total-row">
          <div>
            <strong>{Math.round(consumed)}g</strong>
            <span>consumed today</span>
          </div>
          <div className="sheet-goal">
            <strong>{goal == null ? "No goal" : `${Math.round(goal)}g goal`}</strong>
            <span>{remaining == null ? "Set a goal in Profile" : `${Math.round(remaining)}g remaining`}</span>
          </div>
        </div>
        <div className="sheet-progress">
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="sheet-percent">
          {goal == null ? "Track progress toward your daily goal" : `${Math.round(percent)}% of daily goal reached`}
        </p>
        <h3>Top sources today</h3>
        {sources.length ? (
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.name}>
                <img src={sourceIcon(source.name, nutrient)} alt="" aria-hidden="true" />
                <strong>{source.name}</strong>
                <b>{Math.round(source.amount)}g {label.toLowerCase()}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-card">Log a meal to see your top {label.toLowerCase()} sources.</p>
        )}
        <button type="button" className="primary-button" onClick={onClose}>
          View Nutrition Details
        </button>
      </section>
    </div>
  );
}
