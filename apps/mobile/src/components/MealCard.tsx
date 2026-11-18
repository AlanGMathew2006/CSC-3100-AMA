import {
  OPEN_LABELS,
  formatAmount,
  listedLocation,
  macroScoreText,
  mealPrice,
  priceText,
  servingLabel,
  servingStatusText,
  type MenuItem,
  type OpenStatus,
} from "@csc-3100-ama/shared";
import { Pressable, StyleSheet, View } from "react-native";
import { radii, cardShadow, useStyles, useTheme, type Palette } from "../theme";
import { Icon } from "./Icon";
import { Text } from "./Text";

export function OpenBadge({ status }: { status: OpenStatus }) {
  const styles = useStyles(makeStyles);
  const badge =
    status === "open" ? styles.badgeOpen : status === "closed" ? styles.badgeClosed : styles.badgeUnknown;
  const label =
    status === "open" ? styles.badgeOpenText : status === "closed" ? styles.badgeClosedText : styles.badgeUnknownText;
  return (
    <View style={[styles.badge, badge]}>
      <Text style={[styles.badgeText, label]}>{OPEN_LABELS[status]}</Text>
    </View>
  );
}

// One meal as a card: where it is, its name, price, calories and protein. The dashboard passes a
// whole recommendation wrapped as one item. Same markup as the web MealCard; the bookmark and
// "+" buttons come with the Saved and Explore screens in the next phase.
export function MealCard({
  item,
  showOpenStatus = false,
  macroScore,
  onSelect,
}: {
  item: MenuItem;
  showOpenStatus?: boolean;
  // Macro Match against the next meal's targets; omit to hide, null shows "unavailable".
  macroScore?: number | null;
  onSelect: () => void;
}) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const price = mealPrice(item);
  const listed = listedLocation(item);
  const serving = showOpenStatus ? servingLabel(item) : null;
  const servingStatus = showOpenStatus
    ? servingStatusText(item.serving_windows, listed.availability ?? undefined)
    : null;
  const priceLabel = priceText(item, price);
  const calories = item.calories == null ? "cal unavailable" : `${formatAmount(item.calories)} cal`;
  const protein =
    item.protein_g == null ? "protein unavailable" : `${formatAmount(item.protein_g, "g")} protein`;

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${priceLabel}, ${calories}, ${protein}`}
        style={styles.main}
        onPress={onSelect}>
        <View style={styles.topRow}>
          <View style={styles.heading}>
            <Text style={styles.label}>{listed.label}</Text>
            {showOpenStatus && listed.open_status && <OpenBadge status={listed.open_status} />}
            {serving && (
              <Text style={styles.label}>
                {serving}
                {servingStatus && ` · ${servingStatus}`}
              </Text>
            )}
            {macroScore !== undefined && <Text style={styles.label}>{macroScoreText(macroScore)}</Text>}
            <Text style={styles.title} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <Text style={styles.price}>{priceLabel}</Text>
        </View>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Icon name="flame" color={palette.iconMuted} size={13} />
            <Text style={styles.metaText}>{calories}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="protein" color={palette.iconMuted} size={13} />
            <Text style={styles.metaText}>{protein}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    card: {
      minHeight: 82,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: radii.card,
      backgroundColor: p.surface,
      ...(p.cardShadow ? cardShadow : null),
    },
    // 12px top and 11px bottom; 38px on the right keeps clear of the bookmark space.
    main: { paddingTop: 12, paddingBottom: 11, paddingLeft: 14, paddingRight: 38 },
    topRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    heading: { flex: 1, minWidth: 0, gap: 3 },
    label: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.36,
      textTransform: "uppercase",
      color: p.muted,
    },
    title: { fontSize: 14, fontWeight: "700", color: p.heading },
    price: { fontSize: 14, fontWeight: "800", color: p.heading },
    meta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 10, color: p.muted },
    badge: {
      alignSelf: "flex-start",
      paddingVertical: 2,
      paddingHorizontal: 7,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: 999,
    },
    badgeText: { fontSize: 10, fontWeight: "600" },
    badgeOpen: { backgroundColor: p.mode === "dark" ? p.raised : "#b3e3d5" },
    badgeOpenText: { color: p.mode === "dark" ? "#55c995" : "#154734" },
    badgeClosed: { backgroundColor: p.mode === "dark" ? "#3a1f1f" : "#f3dede" },
    badgeClosedText: { color: p.mode === "dark" ? "#f0a9a9" : "#8a1c1c" },
    badgeUnknown: {
      borderColor: p.mode === "dark" ? p.border : "#c5b783",
      backgroundColor: p.mode === "dark" ? "transparent" : "#ffffff",
    },
    badgeUnknownText: { color: p.muted },
  });
