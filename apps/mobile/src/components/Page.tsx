import type { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing, useStyles, type Palette } from "../theme";
import { BrandHeader } from "./BrandHeader";

// A screen: safe-area-aware, page background, brand header, then the content. `tabs` pages sit
// above the bottom tab bar (which handles the bottom inset); the others pad their own bottom.
export function Page({
  children,
  tabs = false,
  scroll = true,
  contentStyle,
  header = true,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  tabs?: boolean;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  header?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <SafeAreaView style={styles.page} edges={tabs ? ["top"] : ["top", "bottom"]}>
      {header && (
        <View style={styles.top}>
          <BrandHeader />
        </View>
      )}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: p.pageBg },
    flex: { flex: 1 },
    // 6px above the 56px header on every page.
    top: { paddingTop: spacing.brandTopSpacing, backgroundColor: p.pageBg },
    content: { flexGrow: 1 },
  });
