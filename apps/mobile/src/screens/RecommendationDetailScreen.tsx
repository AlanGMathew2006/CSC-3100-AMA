import {
  allergenLabel,
  combinedAllergens,
  lineNutrition,
  linePrice,
  money,
  quantityLabel,
  recommendationLabel,
  recommendationLog,
  servingLabel,
  type Recommendation,
} from "@csc-3100-ama/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { Helper, PrimaryButton, SecondaryButton } from "../components/FormFields";
import { GradientBox } from "../components/GradientBox";
import { Icon } from "../components/Icon";
import { MacroMatchSummary } from "../components/MacroMatchSummary";
import { Page } from "../components/Page";
import { tabContent } from "../components/PageTitle";
import { Text } from "../components/Text";
import { useToast } from "../components/Toast";
import { useLogMeal } from "../hooks/useLogMeal";
import { useMenu } from "../hooks/useMenu";
import { backShadow, radii, useStyles, useTheme, type Palette } from "../theme";

// A whole recommended meal (several items, maybe a combo): RecommendationDetailPage on the web.
// The item cards open each item's own details on the web; those come with Explore in the next
// phase, so here they are not tappable.
export function RecommendationDetailScreen({ rec, onBack }: { rec: Recommendation; onBack: () => void }) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const toast = useToast();
  const { menu, loading: menuLoading, error: menuError } = useMenu();
  const { logging, error: logError, addMeal } = useLogMeal();
  const menuItems = menu?.items ?? [];
  const allergens = combinedAllergens(rec, menuItems);

  async function handleAdd() {
    if (await addMeal(recommendationLog(rec))) {
      toast("Meal added to today");
      onBack();
    }
  }

  return (
    <Page tabs contentStyle={tabContent}>
      {menuError ? <Helper tone="error">{menuError}</Helper> : null}
      <View style={styles.heading}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recommended Meal"
          style={styles.back}
          onPress={onBack}>
          <View style={styles.backCircle}>
            <Icon name="back" color={palette.backIcon} size={18} />
          </View>
          <Text style={styles.backText}>Recommended Meal</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            {/* A combo's parts are listed below, so its name is enough for the heading. */}
            <Text accessibilityRole="header" style={styles.title}>
              {rec.combo ? rec.combo.name : recommendationLabel(rec)}
            </Text>
            <View style={styles.location}>
              <View style={styles.dot} />
              <Text style={styles.locationText}>{rec.location.name}</Text>
            </View>
          </View>
          <Text style={styles.price}>{money(rec.total_price)}</Text>
        </View>
        {rec.combo && (
          <Helper>
            {rec.combo.name} combo, {money(rec.combo.price)}
          </Helper>
        )}

        <View style={styles.items}>
          <Text accessibilityRole="header" style={styles.sectionHeading}>
            What&apos;s in this meal
          </Text>
          {rec.items.map((part, index) => {
            const meal = menuItems.find((item) => item.id === part.meal_id);
            const serving = meal ? servingLabel(meal) : null;
            return (
              <View key={`${part.meal_id}-${index}`} style={styles.itemCard}>
                <GradientBox size={48} radius={8} />
                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{quantityLabel(part.quantity, part.name)}</Text>
                  <Text style={styles.itemMeta}>
                    {!meal && menuLoading ? "Loading nutrition…" : lineNutrition(meal, part.quantity)}
                    {serving && ` · ${serving}`}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{linePrice(part)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.goalFit}>
          <Text accessibilityRole="header" style={styles.goalFitHeading}>
            Fit for your next meal
          </Text>
          <Text style={[styles.goalFitText, styles.firstParagraph]}>{rec.explanation}</Text>
          <MacroMatchSummary match={rec.macro_match} tone="card" />
        </View>

        <View style={styles.goalFit}>
          <Text accessibilityRole="header" style={styles.goalFitHeading}>
            Allergens
          </Text>
          {!allergens.complete && (
            <Text style={[styles.goalFitText, styles.firstParagraph]}>Allergen info incomplete</Text>
          )}
          {allergens.allergens.length > 0 ? (
            <Text style={styles.goalFitText}>
              {allergens.complete ? "Contains: " : "Contains at least: "}
              {allergens.allergens.map(allergenLabel).join(", ")}
            </Text>
          ) : (
            allergens.complete && (
              <Text style={[styles.goalFitText, styles.firstParagraph]}>
                No major allergens listed by the restaurants.
              </Text>
            )
          )}
          {allergens.containsPork && <Text style={styles.goalFitText}>Contains pork</Text>}
          <Text style={styles.goalFitText}>
            Combined from each item&apos;s published allergen info. Shared kitchens may cause
            cross-contact.
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.actionCell}>
            <SecondaryButton label="Back" onPress={onBack} minHeight={46} fontSize={12} filled />
          </View>
          <View style={styles.actionCell}>
            <PrimaryButton
              label={logging ? "Adding…" : "Add to Today"}
              onPress={() => void handleAdd()}
              disabled={logging}
              minHeight={46}
              fontSize={12}
            />
          </View>
        </View>
        {logError ? <Helper tone="error">{logError}</Helper> : null}
      </View>
    </Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    back: { flexDirection: "row", alignItems: "center", gap: 12 },
    backCircle: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: p.backCircle,
      ...backShadow,
    },
    backText: { fontSize: 17, fontWeight: "800", color: p.heading },
    body: { gap: 14 },
    titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    titleCopy: { flex: 1, minWidth: 0 },
    title: { fontSize: 21, lineHeight: 27, fontWeight: "700", color: p.heading },
    location: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: p.detailDot },
    locationText: { flexShrink: 1, fontSize: 11, color: p.muted },
    price: { flexShrink: 0, fontSize: 22, fontWeight: "700", color: p.heading },
    items: { gap: 10 },
    sectionHeading: {
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0.385,
      fontWeight: "800",
      textTransform: "uppercase",
      color: p.muted,
    },
    itemCard: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 9,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radii.tile,
      backgroundColor: p.surface,
    },
    itemCopy: { flex: 1, minWidth: 0, gap: 3 },
    itemName: { fontSize: 12, fontWeight: "700", color: p.heading },
    itemMeta: { fontSize: 9, color: p.muted },
    itemPrice: { fontSize: 13, fontWeight: "700", color: p.heading },
    goalFit: {
      padding: 15,
      borderWidth: 1,
      borderColor: p.goalFitBorder,
      borderRadius: radii.card,
      backgroundColor: p.goalFitBg,
    },
    // h2 is 9px above the first line; later lines are 7px apart (margins in the web CSS).
    goalFitHeading: {
      marginBottom: 9,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      color: p.goalFitHeading,
    },
    goalFitText: { marginTop: 7, fontSize: 12, lineHeight: 17, color: p.goalFitText },
    firstParagraph: { marginTop: 0 },
    actions: { flexDirection: "row", gap: 10 },
    actionCell: { flex: 1 },
  });
