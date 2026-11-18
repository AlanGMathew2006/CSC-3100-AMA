import {
  type MenuItem,
  type Recommendation,
  allergenLabel,
  combinedAllergens,
  lineNutrition,
  linePrice,
  money,
  quantityLabel,
  recommendationLabel,
  recommendationLog,
  servingLabel,
} from "@csc-3100-ama/shared";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { MacroMatchSummary } from "../../components/MacroMatch";
import { useLogMeal } from "../../hooks/useLogMeal";
import { useMenu } from "../../hooks/useMenu";

// A whole recommended meal (several items, maybe a combo). Tapping an item opens its own details.
export function RecommendationDetailPage({
  rec,
  onBack,
  onSelectMeal,
  onNavigate,
  onToast,
}: {
  rec: Recommendation;
  onBack: () => void;
  onSelectMeal: (item: MenuItem) => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (message: string) => void;
}) {
  const { menu, loading: menuLoading, error: menuError } = useMenu();
  const { logging, error: logError, addMeal } = useLogMeal();
  const menuItems = menu?.items ?? [];
  const allergens = combinedAllergens(rec, menuItems);

  async function handleAdd() {
    if (await addMeal(recommendationLog(rec))) {
      onToast("Meal added to today");
      onBack();
    }
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content detail-content">
        {menuError && <p className="field-helper error" role="alert">{menuError}</p>}
        <div className="detail-heading">
          <button type="button" className="back-button" onClick={onBack}>
            <img src="/assets/figma/back.svg" alt="" />
            <span>Recommended Meal</span>
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-title-row">
            <div>
              {/* A combo's parts are listed below, so its name is enough for the heading. */}
              <h1>{rec.combo ? rec.combo.name : recommendationLabel(rec)}</h1>
              <p className="detail-location">
                <span /> {rec.location.name}
              </p>
            </div>
            <strong>{money(rec.total_price)}</strong>
          </div>
          {rec.combo && (
            <p className="field-helper">
              {rec.combo.name} combo, {money(rec.combo.price)}
            </p>
          )}

          <section className="detail-alternatives" aria-labelledby="meal-items-heading">
            <h2 id="meal-items-heading">What&apos;s in this meal</h2>
            {rec.items.map((part, index) => {
              const meal = menuItems.find((item) => item.id === part.meal_id);
              const serving = meal ? servingLabel(meal) : null;
              return (
                <button
                  key={`${part.meal_id}-${index}`}
                  type="button"
                  className="detail-alternative-card"
                  disabled={!meal}
                  onClick={() => meal && onSelectMeal(meal)}
                >
                  <span className="alternative-placeholder" aria-hidden="true" />
                  <span>
                    <strong>{quantityLabel(part.quantity, part.name)}</strong>
                    <small>
                      {!meal && menuLoading ? "Loading nutrition…" : lineNutrition(meal, part.quantity)}
                      {serving && ` · ${serving}`}
                    </small>
                  </span>
                  <b>{linePrice(part)}</b>
                </button>
              );
            })}
          </section>

          <section className="goal-fit-card" aria-labelledby="meal-fit-heading">
            <h2 id="meal-fit-heading">Fit for your next meal</h2>
            <p>{rec.explanation}</p>
            <MacroMatchSummary match={rec.macro_match} />
          </section>

          <section className="goal-fit-card" aria-labelledby="meal-allergen-heading">
            <h2 id="meal-allergen-heading">Allergens</h2>
            {!allergens.complete && <p>Allergen info incomplete</p>}
            {allergens.allergens.length > 0 ? (
              <p>
                {allergens.complete ? "Contains: " : "Contains at least: "}
                {allergens.allergens.map(allergenLabel).join(", ")}
              </p>
            ) : (
              allergens.complete && <p>No major allergens listed by the restaurants.</p>
            )}
            {allergens.containsPork && <p>Contains pork</p>}
            <p className="field-helper">
              Combined from each item&apos;s published allergen info. Shared kitchens may cause cross-contact.
            </p>
          </section>

          <div className="detail-actions">
            <button type="button" className="secondary-button" onClick={onBack}>Back</button>
            <button
              type="button"
              className="primary-button"
              disabled={logging}
              onClick={() => void handleAdd()}
            >
              {logging ? "Adding…" : "Add to Today"}
            </button>
          </div>
          {logError && <p className="field-helper error" role="alert">{logError}</p>}
        </div>
      </main>
      <BottomNav active="home" onNavigate={onNavigate} />
    </div>
  );
}
