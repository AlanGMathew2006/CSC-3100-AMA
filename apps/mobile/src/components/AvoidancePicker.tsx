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
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useStyles, type Palette } from "../theme";
import { ChoiceChip, ChoiceGroup, ChoiceList } from "./Choice";
import { Helper } from "./FormFields";
import { Text, TextInput } from "./Text";

// Allergens and foods to avoid, shared by onboarding and Profile (AvoidancePicker on the web).
// Allergens are stored as codes ("tree_nut"); older values like "Nuts" still count.
export function AvoidancePicker({
  allergens,
  excludedFoods,
  onAllergensChange,
  onExcludedFoodsChange,
  legend = "caps",
  inputHeight = 52,
}: {
  allergens: string[];
  excludedFoods: string[];
  onAllergensChange: (allergens: string[]) => void;
  onExcludedFoodsChange: (foods: string[]) => void;
  legend?: "caps" | "form";
  // The text field is 42px tall on the onboarding form and 52px on Profile (as on the web).
  inputHeight?: number;
}) {
  const styles = useStyles(makeStyles);
  const [food, setFood] = useState("");

  function addFood() {
    const next = addExcludedFood(excludedFoods, food);
    if (next !== excludedFoods) onExcludedFoodsChange(next);
    if (food.trim()) setFood("");
  }

  return (
    <>
      <ChoiceGroup title="Allergens" legend={legend}>
        <ChoiceList>
          {ALLERGENS.map((code) => (
            <ChoiceChip
              key={code}
              label={allergenLabel(code)}
              selected={isAllergenSelected(allergens, code)}
              onPress={() => onAllergensChange(toggleAllergen(allergens, code))}
            />
          ))}
        </ChoiceList>
        {allergens.length > 0 && <Helper>{ALLERGEN_HIDDEN_NOTE}</Helper>}
      </ChoiceGroup>

      <ChoiceGroup title="Foods to avoid" legend={legend}>
        <View style={styles.addRow}>
          <TextInput
            accessibilityLabel="Food to avoid"
            placeholder="e.g. mushroom"
            placeholderTextColor="#9aa39e"
            maxLength={MAX_FOOD_LENGTH}
            value={food}
            onChangeText={setFood}
            onSubmitEditing={addFood}
            returnKeyType="done"
            autoCorrect={false}
            style={[styles.input, { minHeight: Math.max(inputHeight, 34) }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add"
            onPress={addFood}
            style={styles.addButton}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
        <Helper>{AVOID_FOOD_NOTE}</Helper>
        {excludedFoods.length > 0 && (
          <ChoiceList>
            {excludedFoods.map((entry) => (
              <ChoiceChip
                key={entry}
                label={`${entry} ×`}
                accessibilityLabel={`Remove ${entry}`}
                selected
                onPress={() => onExcludedFoodsChange(excludedFoods.filter((value) => value !== entry))}
              />
            ))}
          </ChoiceList>
        )}
      </ChoiceGroup>
    </>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    // .avoid-add-row .input-control: 1px gold border, 11px radius, 12px side padding, 16px text.
    input: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 11,
      fontSize: 16,
      color: p.text,
    },
    addButton: {
      minHeight: 34,
      justifyContent: "center",
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: p.chipBorder,
      borderRadius: 18,
      backgroundColor: p.chipBg,
    },
    addText: { fontSize: 11, fontWeight: "600", color: p.chipText },
  });
