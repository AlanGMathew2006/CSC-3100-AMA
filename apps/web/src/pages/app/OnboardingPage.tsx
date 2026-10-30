import { useCallback, useEffect, useState, type FormEvent } from "react";
import { HALAL_FRIENDLY_NOTE } from "@csc-3100-ama/shared";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { completeOnboarding, fetchLocations } from "../../lib/api";
import { errorMessage } from "../../lib/errors";
import type { DiningLocation } from "../../types/dashboard";

type OnboardingPageProps = {
  onComplete: () => void;
};

type FieldName = "balance" | "target" | "calories" | "protein" | "carbs" | "fat";

const PRIORITIES = ["High protein", "Lower calorie", "Balanced", "Budget-friendly"];
const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Halal-friendly", "Gluten-free", "No seafood"];
const toNumber = (value: string): number => Number(value.trim());

const isValid = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
};

function toggleValue(value: string, values: string[]): string[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [values, setValues] = useState<Record<FieldName, string>>({
    balance: "",
    target: "",
    calories: "2000",
    protein: "100",
    carbs: "250",
    fat: "70",
  });
  const [errorField, setErrorField] = useState<FieldName | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<DiningLocation[]>([]);
  const [locationError, setLocationError] = useState("");
  const [nutritionPriorities, setNutritionPriorities] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);

  const loadLocations = useCallback(() => {
    setLocationError("");
    void fetchLocations()
      .then(setLocations)
      .catch((err: unknown) => setLocationError(errorMessage(err)));
  }, []);

  useEffect(loadLocations, [loadLocations]);

  const set = (name: FieldName) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setErrorField(null);

    const invalid = (Object.keys(values) as FieldName[]).find(
      (name) => !isValid(values[name]),
    );
    if (invalid) {
      setErrorField(invalid);
      setError("Enter a number of 0 or more in every field.");
      return;
    }
    const fractionalGoal = (
      ["calories", "protein", "carbs", "fat"] as const
    ).find((name) => !Number.isInteger(toNumber(values[name])));
    if (fractionalGoal) {
      setErrorField(fractionalGoal);
      setError("Enter whole numbers for your nutrition goals.");
      return;
    }

    setSubmitting(true);
    try {
      await completeOnboarding({
        dining_dollars_balance: toNumber(values.balance),
        daily_spending_target: toNumber(values.target),
        calories: toNumber(values.calories),
        protein_g: toNumber(values.protein),
        carbs_g: toNumber(values.carbs),
        fat_g: toNumber(values.fat),
        nutrition_priorities: nutritionPriorities,
        dietary_restrictions: dietaryRestrictions,
        preferred_location_ids: preferredLocations,
      });
      onComplete();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const choice = (
    label: string,
    selected: boolean,
    onClick: () => void,
  ) => (
    <button
      key={label}
      type="button"
      className={`choice-chip${selected ? " choice-chip--selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );

  return (
    <div className="page-shell">
      <BrandHeader />

      <form className="auth-content onboarding-content" onSubmit={handleSubmit} noValidate>
        <div className="intro-block">
          <h1>Set Your Plan</h1>
          <p>Enter your budget and preferences to personalize your recommendations.</p>
        </div>

        <div className="onboarding-form">
          <p className="section-header">Enter your plan metrics</p>
          <div className="metric-input-grid">
            <Field label="Dining Dollar Balance" value={values.balance} onChange={set("balance")} inputMode="decimal" prefix="$" invalid={errorField === "balance"} />
            <Field label="Daily Spending Target" value={values.target} onChange={set("target")} inputMode="decimal" prefix="$" invalid={errorField === "target"} />
          </div>

          <details className="goals-details">
            <summary>Adjust daily nutrition targets</summary>
            <div className="metric-input-grid">
              <Field label="Daily calories" value={values.calories} onChange={set("calories")} inputMode="numeric" invalid={errorField === "calories"} />
              <Field label="Daily protein (g)" value={values.protein} onChange={set("protein")} inputMode="numeric" invalid={errorField === "protein"} />
              <Field label="Daily carbs (g)" value={values.carbs} onChange={set("carbs")} inputMode="numeric" invalid={errorField === "carbs"} />
              <Field label="Daily fat (g)" value={values.fat} onChange={set("fat")} inputMode="numeric" invalid={errorField === "fat"} />
            </div>
          </details>

          <fieldset className="choice-group">
            <legend>Nutrition Priorities</legend>
            <div className="choice-list">
              {PRIORITIES.map((priority) =>
                choice(priority, nutritionPriorities.includes(priority), () =>
                  setNutritionPriorities((current) => toggleValue(priority, current)),
                ),
              )}
            </div>
          </fieldset>

          <fieldset className="choice-group">
            <legend>Dietary Preferences</legend>
            <div className="choice-list">
              {DIETARY_OPTIONS.map((diet) =>
                choice(diet, dietaryRestrictions.includes(diet), () =>
                  setDietaryRestrictions((current) => toggleValue(diet, current)),
                ),
              )}
            </div>
            {dietaryRestrictions.includes("Halal-friendly") && (
              <p className="field-helper">{HALAL_FRIENDLY_NOTE}</p>
            )}
          </fieldset>

          <fieldset className="choice-group">
            <legend>Preferred Dining Locations</legend>
            {locationError ? (
              <p className="field-helper error" role="alert">
                {locationError}{" "}
                <button type="button" className="link-button" onClick={loadLocations}>
                  Retry
                </button>
              </p>
            ) : locations.length === 0 ? (
              <p className="field-helper success">No dining locations are available yet.</p>
            ) : (
              <div className="choice-list">
                {locations.map((location) => {
                  const label = location.campus_area ?? location.restaurant ?? location.name;
                  return choice(
                    label,
                    preferredLocations.includes(location.id),
                    () => setPreferredLocations((current) => toggleValue(location.id, current)),
                  );
                })}
              </div>
            )}
          </fieldset>
          <FormMessage error={error} />

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "See my recommendations"}
          </button>
        </div>
      </form>
    </div>
  );
}
