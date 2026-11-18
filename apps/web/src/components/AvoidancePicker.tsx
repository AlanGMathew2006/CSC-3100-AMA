import { useState } from "react";
import { ALLERGENS, normalizeAllergen } from "@csc-3100-ama/shared";
import { allergenLabel } from "../lib/allergens";

type AvoidancePickerProps = {
  allergens: string[];
  excludedFoods: string[];
  onAllergensChange: (allergens: string[]) => void;
  onExcludedFoodsChange: (foods: string[]) => void;
};

const MAX_FOOD_LENGTH = 100; // the API accepts strings up to 100 characters

// Allergens and foods to avoid, shared by onboarding and the Profile page.
// Allergens are stored as codes ("tree_nut"); older values like "Nuts" still count.
export function AvoidancePicker({
  allergens,
  excludedFoods,
  onAllergensChange,
  onExcludedFoodsChange,
}: AvoidancePickerProps) {
  const [food, setFood] = useState("");

  const isSelected = (code: string) =>
    allergens.some((value) => normalizeAllergen(value) === code);

  function toggleAllergen(code: string) {
    onAllergensChange(
      isSelected(code)
        ? allergens.filter((value) => normalizeAllergen(value) !== code)
        : [...allergens, code],
    );
  }

  function addFood() {
    const name = food.trim();
    if (!name) return;
    if (!excludedFoods.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
      onExcludedFoodsChange([...excludedFoods, name]);
    }
    setFood("");
  }

  return (
    <>
      <fieldset className="choice-group">
        <legend>Allergens</legend>
        <div className="choice-list">
          {ALLERGENS.map((code) => (
            <button
              key={code}
              type="button"
              className={`choice-chip${isSelected(code) ? " choice-chip--selected" : ""}`}
              aria-pressed={isSelected(code)}
              onClick={() => toggleAllergen(code)}
            >
              {allergenLabel(code)}
            </button>
          ))}
        </div>
        {allergens.length > 0 && (
          <p className="field-helper">
            Meals without verified allergen information are hidden while an allergen is selected.
          </p>
        )}
      </fieldset>

      <fieldset className="choice-group">
        <legend>Foods to avoid</legend>
        <div className="avoid-add-row">
          <input
            className="input-control"
            aria-label="Food to avoid"
            placeholder="e.g. mushroom"
            maxLength={MAX_FOOD_LENGTH}
            value={food}
            onChange={(event) => setFood(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFood();
              }
            }}
          />
          <button type="button" className="choice-chip" onClick={addFood}>
            Add
          </button>
        </div>
        <p className="field-helper">Hides meals with this word in their name.</p>
        {excludedFoods.length > 0 && (
          <div className="choice-list">
            {excludedFoods.map((entry) => (
              <button
                key={entry}
                type="button"
                className="choice-chip choice-chip--selected"
                aria-label={`Remove ${entry}`}
                onClick={() => onExcludedFoodsChange(excludedFoods.filter((value) => value !== entry))}
              >
                {entry} ×
              </button>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );
}
