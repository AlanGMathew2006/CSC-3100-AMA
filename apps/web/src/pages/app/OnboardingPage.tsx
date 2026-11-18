import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ALLERGEN_SAVE_FAILED_MESSAGE,
  DEFAULT_ONBOARDING_VALUES,
  DIETARY_OPTIONS,
  HALAL_FRIENDLY_NOTE,
  NUTRITION_PRIORITIES as PRIORITIES,
  onboardingInput,
  toggleValue,
  validateOnboarding,
  type OnboardingFieldName as FieldName,
  type OnboardingValues,
  errorMessage,
} from "@csc-3100-ama/shared";
import { AvoidancePicker } from "../../components/AvoidancePicker";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { completeOnboarding, fetchLocations, updatePreferences } from "../../lib/api";
import type { DiningLocation } from "../../types/dashboard";

type OnboardingPageProps = {
  onComplete: () => void;
};

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [values, setValues] = useState<OnboardingValues>(DEFAULT_ONBOARDING_VALUES);
  const [errorField, setErrorField] = useState<FieldName | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<DiningLocation[]>([]);
  const [locationError, setLocationError] = useState("");
  const [nutritionPriorities, setNutritionPriorities] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [excludedFoods, setExcludedFoods] = useState<string[]>([]);

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

    const issue = validateOnboarding(values);
    if (issue) {
      setErrorField(issue.field);
      setError(issue.message);
      return;
    }

    setSubmitting(true);
    try {
      await completeOnboarding(
        onboardingInput(values, { nutritionPriorities, dietaryRestrictions, preferredLocations }),
      );
      // The onboarding endpoint doesn't take these, so they go through the preferences endpoint.
      if (allergens.length > 0 || excludedFoods.length > 0) {
        try {
          await updatePreferences({ allergens, excluded_foods: excludedFoods });
        } catch {
          setError(ALLERGEN_SAVE_FAILED_MESSAGE);
          return;
        }
      }
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

          <AvoidancePicker
            allergens={allergens}
            excludedFoods={excludedFoods}
            onAllergensChange={setAllergens}
            onExcludedFoodsChange={setExcludedFoods}
          />

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
