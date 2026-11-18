import { StyleSheet, View } from "react-native";
import { BRAND_FONT, spacing, useStyles, type Palette } from "../theme";
import { Text } from "./Text";

// The "PolyProvision" logo header: Poly in green, Provision in Vegas Gold, with a short gold
// underline. Matches .brand-header and .brand-wordmark in apps/web/src/App.css.
export function BrandHeader({ underline = true }: { underline?: boolean }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.header} accessibilityRole="header" accessibilityLabel="PolyProvision">
      <View style={styles.wordmark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.name} maxFontSizeMultiplier={1.2}>
          <Text style={styles.poly}>Poly</Text>
          <Text style={styles.accent}>Provision</Text>
        </Text>
        {underline && <View style={styles.underline} />}
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    header: {
      height: spacing.brandHeaderHeight,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: p.pageBg,
    },
    wordmark: { alignItems: "center" },
    name: { fontFamily: BRAND_FONT, fontSize: 20, lineHeight: 24, letterSpacing: 0.35 },
    poly: { fontFamily: BRAND_FONT, color: p.brandText },
    accent: { fontFamily: BRAND_FONT, color: p.brandAccent },
    underline: {
      width: 28,
      height: 2,
      marginTop: 2,
      borderRadius: 999,
      backgroundColor: p.brandAccent,
    },
  });
