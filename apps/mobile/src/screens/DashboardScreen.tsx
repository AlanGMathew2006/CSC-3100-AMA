import {
  NO_RECOMMENDATION_ACTIONS,
  NO_RECOMMENDATION_MESSAGES,
  diningDollarsView,
  displayName as userDisplayName,
  greeting,
  macroScoreText,
  maxDailyCalories,
  money,
  nutritionHeading,
  nutritionView,
  recommendationEntries,
  recommendationLog,
  weeklyBarPercent,
  weeklyDays,
  type DashboardView,
  type NutrientKey,
  type Recommendation,
} from "@csc-3100-ama/shared";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import type { AppTab } from "../components/BottomTabBar";
import { Helper, LinkText } from "../components/FormFields";
import { Icon } from "../components/Icon";
import { MacroMatchSummary } from "../components/MacroMatchSummary";
import { MealCard } from "../components/MealCard";
import { NutritionRing } from "../components/NutritionRing";
import { NutritionSheet } from "../components/NutritionSheet";
import { Page } from "../components/Page";
import { Text } from "../components/Text";
import { useToast } from "../components/Toast";
import { useDashboard } from "../hooks/useDashboard";
import { useMenu } from "../hooks/useMenu";
import { usePreferences } from "../hooks/usePreferences";
import { useRecommendations } from "../hooks/useRecommendations";
import { cardShadow, radii, spacing, useStyles, useTheme, type Palette } from "../theme";

// The Home tab: DashboardPage on the web. `refreshKey` changes when the screen comes back into
// view, which reloads everything (the web page reloads each time it is opened).
export function DashboardScreen({
  onOpenRecommendation,
  onNavigate,
  refreshKey = 0,
}: {
  onOpenRecommendation: (rec: Recommendation) => void;
  onNavigate: (tab: AppTab) => void;
  refreshKey?: number;
}) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, logging, reload, addMeal } = useDashboard(refreshKey);
  const menu = useMenu(refreshKey);
  // The hero pick plus up to 3 more for "Best options".
  const recs = useRecommendations({ limit: 4 }, refreshKey);
  const preferences = usePreferences(refreshKey);
  const [view, setView] = useState<DashboardView>("daily");
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientKey | null>(null);

  const nutrition = nutritionView(data, view);
  const { caloriesGoal, macros } = nutrition;
  const dollars = diningDollarsView(data, preferences.data);
  const name = userDisplayName(data?.profile, user);

  // Ranked by the optimizer (GET /api/recommendations); each is shown through MealCard.
  // Several-item meals open the recommendation view. They show even if the menu hasn't loaded.
  const recommendations = useMemo(
    () => recommendationEntries(recs.data?.recommendations ?? [], menu.menu?.items ?? []),
    [recs.data, menu.menu],
  );
  const emptyReason = recs.loading ? null : (recs.data?.reason ?? null);
  const weekDays = useMemo(() => weeklyDays(data?.week_logs, new Date()), [data?.week_logs]);
  const maxDaily = maxDailyCalories(weekDays, caloriesGoal, view === "daily" ? 1 : 7);

  async function handleAddMeal(rec: Recommendation) {
    if (await addMeal(recommendationLog(rec))) {
      toast("Meal added to today");
      void recs.reload();
    }
  }

  const hero = recommendations[0];

  return (
    <Page tabs contentStyle={styles.content}>
      <View style={styles.userHeader}>
        <View style={styles.pill}>
          <Image source={require("../../assets/images/avatar.jpg")} style={styles.avatar} accessibilityIgnoresInvertColors />
          <View style={styles.pillCopy}>
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting(new Date().getHours())},
            </Text>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={styles.bell}>
          <Icon name="bell" color={palette.bellIcon} size={17} />
        </Pressable>
      </View>

      {error ? (
        <Helper tone="error">
          {error} <LinkText label="Retry" onPress={() => void reload()} />
        </Helper>
      ) : null}
      {menu.error ? <Helper tone="error">{menu.error}</Helper> : null}
      {recs.error ? (
        <Helper tone="error">
          {recs.error} <LinkText label="Retry" onPress={() => void recs.reload()} />
        </Helper>
      ) : null}
      {preferences.error ? <Helper tone="error">{preferences.error}</Helper> : null}

      <View style={styles.toggle} accessibilityLabel="Daily or weekly view">
        {(["daily", "weekly"] as const).map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: view === option }}
            style={[styles.toggleOption, view === option && styles.toggleActive]}
            onPress={() => setView(option)}>
            <Text style={[styles.toggleText, view === option && styles.toggleActiveText]}>
              {option === "daily" ? "Daily" : "Weekly"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text accessibilityRole="header" style={styles.sectionHeader}>
        {nutritionHeading(view)}
      </Text>

      <View style={styles.nutritionCard}>
        <View style={styles.nutritionTop}>
          <NutritionRing
            value={nutrition.centerValue}
            label={nutrition.centerLabel}
            detail={nutrition.centerDetail}
            percent={nutrition.caloriesPercent}
          />
          <View style={styles.legend}>
            {macros.map((macro) => (
              <View key={macro.key} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: palette.legend[macro.color] }]} />
                <Text style={styles.legendText}>{macro.label}</Text>
              </View>
            ))}
          </View>
        </View>
        {view === "weekly" && (
          <View style={styles.weekly} accessibilityLabel="Calories logged each day this week">
            {weekDays.map((day, index) => (
              <View key={`${day.label}-${index}`} style={styles.weeklyColumn}>
                <View style={styles.weeklyTrack}>
                  <View
                    style={[
                      styles.weeklyFill,
                      index === 4 && styles.weeklyFillHighlight,
                      { height: `${weeklyBarPercent(day.calories, maxDaily)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.weeklyLabel} maxFontSizeMultiplier={1.2}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text accessibilityRole="header" style={styles.sectionHeader}>
        Nutrient Summary
      </Text>
      <View style={styles.summaryRow}>
        {macros.map((macro) => (
          <Pressable
            key={macro.key}
            accessibilityRole="button"
            accessibilityLabel={`${macro.label} ${macro.text}`}
            style={styles.summaryBox}
            onPress={() => setSelectedNutrient(macro.key)}>
            <View style={styles.summaryTitle}>
              <View style={[styles.summaryDot, { backgroundColor: palette.legend[macro.color] }]} />
              <Text style={styles.summaryTitleText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {macro.label}
              </Text>
            </View>
            <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {macro.text}
            </Text>
            <View style={styles.summaryProgress}>
              <View style={[styles.summaryFill, { width: `${macro.percent}%` }]} />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.dollarsCard}>
        <Text style={styles.dollarsEyebrow}>Dining Dollars</Text>
        <View style={styles.dollarsHeader}>
          <Text style={styles.dollarValue}>{money(dollars.balance)}</Text>
          <Text style={styles.remaining}>remaining</Text>
        </View>
        <View style={styles.dollarsMeta}>
          <Text style={[styles.dollarsMetaText, styles.flex]}>{dollars.spentText}</Text>
          {dollars.tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{dollars.tag}</Text>
            </View>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${dollars.budgetPercent}%` }]} />
        </View>
        <Text style={styles.budgetCopy}>{dollars.weekSpentText}</Text>
        {dollars.weeklyBudgetText && (
          <>
            <Text style={styles.budgetCopy}>{dollars.weeklyBudgetText}</Text>
            <Text style={[styles.budgetCopy, styles.budgetBold]}>{dollars.weeklyStatusText}</Text>
          </>
        )}
      </View>

      {recs.loading && recommendations.length === 0 && <Helper tone="muted">Loading meal recommendations…</Helper>}
      {emptyReason && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>{NO_RECOMMENDATION_MESSAGES[emptyReason]}</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={NO_RECOMMENDATION_ACTIONS[emptyReason][0]}
            onPress={() =>
              onNavigate(NO_RECOMMENDATION_ACTIONS[emptyReason][1] === "profile" ? "Profile" : "Explore")
            }>
            <Text style={styles.emptyLink}>{NO_RECOMMENDATION_ACTIONS[emptyReason][0]}</Text>
          </Pressable>
        </View>
      )}
      {hero && (
        <>
          <View style={styles.recommendCard}>
            <Text accessibilityRole="header" style={styles.recommendHeading}>
              What should I eat next?
            </Text>
            <MealCard item={hero.item} onSelect={() => onOpenRecommendation(hero.rec)} />
            {hero.includes && <Text style={styles.explanation}>{hero.includes}</Text>}
            <Text style={styles.explanation}>{hero.rec.explanation}</Text>
            <MacroMatchSummary match={hero.rec.macro_match} />
            <View style={styles.mealActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="View Meal" onPress={() => onOpenRecommendation(hero.rec)}>
                <Text style={styles.textLink}>View Meal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={logging ? "Adding…" : "Add to Today"}
                accessibilityState={{ disabled: logging }}
                disabled={logging}
                style={[styles.actionButton, logging && styles.disabled]}
                onPress={() => void handleAddMeal(hero.rec)}>
                <Text style={styles.actionText}>{logging ? "Adding…" : "Add to Today"}</Text>
              </Pressable>
            </View>
          </View>
          {recommendations.length > 1 && (
            <View style={styles.options}>
              <Text accessibilityRole="header" style={styles.recommendHeading}>
                Best options for you today
              </Text>
              {/* The hero pick is shown above, so this lists the next best options. */}
              {recommendations.slice(1).map((entry, index) => (
                <View key={`${entry.rec.location.id}-${index}`} style={styles.option}>
                  <MealCard item={entry.item} onSelect={() => onOpenRecommendation(entry.rec)} />
                  {entry.includes && <Text style={styles.explanation}>{entry.includes}</Text>}
                  <Text style={styles.explanation}>
                    {macroScoreText(entry.rec.macro_match.score)} · {entry.rec.explanation}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {selectedNutrient && (
        <NutritionSheet
          nutrient={selectedNutrient}
          consumed={data?.today[selectedNutrient] ?? 0}
          goal={data?.goals?.[selectedNutrient] ?? null}
          recentLogs={data?.recent_logs ?? []}
          onClose={() => setSelectedNutrient(null)}
        />
      )}
    </Page>
  );
}

const makeStyles = (p: Palette) => {
  const shadow = p.cardShadow ? cardShadow : null;
  const card = {
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.surface,
    ...shadow,
  } as const;
  return StyleSheet.create({
    flex: { flex: 1 },
    // .app-content (20px sides, 12px gap on the dashboard); the tab bar sits below, so only 30px
    // of the web's 112px bottom padding is needed.
    content: { paddingHorizontal: spacing.gutter, paddingBottom: 30, gap: spacing.dashboardGap },
    userHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    pill: {
      flexShrink: 1,
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 4,
      paddingLeft: 4,
      paddingRight: 12,
      borderWidth: 1,
      borderColor: p.pillBorder,
      borderRadius: 14,
      backgroundColor: p.pillBg,
    },
    avatar: { width: 34, height: 34, borderRadius: 18 },
    pillCopy: { flexShrink: 1, gap: 2 },
    greeting: { fontSize: 10, color: p.greeting },
    name: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
    bell: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: p.bellBorder,
      borderRadius: 18,
      backgroundColor: p.bellBg,
    },
    toggle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      padding: 2,
      borderWidth: 1,
      borderColor: p.chipBorder,
      borderRadius: radii.pill,
      backgroundColor: p.chipBg,
    },
    toggleOption: { flex: 1, alignItems: "center", paddingVertical: 7, paddingHorizontal: 12, borderRadius: radii.pill },
    toggleActive: { backgroundColor: p.selectedBg },
    toggleText: { fontSize: 11, fontWeight: "700", color: p.mode === "dark" ? p.muted : p.text },
    toggleActiveText: { color: p.mode === "dark" ? p.selectedText : "#ffffff" },
    // .section-header: 11px caps, margin 1px 0 -3px
    sectionHeader: {
      marginTop: 1,
      marginBottom: -3,
      fontSize: 11,
      lineHeight: 12,
      letterSpacing: 0.44,
      fontWeight: "700",
      textTransform: "uppercase",
      color: p.heading,
    },
    nutritionCard: { ...card, padding: 14, gap: 4, borderRadius: radii.card },
    nutritionTop: { flexDirection: "row", alignItems: "center", gap: 12 },
    legend: { flex: 1, minWidth: 0, gap: 7, justifyContent: "center" },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { flexShrink: 1, fontSize: 9, color: p.muted },
    weekly: {
      height: 80,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      gap: 8,
      paddingTop: 10,
      paddingHorizontal: 8,
      borderTopWidth: 1,
      borderTopColor: p.weeklyDivider,
    },
    weeklyColumn: { flex: 1, height: "100%", alignItems: "center", gap: 4 },
    weeklyTrack: {
      flex: 1,
      width: 9,
      justifyContent: "flex-end",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: p.weeklyTrackBorder,
      borderRadius: 5,
      backgroundColor: p.weeklyTrackBg,
    },
    weeklyFill: { width: "100%", borderRadius: 4, backgroundColor: p.weeklyFill },
    weeklyFillHighlight: { backgroundColor: p.weeklyFillHighlight },
    weeklyLabel: { fontSize: 8, color: p.muted },
    summaryRow: { flexDirection: "row", gap: 6 },
    summaryBox: { ...card, flex: 1, minWidth: 0, gap: 5, paddingVertical: 8, paddingHorizontal: 6, borderRadius: radii.summary },
    summaryTitle: { flexDirection: "row", alignItems: "center", gap: 4 },
    summaryDot: { width: 7, height: 7, borderRadius: 4 },
    summaryTitleText: { flexShrink: 1, fontSize: 9, fontWeight: "700", color: p.heading },
    summaryValue: { fontSize: 9, fontWeight: "700", color: p.heading },
    summaryProgress: { height: 4, overflow: "hidden", borderRadius: 999, backgroundColor: p.summaryTrack },
    summaryFill: { height: "100%", borderRadius: 999, backgroundColor: p.summaryFill },
    dollarsCard: {
      padding: 14,
      borderWidth: 1,
      borderColor: p.dollarsBorder,
      borderRadius: radii.card,
      backgroundColor: p.dollarsBg,
      ...(p.mode === "light" ? cardShadow : null),
    },
    dollarsEyebrow: { marginBottom: 4, fontSize: 9, textTransform: "uppercase", color: p.dollarsAccent },
    dollarsHeader: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    dollarValue: { fontSize: 24, fontWeight: "800", color: p.dollarsValue },
    remaining: { fontSize: 11, color: p.dollarsAccent },
    dollarsMeta: { marginTop: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    dollarsMetaText: { fontSize: 9, color: p.dollarsMeta },
    tag: { paddingVertical: 3, paddingHorizontal: 7, borderRadius: radii.pill, backgroundColor: p.dollarsTagBg },
    tagText: { fontSize: 8, fontWeight: "700", textTransform: "uppercase", color: p.dollarsTagText },
    progressTrack: { height: 5, marginTop: 6, overflow: "hidden", borderRadius: radii.pill, backgroundColor: p.dollarsTrack },
    progressBar: { height: "100%", borderRadius: radii.pill, backgroundColor: p.dollarsBar },
    budgetCopy: { marginTop: 6, fontSize: 9, color: p.mode === "dark" ? p.dollarsMeta : p.dollarsAccent },
    budgetBold: { fontWeight: "500", color: p.dollarsBold },
    emptyCard: {
      padding: 18,
      borderWidth: 1,
      borderColor: p.emptyBorder,
      borderRadius: radii.panel,
      backgroundColor: p.surface,
    },
    emptyText: { marginBottom: 8, fontSize: 13, lineHeight: 19.5, color: p.muted },
    emptyLink: { fontSize: 13, fontWeight: "700", textDecorationLine: "underline", color: p.emptyLink },
    recommendCard: { gap: 8 },
    recommendHeading: {
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.385,
      fontWeight: "800",
      textTransform: "uppercase",
      color: p.mode === "dark" ? p.muted : p.heading,
    },
    explanation: { fontSize: 12, lineHeight: 17, color: p.text },
    mealActions: { marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    textLink: { fontSize: 11, fontWeight: "700", color: p.link },
    actionButton: {
      minHeight: 36,
      minWidth: 118,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: p.actionBorder,
      borderRadius: radii.pill,
      backgroundColor: p.actionBg,
    },
    actionText: { fontSize: 11, fontWeight: "700", color: p.actionText },
    disabled: { opacity: 0.6 },
    options: { gap: 8 },
    option: { gap: 6 },
  });
};
