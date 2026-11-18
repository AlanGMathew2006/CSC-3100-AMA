import { errorMessage } from "@csc-3100-ama/shared";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthProvider";
import { Helper } from "../components/FormFields";
import { Page } from "../components/Page";
import { PageTitle, tabContent } from "../components/PageTitle";
import { Text } from "../components/Text";
import { useStyles, type Palette } from "../theme";

// Profile tab. Preferences and goals come in the next commit; sign out is here already.
export function ProfileScreen({ onProfileChanged: _onProfileChanged }: { onProfileChanged: () => void }) {
  const styles = useStyles(makeStyles);
  const { signOut } = useAuth();
  const [logoutError, setLogoutError] = useState("");

  async function handleSignOut() {
    setLogoutError("");
    try {
      await signOut();
    } catch (err) {
      setLogoutError(errorMessage(err));
    }
  }

  return (
    <Page tabs contentStyle={tabContent}>
      <PageTitle>Preferences</PageTitle>
      {logoutError ? <Helper tone="error">{logoutError}</Helper> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Log out" style={styles.logout} onPress={() => void handleSignOut()}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    logout: { padding: 7, alignItems: "center" },
    logoutText: { fontSize: 13, fontWeight: "700", color: p.logout },
  });
