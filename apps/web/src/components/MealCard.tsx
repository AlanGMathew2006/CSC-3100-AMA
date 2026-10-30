import type { MenuItem, OpenStatus } from "@csc-3100-ama/shared";
import { servingLabel, servingStatusText } from "../lib/serving";
import { macroScoreText } from "./MacroMatch";

export const cheapestOffering = (item: MenuItem) =>
  item.offerings.reduce<(typeof item.offerings)[number] | null>(
    (cheapest, offering) =>
      cheapest == null || offering.price < cheapest.price ? offering : cheapest,
    null,
  );

export const mealPrice = (item: MenuItem): number | null =>
  cheapestOffering(item)?.price ?? null;

const OPEN_LABELS: Record<OpenStatus, string> = {
  open: "Open",
  closed: "Closed",
  unknown: "Hours unavailable",
};

export function OpenBadge({ status }: { status: OpenStatus }) {
  return <span className={`open-badge open-badge--${status}`}>{OPEN_LABELS[status]}</span>;
}

export function MealCard({
  item,
  saved,
  showOpenStatus = false,
  macroScore,
  hideBookmark = false,
  onSelect,
  onToggleSaved,
}: {
  item: MenuItem;
  saved: boolean;
  // Shows whether the location of the listed (cheapest) offering is open now, and the item's
  // serving window (e.g. "Breakfast · until 10:30 am") with "Not served right now" after it.
  showOpenStatus?: boolean;
  // Macro Match against the next meal's targets; omit to hide, null shows "unavailable".
  macroScore?: number | null;
  // For multi-item recommendations, where saving one item would be misleading.
  hideBookmark?: boolean;
  onSelect: () => void;
  onToggleSaved: () => void;
}) {
  const price = mealPrice(item);
  const offering = cheapestOffering(item);
  const serving = showOpenStatus ? servingLabel(item) : null;
  const servingStatus = showOpenStatus
    ? servingStatusText(item.serving_windows, offering?.availability)
    : null;

  return (
    <article className="meal-card">
      <button type="button" className="meal-card-main" onClick={onSelect}>
        <span className="meal-card-heading">
          <span className="meal-label">
            {offering?.campus_area ?? offering?.location_name ?? item.restaurant}
          </span>
          {showOpenStatus && offering && <OpenBadge status={offering.open_status} />}
          {serving && (
            <span className="meal-label">
              {serving}
              {servingStatus && ` · ${servingStatus}`}
            </span>
          )}
          {macroScore !== undefined && (
            <span className="meal-label">{macroScoreText(macroScore)}</span>
          )}
          <strong>{item.name}</strong>
        </span>
        <span className="meal-card-price">
          {price == null ? "Price unavailable" : `$${price.toFixed(2)}`}
        </span>
        <span className="meal-meta meal-card-meta">
          <span>
            <img src="/assets/figma/flame.svg" alt="" aria-hidden="true" />
            {item.calories == null ? "— kcal" : `${item.calories} cal`}
          </span>
          <span>
            <img src="/assets/figma/protein.svg" alt="" aria-hidden="true" />
            {item.protein_g == null ? "—" : `${item.protein_g}g`} protein
          </span>
        </span>
      </button>
      {!hideBookmark && (
      <button
        type="button"
        className={`bookmark-button${saved ? " bookmark-button--saved" : ""}`}
        aria-label={saved ? `Remove ${item.name} from saved meals` : `Save ${item.name}`}
        aria-pressed={saved}
        onClick={onToggleSaved}
      >
        <img
          className="bookmark-icon--outline"
          src="/assets/figma/bookmark.svg"
          alt=""
          aria-hidden="true"
        />
        <img
          className="bookmark-icon--filled"
          src="/assets/figma/bookmark-saved.svg"
          alt=""
          aria-hidden="true"
        />
      </button>
      )}
    </article>
  );
}
