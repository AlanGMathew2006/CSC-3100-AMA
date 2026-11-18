import { StyleSheet, View } from "react-native";
import { Page } from "../components/Page";
import { PageTitle, tabContent } from "../components/PageTitle";
import { Text } from "../components/Text";
import { radii, useStyles, type Palette } from "../theme";

// Explore and Saved are built in the next phase of the iOS app; for now the tab shows the web's
// page title and an empty-state card (.empty-card).
export function ComingSoonScreen({ title, message }: { title: string; message: string }) {
  const styles = useStyles(makeStyles);
  return (
    <Page tabs contentStyle={tabContent}>
      <PageTitle>{title}</PageTitle>
      <View style={styles.card}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Page>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    card: {
      padding: 18,
      borderWidth: 1,
      borderColor: p.emptyBorder,
      borderRadius: radii.panel,
      backgroundColor: p.surface,
    },
    text: { fontSize: 13, lineHeight: 19.5, color: p.muted },
  });
