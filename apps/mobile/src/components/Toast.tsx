import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { toastShadow, useStyles, type Palette } from "../theme";
import { tabBarHeight } from "./BottomTabBar";
import { Icon } from "./Icon";
import { Text } from "./Text";

const TOAST_MS = 2600; // the web app hides a toast after 2.6 seconds

const ToastContext = createContext<(message: string) => void>(() => {});

// Shows one message at a time above the tab bar, like the web Toast.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    AccessibilityInfo.announceForAccessibility(next);
    timer.current = setTimeout(() => setMessage(""), TOAST_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastView message={message} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastView({ message }: { message: string }) {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      // 14px above the tab bar: bottom 96 on an 82px bar.
      style={[styles.toast, { bottom: tabBarHeight(insets.bottom) + 14 }]}>
      <Icon name="check" color="#ffffff" size={18} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    toast: {
      position: "absolute",
      left: 16,
      right: 16,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: p.toastBg,
      ...toastShadow,
    },
    text: { flexShrink: 1, fontSize: 13, fontWeight: "700", color: p.toastText },
  });
