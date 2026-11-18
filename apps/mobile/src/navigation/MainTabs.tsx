import type { Profile, Recommendation } from "@csc-3100-ama/shared";
import { DefaultTheme, NavigationContainer, type NavigatorScreenParams } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import { BottomTabBar, type AppTab } from "../components/BottomTabBar";
import { ToastProvider } from "../components/Toast";
import { ComingSoonScreen } from "../screens/ComingSoonScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecommendationDetailScreen } from "../screens/RecommendationDetailScreen";
import { useTheme } from "../theme";

export type HomeStackParams = {
  Dashboard: undefined;
  RecommendationDetail: { rec: Recommendation };
};

type TabParams = {
  Home: NavigatorScreenParams<HomeStackParams> | undefined;
  Explore: undefined;
  Saved: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<HomeStackParams>();

// Bumps when the screen comes into view again (after the first time), so it reloads like the web
// page does each time it opens.
function useRefreshOnFocus(navigation: { addListener: (type: "focus", callback: () => void) => () => void }) {
  const [key, setKey] = useState(0);
  const first = useRef(true);
  useEffect(
    () =>
      navigation.addListener("focus", () => {
        if (first.current) {
          first.current = false;
          return;
        }
        setKey((current) => current + 1);
      }),
    [navigation],
  );
  return key;
}

function DashboardRoute({ navigation }: NativeStackScreenProps<HomeStackParams, "Dashboard">) {
  const refreshKey = useRefreshOnFocus(navigation);
  return (
    <DashboardScreen
      refreshKey={refreshKey}
      onOpenRecommendation={(rec) => navigation.navigate("RecommendationDetail", { rec })}
      onNavigate={(tab: AppTab) => navigation.getParent()?.navigate(tab)}
    />
  );
}

function RecommendationRoute({
  navigation,
  route,
}: NativeStackScreenProps<HomeStackParams, "RecommendationDetail">) {
  return <RecommendationDetailScreen rec={route.params.rec} onBack={() => navigation.goBack()} />;
}

function HomeStack() {
  const { palette } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.pageBg } }}>
      <Stack.Screen name="Dashboard" component={DashboardRoute} />
      <Stack.Screen name="RecommendationDetail" component={RecommendationRoute} />
    </Stack.Navigator>
  );
}

// The four tabs (Home, Explore, Saved, Profile) with the Home stack inside the first one.
export function MainTabs({
  profile,
  onProfileChanged,
}: {
  profile: Profile;
  onProfileChanged: () => void;
}) {
  const { palette } = useTheme();
  const theme = useMemo(
    () => ({ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: palette.pageBg } }),
    [palette.pageBg],
  );
  return (
    <ToastProvider>
      <NavigationContainer theme={theme}>
        <Tab.Navigator
          tabBar={(props) => <BottomTabBar {...props} />}
          screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: palette.pageBg } }}>
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Explore">
            {() => (
              <ComingSoonScreen
                title="Explore Meals"
                message="Explore is coming in the next phase of the app. For now, browse the menu on the web."
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Saved">
            {() => (
              <ComingSoonScreen
                title="Saved Plans"
                message="Saved plans are coming in the next phase of the app. For now, see them on the web."
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Profile">
            {() => <ProfileScreen profile={profile} onProfileChanged={onProfileChanged} />}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}
