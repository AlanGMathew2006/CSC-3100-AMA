import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { light } from "../theme";

// Phase 1 building blocks, used only by the temporary signed-in screen until the dashboard replaces it.
const colors = { ...light, background: light.surface, border: "#cfd8d3", muted: "#5d6865", text: "#18211d" };

// Small building blocks for the phase 1 screens. Real design work is phase 2.

export function BrandHeader() {
  return (
    <View style={styles.brand} accessibilityRole="header">
      <Text style={styles.brandText}>
        Poly<Text style={styles.brandAccent}>Provision</Text>
      </Text>
    </View>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <BrandHeader />
      <ActivityIndicator style={styles.spinner} color={colors.green} />
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  );
}

export function Field({
  label,
  invalid,
  ...inputProps
}: { label: string; invalid?: boolean } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, invalid && styles.inputInvalid]}
        placeholderTextColor={colors.muted}
        {...inputProps}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "link";
}) {
  const link = variant === "link";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[link ? styles.linkButton : styles.button, disabled && styles.disabled]}>
      <Text style={link ? styles.linkText : styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  brand: { alignItems: "center", paddingVertical: 16 },
  brandText: { fontSize: 28, fontWeight: "700", color: colors.green },
  brandAccent: { color: colors.gold },
  content: { padding: 24, gap: 16 },
  spinner: { marginTop: 48 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  error: { fontSize: 14, color: colors.error },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputInvalid: { borderColor: colors.error },
  button: {
    backgroundColor: colors.green,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  linkButton: { paddingVertical: 10, alignItems: "center" },
  linkText: { color: colors.green, fontSize: 15, fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
