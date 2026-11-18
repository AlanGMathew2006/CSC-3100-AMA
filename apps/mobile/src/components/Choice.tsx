import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { radii, useStyles, type Palette } from "../theme";
import { Text } from "./Text";

// A pill you tap to turn a choice on or off (.choice-chip).
export function ChoiceChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

// A titled group of choices (.choice-group with its legend). `legend` is the small gray caps
// heading used on Profile; "form" is the larger plain heading used on the onboarding form.
export function ChoiceGroup({
  title,
  legend = "caps",
  children,
}: {
  title: string;
  legend?: "caps" | "form";
  children: ReactNode;
}) {
  const styles = useStyles(makeStyles);
  return (
    <View>
      <Text
        accessibilityRole="header"
        style={[styles.legend, legend === "form" && styles.legendForm]}>
        {title}
      </Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

export function ChoiceList({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.list}>{children}</View>;
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    chip: {
      minHeight: 34,
      justifyContent: "center",
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: p.chipBorder,
      borderRadius: radii.chip,
      backgroundColor: p.chipBg,
    },
    chipSelected: { borderColor: p.selectedBorder, backgroundColor: p.selectedBg },
    chipText: { fontSize: 11, fontWeight: "600", color: p.chipText },
    chipTextSelected: { color: p.selectedText },
    legend: {
      marginBottom: 9,
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.275,
      textTransform: "uppercase",
      color: p.muted,
    },
    legendForm: {
      fontSize: 13,
      letterSpacing: 0,
      textTransform: "none",
      color: p.mode === "dark" ? p.muted : p.text,
    },
    groupBody: {},
    list: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  });
