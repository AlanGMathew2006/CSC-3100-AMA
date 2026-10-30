import type { Macro, MacroMatchResult, MacroStatus } from "@csc-3100-ama/shared";

const LABELS: Record<Macro, [string, string]> = {
  calories: ["Calories", ""],
  protein_g: ["Protein", "g"],
  carbs_g: ["Carbs", "g"],
  fat_g: ["Fat", "g"],
};

const STATUS_TEXT: Record<MacroStatus, string> = {
  under: "Under",
  on_target: "On target",
  over: "Over",
  unavailable: "Unavailable",
};

export const macroScoreText = (score: number | null) =>
  score == null ? "Macro Match unavailable" : `Macro Match ${score}`;

// Macro Match score (US-07) with a per-macro breakdown against this meal's targets.
export function MacroMatchSummary({ match }: { match: MacroMatchResult }) {
  return (
    <div className="macro-match">
      <strong className="macro-match-score">{macroScoreText(match.score)}</strong>
      <ul className="macro-match-list">
        {(Object.keys(LABELS) as Macro[]).map((macro) => {
          const { actual, target, status } = match.breakdown[macro];
          const [label, unit] = LABELS[macro];
          return (
            <li key={macro} className={`macro-match-row macro-match-row--${status}`}>
              <span>{label}</span>
              <span>
                {actual == null || target == null
                  ? "unavailable"
                  : `${Math.round(actual)}${unit} / ${Math.round(target)}${unit}`}
              </span>
              <span>{STATUS_TEXT[status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
