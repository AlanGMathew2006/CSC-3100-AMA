import {
  MACRO_LABELS,
  MACRO_STATUS_TEXT,
  macroRowAmount,
  macroScoreText,
  type Macro,
  type MacroMatchResult,
} from "@csc-3100-ama/shared";
import { StyleSheet, View } from "react-native";
import { useStyles, type Palette } from "../theme";
import { Text } from "./Text";

// Macro Match score with a per-macro breakdown against this meal's targets (.macro-match).
export function MacroMatchSummary({
  match,
  tone = "default",
}: {
  match: MacroMatchResult;
  // Inside the green goal-fit card the text color is the card's, as on the web.
  tone?: "default" | "card";
}) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.score}>{macroScoreText(match.score)}</Text>
      <View style={styles.list}>
        {(Object.keys(MACRO_LABELS) as Macro[]).map((macro) => {
          const breakdown = match.breakdown[macro];
          const [label, unit] = MACRO_LABELS[macro];
          const statusStyle =
            breakdown.status === "on_target"
              ? styles.statusOn
              : breakdown.status === "over"
                ? styles.statusOver
                : styles.statusMuted;
          return (
            <View key={macro} style={styles.row}>
              <Text style={[styles.cell, styles.label, tone === "card" && styles.cardText]}>{label}</Text>
              <Text style={[styles.cell, tone === "card" && styles.cardText]}>
                {macroRowAmount(breakdown, unit)}
              </Text>
              <Text style={[styles.cell, styles.status, statusStyle]}>
                {MACRO_STATUS_TEXT[breakdown.status]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    wrap: { gap: 6 },
    score: { fontSize: 13, fontWeight: "700", color: p.heading },
    list: { gap: 3 },
    row: { flexDirection: "row", gap: 8 },
    cell: { fontSize: 11, color: p.text },
    label: { flex: 1 },
    cardText: { color: p.goalFitText },
    // The first column takes the spare width; the status column is 5.5em wide, right-aligned.
    status: { minWidth: 61, textAlign: "right", fontWeight: "600" },
    statusOn: { color: p.matchOn },
    statusOver: { color: p.matchOver },
    statusMuted: { color: p.muted },
  });
