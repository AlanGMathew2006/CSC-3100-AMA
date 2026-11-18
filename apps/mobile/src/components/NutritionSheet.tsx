import type { MealLogInput, NutrientKey } from "@csc-3100-ama/shared";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStyles, type Palette } from "../theme";
import { PrimaryButton } from "./FormFields";
import { Icon } from "./Icon";
import type { IconName } from "./iconPaths";
import { Text } from "./Text";

const LABELS: Record<NutrientKey, string> = {
  protein_g: "Protein",
  carbs_g: "Carbs",
  fat_g: "Fat",
  fiber_g: "Fiber",
};

const sourceIcon = (name: string, nutrient: NutrientKey): IconName => {
  if (/chicken|bowl/i.test(name)) return "circleX";
  if (/yogurt|milk/i.test(name)) return "milk";
  if (/sandwich/i.test(name)) return "sandwich";
  if (nutrient === "protein_g") return "protein";
  return "sandwich";
};

// The sheet that opens from a Nutrient Summary tile (NutritionSheet on the web).
export function NutritionSheet({
  nutrient,
  consumed,
  goal,
  recentLogs,
  onClose,
}: {
  nutrient: NutrientKey;
  consumed: number;
  goal: number | null;
  recentLogs: MealLogInput[];
  onClose: () => void;
}) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const label = LABELS[nutrient];
  const remaining = goal == null ? null : Math.max(goal - consumed, 0);
  const percent = goal ? Math.min((consumed / goal) * 100, 100) : 0;
  const sources = recentLogs
    .map((log) => ({ name: log.name, amount: log[nutrient] ?? 0 }))
    .filter((source) => source.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close nutrition details">
        <Pressable
          style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}
          onPress={() => {}}
          accessible={false}>
          <ScrollView bounces={false}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>
                {label}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close nutrition details"
                style={styles.close}
                onPress={onClose}>
                <Icon name="closeCircle" color="#24302b" size={18} />
              </Pressable>
            </View>
            <View style={styles.totalRow}>
              <View style={styles.totalCol}>
                <Text style={styles.consumed}>{Math.round(consumed)}g</Text>
                <Text style={styles.caption}>consumed today</Text>
              </View>
              <View style={[styles.totalCol, styles.goalCol]}>
                <Text style={styles.goal}>{goal == null ? "No goal" : `${Math.round(goal)}g goal`}</Text>
                <Text style={styles.caption}>
                  {remaining == null ? "Set a goal in Profile" : `${Math.round(remaining)}g remaining`}
                </Text>
              </View>
            </View>
            <View style={styles.progress}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
            <Text style={styles.percent}>
              {goal == null
                ? "Track progress toward your daily goal"
                : `${Math.round(percent)}% of daily goal reached`}
            </Text>
            <Text style={styles.sourcesTitle}>Top sources today</Text>
            {sources.length ? (
              <View style={styles.sources}>
                {sources.map((source) => (
                  <View key={source.name} style={styles.source}>
                    <Icon name={sourceIcon(source.name, nutrient)} color="#154734" size={18} />
                    <Text style={styles.sourceName}>{source.name}</Text>
                    <Text style={styles.sourceAmount}>
                      {Math.round(source.amount)}g {label.toLowerCase()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Log a meal to see your top {label.toLowerCase()} sources.
                </Text>
              </View>
            )}
            <PrimaryButton label="View Nutrition Details" onPress={onClose} minHeight={50} fontSize={13} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// The sheet is white in both themes on the web (its CSS has no dark variant).
const makeStyles = (_p: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      padding: 16,
      paddingBottom: 0,
      backgroundColor: "rgba(15, 19, 17, 0.85)",
    },
    sheet: {
      maxHeight: "85%",
      paddingTop: 12,
      paddingHorizontal: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: "#ffffff",
    },
    handle: { width: 40, height: 4, marginBottom: 11, alignSelf: "center", borderRadius: 99, backgroundColor: "#d1d5db" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", color: "#3b82f6" },
    close: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#f0f1f2" },
    totalRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 24, marginBottom: 16 },
    totalCol: { gap: 3 },
    goalCol: { paddingLeft: 14, borderLeftWidth: 1, borderLeftColor: "#c5b783" },
    consumed: { fontSize: 31, lineHeight: 31, fontWeight: "700", color: "#24302b" },
    goal: { fontSize: 15, fontWeight: "700", color: "#24302b" },
    caption: { fontSize: 11, color: "#68736d" },
    progress: { height: 7, overflow: "hidden", borderRadius: 99, backgroundColor: "#f0f1f2" },
    progressFill: { height: "100%", borderRadius: 99, backgroundColor: "#3b82f6" },
    percent: { marginTop: 6, marginBottom: 20, fontSize: 11, fontWeight: "700", color: "#24302b" },
    sourcesTitle: { marginBottom: 10, fontSize: 11, fontWeight: "700", textTransform: "uppercase", color: "#68736d" },
    sources: { gap: 8, marginBottom: 18 },
    source: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: "#c5b783",
      borderRadius: 12,
      backgroundColor: "#faf9f5",
    },
    sourceName: { flex: 1, fontSize: 11, fontWeight: "700", color: "#24302b" },
    sourceAmount: { fontSize: 11, fontWeight: "700", color: "#154734" },
    empty: { marginBottom: 18, padding: 18, borderWidth: 1, borderColor: "#d9d2bf", borderRadius: 14, backgroundColor: "#ffffff" },
    emptyText: { fontSize: 13, lineHeight: 19.5, color: "#68736d" },
  });
