import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NAV_CONTENT_HEIGHT,
  NAV_MIN_PADDING_BOTTOM,
  NAV_PADDING_TOP,
  useStyles,
  useTheme,
  type Palette,
} from "../theme";
import { Icon } from "./Icon";
import type { IconName } from "./iconPaths";
import { Text } from "./Text";

export type AppTab = "Home" | "Explore" | "Saved" | "Profile";

const TABS: { name: AppTab; icon: IconName }[] = [
  { name: "Home", icon: "navHome" },
  { name: "Explore", icon: "navExplore" },
  { name: "Saved", icon: "navSaved" },
  { name: "Profile", icon: "navProfile" },
];

// Height of the bar for a given bottom safe-area inset (82 points on phones without a home bar).
export const tabBarHeight = (bottomInset: number) =>
  NAV_PADDING_TOP + NAV_CONTENT_HEIGHT + Math.max(bottomInset, NAV_MIN_PADDING_BOTTOM);

// The green bottom bar with Home, Explore, Saved and Profile: .bottom-nav in the web CSS.
export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, NAV_MIN_PADDING_BOTTOM) }]}
      accessibilityRole="tablist">
      {TABS.map((tab) => {
        const route = state.routes.find((candidate) => candidate.name === tab.name);
        const active = activeName === tab.name;
        const color = active ? palette.navActive : palette.navText;
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.name}
            accessibilityState={{ selected: active }}
            style={styles.item}
            onPress={() => {
              if (!route) return;
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              // Tapping the current tab is handled by its stack, which goes back to the first screen.
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}>
            {active && <View style={styles.indicator} />}
            <Icon name={tab.icon} color={color} size={21} />
            <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {tab.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: "row",
      minHeight: NAV_PADDING_TOP + NAV_CONTENT_HEIGHT,
      paddingTop: NAV_PADDING_TOP,
      paddingHorizontal: 10,
      backgroundColor: p.navBg,
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      paddingVertical: 5,
      paddingHorizontal: 4,
    },
    label: { fontSize: 10, fontWeight: "500" },
    // The 34x3 gold bar at the top edge of the active item.
    indicator: {
      position: "absolute",
      top: -NAV_PADDING_TOP,
      alignSelf: "center",
      width: 34,
      height: 3,
      borderRadius: 999,
      backgroundColor: p.navActive,
    },
  });
