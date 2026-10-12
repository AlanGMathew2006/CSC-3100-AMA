import { useState, type FormEvent } from "react";
import { BrandHeader } from "../../components/BrandHeader";
import { Field, FormMessage } from "../../components/FormFields";
import { saveGoals, updateProfile } from "../../lib/api";
import { errorMessage } from "../../lib/errors";

type OnboardingPageProps = {
  onComplete: () => void;
};

type FieldName = "balance" | "target" | "calories" | "protein" | "carbs" | "fat";

const toNumber = (value: string): number => Number(value.trim());
const isValid = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed !== "" && Number.isFinite(Number(trimmed)) && Number(trimmed) >= 0;
};

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

    setSubmitting(true);
    try {
      await saveGoals({
        calories: toNumber(values.calories),
        protein_g: toNumber(values.protein),
        carbs_g: toNumber(values.carbs),
        fat_g: toNumber(values.fat),
      });
      await updateProfile({
        dining_dollars_balance: toNumber(values.balance),
        daily_spending_target: toNumber(values.target),
        onboarding_completed: true,
      });
      onComplete();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <BrandHeader />

      <form className="auth-content" onSubmit={handleSubmit} noValidate>
        <div className="intro-block">
          <h1>Set up your plan</h1>
          <p>Tell us your budget and daily goals. You can change these later.</p>
        </div>

        <div className="form-stack">
          <Field label="Dining Dollars balance ($)" value={values.balance} onChange={set("balance")} invalid={errorField === "balance"} />
          <Field label="Daily spending target ($)" value={values.target} onChange={set("target")} invalid={errorField === "target"} />
          <Field label="Daily calories" value={values.calories} onChange={set("calories")} invalid={errorField === "calories"} />
          <Field label="Daily protein (g)" value={values.protein} onChange={set("protein")} invalid={errorField === "protein"} />
          <Field label="Daily carbs (g)" value={values.carbs} onChange={set("carbs")} invalid={errorField === "carbs"} />
          <Field label="Daily fat (g)" value={values.fat} onChange={set("fat")} invalid={errorField === "fat"} />
          <FormMessage error={error} />
        </div>

        <div className="auth-actions">
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Saving…" : "Save and continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
