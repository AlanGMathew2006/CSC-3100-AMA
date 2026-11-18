import {
  ALLERGEN_SAVE_FAILED_MESSAGE,
  DEFAULT_ONBOARDING_VALUES,
  DIETARY_OPTIONS,
  HALAL_FRIENDLY_NOTE,
  NUTRITION_PRIORITIES,
  errorMessage,
  onboardingInput,
  toggleValue,
  validateOnboarding,
  type OnboardingFieldName,
  type OnboardingValues,
} from "@csc-3100-ama/shared";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AuthPage, IntroBlock } from "../components/AuthLayout";
import { AvoidancePicker } from "../components/AvoidancePicker";
import { ChoiceChip, ChoiceGroup, ChoiceList } from "../components/Choice";
import { Field, FormMessage, Helper, LinkText, PrimaryButton } from "../components/FormFields";
import { Text } from "../components/Text";
import { useLoad } from "../hooks/useAsync";
import { api } from "../lib/api";
import { useStyles, type Palette } from "../theme";

// OnboardingPage on the web: the same fields, validation, copy and API calls
// (POST /api/onboarding/complete, then PUT /api/preferences for allergens and avoided foods).
export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const styles = useStyles(makeStyles);
  const [values, setValues] = useState<OnboardingValues>(DEFAULT_ONBOARDING_VALUES);
  const [errorField, setErrorField] = useState<OnboardingFieldName | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const locations = useLoad(api.fetchLocations);
  const [nutritionPriorities, setNutritionPriorities] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [excludedFoods, setExcludedFoods] = useState<string[]>([]);

  const set = (name: OnboardingFieldName) => (value: string) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function handleSubmit() {
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
      await api.completeOnboarding(
        onboardingInput(values, { nutritionPriorities, dietaryRestrictions, preferredLocations }),
      );
      // The onboarding endpoint doesn't take these, so they go through the preferences endpoint.
      if (allergens.length > 0 || excludedFoods.length > 0) {
        try {
          await api.updatePreferences({ allergens, excluded_foods: excludedFoods });
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

  const choice = (label: string, selected: boolean, onPress: () => void) => (
    <ChoiceChip key={label} label={label} selected={selected} onPress={onPress} />
  );

  const locationList = locations.data ?? [];

  return (
    <AuthPage gap={20} top={42}>
      <IntroBlock title="Set Your Plan">
        Enter your budget and preferences to personalize your recommendations.
      </IntroBlock>

      <View style={styles.form}>
        <Text style={styles.sectionHeader}>Enter your plan metrics</Text>
        <View style={styles.grid}>
          <View style={styles.cell}>
            <Field
              compact
              label="Dining Dollar Balance"
              value={values.balance}
              onChangeText={set("balance")}
              keyboardType="decimal-pad"
              prefix="$"
              invalid={errorField === "balance"}
            />
          </View>
          <View style={styles.cell}>
            <Field
              compact
              label="Daily Spending Target"
              value={values.target}
              onChangeText={set("target")}
              keyboardType="decimal-pad"
              prefix="$"
              invalid={errorField === "target"}
            />
          </View>
        </View>

        <View style={styles.details}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adjust daily nutrition targets"
            accessibilityState={{ expanded: goalsOpen }}
            onPress={() => setGoalsOpen((open) => !open)}
            style={styles.summary}>
            <Text style={styles.marker}>{goalsOpen ? "▾" : "▸"}</Text>
            <Text style={styles.summaryText}>Adjust daily nutrition targets</Text>
          </Pressable>
          {goalsOpen && (
            <View style={styles.goalsGrid}>
              <View style={styles.cell}>
                <Field
                  compact
                  label="Daily calories"
                  value={values.calories}
                  onChangeText={set("calories")}
                  keyboardType="number-pad"
                  invalid={errorField === "calories"}
                />
              </View>
              <View style={styles.cell}>
                <Field
                  compact
                  label="Daily protein (g)"
                  value={values.protein}
                  onChangeText={set("protein")}
                  keyboardType="number-pad"
                  invalid={errorField === "protein"}
                />
              </View>
              <View style={styles.cell}>
                <Field
                  compact
                  label="Daily carbs (g)"
                  value={values.carbs}
                  onChangeText={set("carbs")}
                  keyboardType="number-pad"
                  invalid={errorField === "carbs"}
                />
              </View>
              <View style={styles.cell}>
                <Field
                  compact
                  label="Daily fat (g)"
                  value={values.fat}
                  onChangeText={set("fat")}
                  keyboardType="number-pad"
                  invalid={errorField === "fat"}
                />
              </View>
            </View>
          )}
        </View>

        <ChoiceGroup title="Nutrition Priorities" legend="form">
          <ChoiceList>
            {NUTRITION_PRIORITIES.map((priority) =>
              choice(priority, nutritionPriorities.includes(priority), () =>
                setNutritionPriorities((current) => toggleValue(priority, current)),
              ),
            )}
          </ChoiceList>
        </ChoiceGroup>

        <ChoiceGroup title="Dietary Preferences" legend="form">
          <ChoiceList>
            {DIETARY_OPTIONS.map((diet) =>
              choice(diet, dietaryRestrictions.includes(diet), () =>
                setDietaryRestrictions((current) => toggleValue(diet, current)),
              ),
            )}
          </ChoiceList>
          {dietaryRestrictions.includes("Halal-friendly") && <Helper>{HALAL_FRIENDLY_NOTE}</Helper>}
        </ChoiceGroup>

        <AvoidancePicker
          legend="form"
          inputHeight={42}
          allergens={allergens}
          excludedFoods={excludedFoods}
          onAllergensChange={setAllergens}
          onExcludedFoodsChange={setExcludedFoods}
        />

        <ChoiceGroup title="Preferred Dining Locations" legend="form">
          {locations.error ? (
            <Helper tone="error">
              {locations.error} <LinkText label="Retry" onPress={() => void locations.reload()} />
            </Helper>
          ) : locationList.length === 0 ? (
            <Helper tone="muted">No dining locations are available yet.</Helper>
          ) : (
            <ChoiceList>
              {locationList.map((location) => {
                const label = location.campus_area ?? location.restaurant ?? location.name;
                return (
                  <ChoiceChip
                    key={location.id}
                    label={label}
                    selected={preferredLocations.includes(location.id)}
                    onPress={() => setPreferredLocations((current) => toggleValue(location.id, current))}
                  />
                );
              })}
            </ChoiceList>
          )}
        </ChoiceGroup>
        <FormMessage error={error} />

        <PrimaryButton
          label={submitting ? "Saving…" : "See my recommendations"}
          onPress={() => void handleSubmit()}
          disabled={submitting}
          minHeight={52}
        />
      </View>
    </AuthPage>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    form: { gap: 16 },
    // .onboarding-form > .section-header: 12px, caps, no letter-spacing, gray
    sectionHeader: {
      fontSize: 12,
      lineHeight: 14,
      fontWeight: "700",
      textTransform: "uppercase",
      color: p.muted,
    },
    grid: { flexDirection: "row", gap: 10 },
    goalsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
    cell: { flex: 1, minWidth: 130 },
    details: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: p.inputBorder,
      borderRadius: 12,
      backgroundColor: p.surface,
    },
    summary: { flexDirection: "row", alignItems: "center", gap: 6 },
    marker: { fontSize: 12, color: p.heading },
    summaryText: { flex: 1, fontSize: 12, fontWeight: "700", color: p.heading },
  });
