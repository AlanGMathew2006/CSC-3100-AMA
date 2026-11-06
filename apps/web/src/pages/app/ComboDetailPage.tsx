import { useState } from "react";
import { isBuildYourOwnCombo, sumMacros, type MenuCombo, type MenuItem } from "@csc-3100-ama/shared";
import { BottomNav, type AppTab } from "../../components/BottomNav";
import { BrandHeader } from "../../components/BrandHeader";
import { OpenBadge } from "../../components/MealCard";
import { useLogMeal } from "../../hooks/useLogMeal";
import { useMenu } from "../../hooks/useMenu";
import { comboLog, type ComboPick } from "../../lib/mealLog";
import { servingLabel, servingStatusText } from "../../lib/serving";

const money = (amount: number) => `$${amount.toFixed(2)}`;
const byName = (a: MenuItem, b: MenuItem) => a.name.localeCompare(b.name);

function ChoiceSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  options: MenuItem[];
  placeholder: string;
  onChange: (id: string) => void;
}) {
  return (
    <label className="filter-select-wrap">
      <span className="field-helper">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

// A combo from Explore's "Combos & Meals". A Bowl / Plate / Bigger Plate lets the user pick the
// base(s) and entrees and logs them as one entry at the combo price.
export function ComboDetailPage({
  combo,
  onBack,
  onNavigate,
  onToast,
}: {
  combo: MenuCombo;
  onBack: () => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (message: string) => void;
}) {
  const { menu, error: menuError } = useMenu();
  const log = useLogMeal();
  const buildYourOwn = isBuildYourOwnCombo(combo);
  const parts = (menu?.items ?? []).filter((item) => item.restaurant === combo.restaurant);
  const bases = parts.filter((item) => item.meal_component === "base").sort(byName);
  const entrees = parts.filter((item) => item.meal_component === "entree").sort(byName);
  const entreeCount = Number(combo.entree_count ?? 0);

  const [baseId, setBaseId] = useState("");
  const [secondBaseId, setSecondBaseId] = useState(""); // "" = a full serving of one base
  const [entreeIds, setEntreeIds] = useState<string[]>(() => Array(entreeCount).fill(""));

  const find = (id: string) => parts.find((item) => item.id === id);
  const base = find(baseId);
  const secondBase = find(secondBaseId);
  const chosenEntrees = entreeIds.map(find);
  const complete = Boolean(base) && chosenEntrees.every(Boolean);
  const picks: ComboPick[] = complete
    ? [
        ...(base && secondBase
          ? [
              { item: base, servings: 0.5 },
              { item: secondBase, servings: 0.5 },
            ]
          : base
            ? [{ item: base, servings: 1 }]
            : []),
        ...chosenEntrees.flatMap((item) => (item ? [{ item, servings: 1 }] : [])),
      ]
    : [];
  const totals = complete ? sumMacros(picks) : null;
  const location = combo.locations?.[0];
  const serving = servingLabel(combo);
  const servingStatus = servingStatusText(combo.serving_windows, combo.availability);

  async function handleAdd() {
    if (await log.addMeal(comboLog(combo, buildYourOwn ? picks : null))) {
      onToast("Added to today");
      onBack();
    }
  }

  return (
    <div className="page-shell page-shell--dashboard">
      <BrandHeader />
      <main className="app-content detail-content">
        {menuError && <p className="field-helper error" role="alert">{menuError}</p>}
        {log.error && <p className="field-helper error" role="alert">{log.error}</p>}
        <div className="detail-heading">
          <button type="button" className="back-button" onClick={onBack}>
            <img src="/assets/figma/back.svg" alt="" />
            <span>Combo Details</span>
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-title-row">
            <div>
              <h1>{combo.name}</h1>
              <p className="detail-location">
                <span /> {location ? (location.campus_area ?? location.location_name) : combo.restaurant}
              </p>
              {location && <OpenBadge status={location.open_status} />}
              {serving && (
                <p className="field-helper">
                  {serving}
                  {servingStatus && ` · ${servingStatus}`}
                </p>
              )}
            </div>
            <strong>{money(Number(combo.price))}</strong>
          </div>
          {combo.description && <p className="field-helper">{combo.description}</p>}

          {buildYourOwn ? (
            <section className="goal-fit-card" aria-labelledby="combo-build-heading">
              <h2 id="combo-build-heading">Build your {combo.name.toLowerCase()}</h2>
              <ChoiceSelect
                label="Base"
                value={baseId}
                options={bases}
                placeholder="Choose a base"
                onChange={setBaseId}
              />
              <ChoiceSelect
                label="Half and half (optional)"
                value={secondBaseId}
                options={bases.filter((option) => option.id !== baseId)}
                placeholder="No, a full serving"
                onChange={setSecondBaseId}
              />
              {entreeIds.map((id, index) => (
                <ChoiceSelect
                  key={index}
                  label={entreeCount > 1 ? `Entree ${index + 1}` : "Entree"}
                  value={id}
                  options={entrees}
                  placeholder="Choose an entree"
                  onChange={(next) =>
                    setEntreeIds((current) => current.map((old, i) => (i === index ? next : old)))
                  }
                />
              ))}
            </section>
          ) : (
            <section className="goal-fit-card" aria-labelledby="combo-contents-heading">
              <h2 id="combo-contents-heading">What&apos;s in this combo</h2>
              <p>Contents coming soon</p>
              <p className="field-helper">
                You can still log it. Its nutrition is unavailable, so it won&apos;t count toward your macros.
              </p>
            </section>
          )}

          {buildYourOwn && (
            <div className="detail-nutrition-grid">
              {(
                [
                  ["Calories", totals?.calories, ""],
                  ["Protein", totals?.protein_g, "g"],
                  ["Carbs", totals?.carbs_g, "g"],
                  ["Fat", totals?.fat_g, "g"],
                ] as const
              ).map(([label, amount, unit]) => (
                <div className="detail-nutrition" key={label}>
                  <strong>{amount == null ? "—" : `${amount}${unit}`}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}
          {buildYourOwn && !complete && (
            <p className="field-helper">Choose a base and {entreeCount > 1 ? `${entreeCount} entrees` : "an entree"} to see the totals.</p>
          )}

          <div className="detail-actions">
            <button type="button" className="secondary-button" onClick={onBack}>Back</button>
            <button
              type="button"
              className="primary-button"
              disabled={log.logging || (buildYourOwn && !complete)}
              onClick={() => void handleAdd()}
            >
              {log.logging ? "Adding…" : "Add to Today"}
            </button>
          </div>
        </div>
      </main>
      <BottomNav active="explore" onNavigate={onNavigate} />
    </div>
  );
}
