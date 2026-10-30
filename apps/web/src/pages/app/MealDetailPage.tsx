import { macroMatch, type MenuItem } from "@csc-3100-ama/shared";
import { MacroMatchSummary } from "../../components/MacroMatch";
import { useMealTargets } from "../../hooks/useRecommendations";
import { allergenLabel } from "../../lib/allergens";
import { listedLocation } from "../../lib/locations";
import { servingLabel, servingStatusText } from "../../lib/serving";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { cheapestOffering, mealPrice } from "../../components/MealCard";
import { useMenu } from "../../hooks/useMenu";
import { useSavedMeals } from "../../hooks/useSavedMeals";

export function MealDetailPage({
  item,
  onBack,
  onSelectMeal,
  onNavigate,
  onToast,
}: {
  item: MenuItem;
  onBack: () => void;
  onSelectMeal: (item: MenuItem) => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (message: string) => void;
}) {
  const { menu, error: menuError } = useMenu();
  const savedMeals = useSavedMeals();
  const mealTargets = useMealTargets();
  const saved = savedMeals.isSaved(item.id);
  const price = mealPrice(item);
  const offering = cheapestOffering(item);
  // For unpriced items this is the restaurant's location (e.g. 1901 Marketplace), not "Chick-fil-A".
  const listed = listedLocation(item);
  const picture = item.name.toLowerCase().includes("chicken rice bowl")
    ? "/assets/figma/chicken-rice-bowl.jpg"
    : null;
  const alternatives = (menu?.items ?? [])
    .filter((candidate) => candidate.id !== item.id)
    .filter((candidate) => {
      const candidatePrice = mealPrice(candidate);
      return price == null || candidatePrice == null || candidatePrice < price;
    })
    .sort((a, b) => (mealPrice(a) ?? Infinity) - (mealPrice(b) ?? Infinity));
  const alternative =
    alternatives.find((candidate) => /greek yogurt parfait/i.test(candidate.name)) ??
    alternatives[0];

  async function toggle(itemToToggle: MenuItem) {
    const result = await savedMeals.toggle(itemToToggle.id);
    if (result === null) onToast("Couldn't update saved meals");
    else onToast(result ? "Meal saved to your plans" : "Meal removed from saved plans");
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content detail-content">
        {savedMeals.error && <p className="field-helper error" role="alert">{savedMeals.error}</p>}
        {menuError && <p className="field-helper error" role="alert">{menuError}</p>}
        <div className="detail-heading">
          <button type="button" className="back-button" onClick={onBack}>
            <img src="/assets/figma/back.svg" alt="" />
            <span>Meal Details</span>
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-hero-wrap">
            {picture ? (
              <img className="detail-hero-image" src={picture} alt={item.name} />
            ) : (
              <div className="detail-hero-placeholder" aria-hidden="true">
                <span>{item.restaurant}</span>
              </div>
            )}
            <span className="detail-venue-chip">
              {listed.label}
            </span>
            <button
              type="button"
              className={`bookmark-button detail-bookmark detail-bookmark--hero${saved ? " bookmark-button--saved" : ""}`}
              aria-label={saved ? "Remove from saved meals" : "Save meal"}
              aria-pressed={saved}
              onClick={() => void toggle(item)}
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
          </div>

          <div className="detail-title-row">
            <div>
              <h1>{item.name}</h1>
              <p className="detail-location">
                <span /> {listed.label}
              </p>
              {servingLabel(item) && (
                <p className="field-helper">
                  {servingLabel(item)}
                  {servingStatusText(item.serving_windows, listed.availability ?? undefined) &&
                    ` · ${servingStatusText(item.serving_windows, listed.availability ?? undefined)}`}
                </p>
              )}
            </div>
            <strong>{price == null ? "—" : `$${price.toFixed(2)}`}</strong>
          </div>

          <div className="detail-nutrition-grid">
            {[
              ["Calories", item.calories, ""],
              ["Protein", item.protein_g, "g"],
              ["Carbs", item.carbs_g, "g"],
              ["Fat", item.fat_g, "g"],
            ].map(([label, amount, unit]) => (
              <div className="detail-nutrition" key={String(label)}>
                <strong>{amount == null ? "—" : amount}{unit}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <section className="goal-fit-card">
            <h2>Why this fits your goals</h2>
            <p><span aria-hidden="true">✓</span> Nutrition information is shown so you can compare this meal with your daily goals.</p>
            <p><span aria-hidden="true">✓</span> {price == null ? "Price is not currently available." : `Priced at $${price.toFixed(2)} at ${offering?.location_name ?? item.restaurant}.`}</p>
            {item.serving && <p><span aria-hidden="true">✓</span> Serving: {item.serving}</p>}
          </section>

          <section className="goal-fit-card" aria-labelledby="macro-match-heading">
            <h2 id="macro-match-heading">Fit for your next meal</h2>
            {mealTargets.data ? (
              <MacroMatchSummary match={macroMatch(item, mealTargets.data.targets)} />
            ) : (
              <p>{mealTargets.loading ? "Checking your targets…" : "Macro Match unavailable"}</p>
            )}
          </section>

          <section className="goal-fit-card" aria-labelledby="allergen-heading">
            <h2 id="allergen-heading">Allergens</h2>
            {item.allergens_verified ? (
              <>
                <p>
                  {item.allergens?.length
                    ? `Contains: ${item.allergens.map(allergenLabel).join(", ")}`
                    : "No major allergens listed by the restaurant."}
                </p>
                {item.tags?.includes("contains_pork") && <p>Contains pork</p>}
                <p className="field-helper">
                  From the restaurant&apos;s published allergen info. Shared kitchens may cause cross-contact.
                </p>
              </>
            ) : (
              <p>Allergen info unavailable</p>
            )}
          </section>

          <div className="detail-actions">
            <button type="button" className="secondary-button" onClick={onBack}>Not interested</button>
            <button type="button" className="primary-button" onClick={() => void toggle(item)}>
              {saved ? "Saved" : "Save meal"}
            </button>
          </div>

          <section className="detail-alternatives">
            <h2>Lower-cost alternative nearby</h2>
            {alternative ? (
              <button
                type="button"
                className="detail-alternative-card"
                onClick={() => onSelectMeal(alternative)}
              >
                {/greek yogurt parfait/i.test(alternative.name) ? (
                  <img src="/assets/figma/greek-yogurt-parfait.jpg" alt="" />
                ) : (
                  <span className="alternative-placeholder" aria-hidden="true" />
                )}
                <span>
                  <strong>{alternative.name}</strong>
                  <small>{alternative.restaurant} · {alternative.calories ?? "—"} cal · lower-cost option</small>
                </span>
                <b>{mealPrice(alternative) == null ? "—" : `$${mealPrice(alternative)?.toFixed(2)}`}</b>
              </button>
            ) : (
              <p className="empty-card">No lower-cost alternative is available right now.</p>
            )}
          </section>
        </div>
      </main>
      <BottomNav active="explore" onNavigate={onNavigate} />
    </div>
  );
}
