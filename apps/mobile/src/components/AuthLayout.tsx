import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing, useStyles, type Palette } from "../theme";
import { Page } from "./Page";
import { Text } from "./Text";

// Heading and intro text at the top of the auth and onboarding pages (.intro-block).
export function IntroBlock({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.intro}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.copy}>{children}</Text>
    </View>
  );
}

// An auth page (.auth-content): 28px sides, a 68px lead-in below the header (42px on onboarding),
// and `gap` between its blocks.
export function AuthPage({
  children,
  gap = 26,
  top = 68,
}: {
  children: ReactNode;
  gap?: number;
  top?: number;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Page contentStyle={[styles.content, { gap, paddingTop: top }]}>{children}</Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.authGutter,
      paddingBottom: 32, // 12px of content padding plus the 20px page padding on the web
    },
    intro: { gap: 10 },
    // 30px, line-height 1.15, weight 800, letter-spacing -0.03em
    title: {
      fontSize: 30,
      lineHeight: 34.5,
      fontWeight: "800",
      letterSpacing: -0.9,
      color: p.heading,
    },
    copy: { fontSize: 15, lineHeight: 22.5, color: p.muted },
  });
