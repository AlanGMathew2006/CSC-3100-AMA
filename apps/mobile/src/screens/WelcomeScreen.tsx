import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import { Page } from "../components/Page";
import { PrimaryButton } from "../components/FormFields";
import { Text } from "../components/Text";
import { radii, useStyles, type Palette } from "../theme";

// WelcomePage on the web: the campus illustration, the headline, Get started and Sign in.
export function WelcomeScreen({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted: () => void;
  onSignIn: () => void;
}) {
  const styles = useStyles(makeStyles);
  // The picture fills the width inside the 24px side padding, keeping its 1152x928 shape.
  const { width } = useWindowDimensions();
  const imageWidth = width - 48;
  return (
    <Page contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image
          source={require("../../assets/images/campus-illustration.jpg")}
          style={[styles.image, { width: imageWidth, height: (imageWidth * 928) / 1152 }]}
          accessibilityLabel="Illustration of a campus with winding paths, dining spots, and gardens"
        />
      </View>
      <View style={styles.body}>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            Eat smarter with your Dining Dollars.
          </Text>
          <Text style={styles.subtitle}>Find campus meals that fit your budget and nutrition goals.</Text>
        </View>
        <View style={styles.actions}>
          <PrimaryButton
            label="Get started"
            onPress={onGetStarted}
            textColor="#ffffff"
            radius={radii.welcomeButton}
          />
          <Text style={styles.prompt}>
            Already have an account?{" "}
            <Text
              accessibilityRole="link"
              accessibilityLabel="Sign in"
              style={styles.signIn}
              onPress={onSignIn}>
              Sign in
            </Text>
          </Text>
        </View>
      </View>
    </Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    content: { paddingBottom: 20 },
    hero: { paddingTop: 24, paddingHorizontal: 24 },
    image: { borderRadius: radii.welcomeImage },
    body: { gap: 32, padding: 28 },
    copy: { gap: 12 },
    title: { fontSize: 32, lineHeight: 40, fontWeight: "800", color: p.heading },
    subtitle: { fontSize: 16, lineHeight: 24, color: p.muted },
    actions: { alignItems: "center", gap: 16 },
    prompt: {
      paddingVertical: 8,
      fontSize: 14,
      lineHeight: 17,
      fontWeight: "600",
      textAlign: "center",
      color: "#5c625f",
    },
    signIn: { fontWeight: "700", color: p.gold },
  });
