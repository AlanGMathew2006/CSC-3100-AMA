import {
  MACRO_LABELS as LABELS,
  MACRO_STATUS_TEXT as STATUS_TEXT,
  macroRowAmount,
  macroScoreText,
  type Macro,
  type MacroMatchResult,
} from "@csc-3100-ama/shared";

// Macro Match score (US-07) with a per-macro breakdown against this meal's targets.
export function MacroMatchSummary({ match }: { match: MacroMatchResult }) {
  return (
    <div className="macro-match">
      <strong className="macro-match-score">{macroScoreText(match.score)}</strong>
      <ul className="macro-match-list">
        {(Object.keys(LABELS) as Macro[]).map((macro) => {
          const { status } = match.breakdown[macro];
          const [label, unit] = LABELS[macro];
          return (
            <li key={macro} className={`macro-match-row macro-match-row--${status}`}>
              <span>{label}</span>
              <span>
                {macroRowAmount(match.breakdown[macro], unit)}
              </span>
              <span>{STATUS_TEXT[status]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
