import { useState } from "react";
import {
  ALLERGENS,
  ALLERGEN_HIDDEN_NOTE,
  AVOID_FOOD_NOTE,
  MAX_FOOD_LENGTH,
  addExcludedFood,
  allergenLabel,
  isAllergenSelected,
  toggleAllergen,
} from "@csc-3100-ama/shared";

type AvoidancePickerProps = {
  allergens: string[];
  excludedFoods: string[];
  onAllergensChange: (allergens: string[]) => void;
  onExcludedFoodsChange: (foods: string[]) => void;
};

// Allergens and foods to avoid, shared by onboarding and the Profile page.
// Allergens are stored as codes ("tree_nut"); older values like "Nuts" still count.
export function AvoidancePicker({
  allergens,
  excludedFoods,
  onAllergensChange,
  onExcludedFoodsChange,
}: AvoidancePickerProps) {
  const [food, setFood] = useState("");

  const isSelected = (code: string) => isAllergenSelected(allergens, code);

  function addFood() {
    const next = addExcludedFood(excludedFoods, food);
    if (next !== excludedFoods) onExcludedFoodsChange(next);
    if (food.trim()) setFood("");
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
              onClick={() => onAllergensChange(toggleAllergen(allergens, code))}
            >
              {allergenLabel(code)}
            </button>
          ))}
        </div>
        {allergens.length > 0 && (
          <p className="field-helper">{ALLERGEN_HIDDEN_NOTE}</p>
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
        <p className="field-helper">{AVOID_FOOD_NOTE}</p>
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
