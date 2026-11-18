import { StyleSheet } from "react-native";
import { spacing, useStyles, type Palette } from "../theme";
import { Text } from "./Text";

// The page title on the tab screens (.app-content > h1): 20px, weight 800.
export function PageTitle({ children }: { children: string }) {
  const styles = useStyles(makeStyles);
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}

// Padding and spacing of a tab screen's content (.app-content with a 14px gap); the tab bar is
// below it, so only 30px of the web's 112px bottom padding is needed.
export const tabContent = {
  paddingHorizontal: spacing.gutter,
  paddingBottom: 30,
  gap: spacing.sectionGap,
} as const;

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    title: { marginTop: 4, fontSize: 20, lineHeight: 25, fontWeight: "800", color: p.heading },
  });
