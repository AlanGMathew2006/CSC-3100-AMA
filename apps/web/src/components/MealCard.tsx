import type { MenuItem } from "@csc-3100-ama/shared";

export const cheapestOffering = (item: MenuItem) =>
  item.offerings.reduce<(typeof item.offerings)[number] | null>(
    (cheapest, offering) =>
      cheapest == null || offering.price < cheapest.price ? offering : cheapest,
    null,
  );

export const mealPrice = (item: MenuItem): number | null =>
  cheapestOffering(item)?.price ?? null;

export function MealCard({
  item,
  saved,
  onSelect,
  onToggleSaved,
}: {
  item: MenuItem;
  saved: boolean;
  onSelect: () => void;
  onToggleSaved: () => void;
}) {
  const price = mealPrice(item);
  const offering = cheapestOffering(item);

  return (
    <article className="meal-card">
      <button type="button" className="meal-card-main" onClick={onSelect}>
        <span className="meal-card-heading">
          <span className="meal-label">
            {offering?.campus_area ?? offering?.location_name ?? item.restaurant}
          </span>
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
    </article>
  );
}
