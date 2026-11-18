import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { radii, useStyles, useTheme, type Palette } from "../theme";
import { Icon } from "./Icon";
import { Text, TextInput } from "./Text";

// Text field: label above, rounded input shell (FormFields.tsx and .input-shell in the web app).
// `compact` is the smaller onboarding variant (.onboarding-form .input-shell).
export function Field({
  label,
  value,
  onChangeText,
  password = false,
  invalid = false,
  helper,
  prefix,
  compact = false,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  password?: boolean;
  invalid?: boolean;
  helper?: string;
  prefix?: string;
  compact?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText" | "secureTextEntry">) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.group, compact && styles.groupCompact]}>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      <View
        style={[
          styles.shell,
          compact && styles.shellCompact,
          focused && styles.shellFocused,
          invalid && styles.shellInvalid,
        ]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={helper}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={password && !visible}
          autoCorrect={false}
          autoCapitalize={password || inputProps.keyboardType === "email-address" ? "none" : undefined}
          style={[styles.input, compact && styles.inputCompact]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            accessibilityState={{ selected: visible }}
            hitSlop={10}
            style={styles.eye}
            onPress={() => setVisible((current) => !current)}>
            <Icon name="eye" color={palette.muted} size={20} />
          </Pressable>
        )}
      </View>
      {helper ? <Text style={[styles.helper, styles.mutedText]}>{helper}</Text> : null}
    </View>
  );
}

// Error text with the alert icon, or a plain notice (FormMessage).
export function FormMessage({ error, notice }: { error?: string; notice?: string }) {
  const styles = useStyles(makeStyles);
  if (error) {
    return (
      <View style={styles.message} accessibilityRole="alert">
        <Icon name="alert" color="#b5473d" size={14} />
        <Text style={[styles.helper, styles.errorText, styles.flex]}>{error}</Text>
      </View>
    );
  }
  if (notice) {
    return (
      <Text style={styles.helper} accessibilityRole="text" accessibilityLiveRegion="polite">
        {notice}
      </Text>
    );
  }
  return null;
}

// .field-helper: 12px text. "plain" inherits the page text color, "muted" is .field-helper.success,
// "error" is .field-helper.error.
export function Helper({
  children,
  tone = "plain",
  style,
}: {
  children: ReactNode;
  tone?: "plain" | "muted" | "error" | "card";
  style?: StyleProp<TextStyle>;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Text
      accessibilityRole={tone === "error" ? "alert" : undefined}
      style={[
        styles.helper,
        tone === "muted" && styles.mutedText,
        tone === "error" && styles.errorText,
        tone === "card" && styles.cardText,
        style,
      ]}>
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  minHeight = 54,
  fontSize = 16,
  textColor,
  radius,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  minHeight?: number;
  fontSize?: number;
  textColor?: string;
  radius?: number;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        styles.primary,
        { minHeight },
        radius != null && { borderRadius: radius },
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.buttonText, styles.primaryText, { fontSize }, textColor ? { color: textColor } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled,
  minHeight = 54,
  fontSize = 16,
  borderColor,
  filled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  minHeight?: number;
  fontSize?: number;
  borderColor?: string;
  // The detail-page "Back" button is white with a gold border.
  filled?: boolean;
}) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        styles.secondary,
        { minHeight },
        filled && { backgroundColor: palette.surface, borderColor: borderColor ?? palette.border },
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.buttonText, styles.secondaryText, { fontSize }]}>{label}</Text>
    </Pressable>
  );
}

// Gold text link (.link-button).
export function LinkButton({
  label,
  onPress,
  align,
  fontSize = 14,
  color,
  underline = false,
}: {
  label: string;
  onPress: () => void;
  align?: "right";
  fontSize?: number;
  color?: string;
  underline?: boolean;
}) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={align === "right" ? styles.linkRight : undefined}>
      <Text
        style={[
          styles.link,
          { fontSize },
          color ? { color } : null,
          underline && { textDecorationLine: "underline" },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

// A gold link inside a sentence (the "Create an account" in "New to PolyProvision? ...").
export function LinkText({ label, onPress }: { label: string; onPress?: () => void }) {
  const styles = useStyles(makeStyles);
  return (
    <Text
      accessibilityRole={onPress ? "link" : undefined}
      accessibilityLabel={label}
      style={[styles.link, { fontSize: 14 }]}
      onPress={onPress}>
      {label}
    </Text>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    flex: { flex: 1 },
    group: { gap: 8 },
    groupCompact: { gap: 6 },
    label: { fontSize: 13, fontWeight: "700", color: p.text },
    labelCompact: { fontSize: 12 },
    shell: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      borderRadius: radii.input,
      borderWidth: 1,
      borderColor: p.inputBorder,
      backgroundColor: p.surface,
    },
    shellCompact: { minHeight: 44, borderColor: p.border },
    shellFocused: { borderWidth: 2, borderColor: p.gold },
    shellInvalid: { borderWidth: 2, borderColor: p.error, backgroundColor: p.errorBg },
    prefix: { fontSize: 15, color: p.muted },
    input: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 15, color: p.text },
    inputCompact: { minHeight: 40 },
    eye: { marginLeft: 10, flexShrink: 0 },
    helper: { fontSize: 12, lineHeight: 17, color: p.fieldHelper },
    mutedText: { color: p.muted },
    errorText: { color: p.error },
    cardText: { color: p.goalFitText, marginTop: 7 },
    message: { flexDirection: "row", alignItems: "center", gap: 6 },
    button: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 12,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: p.green,
      paddingHorizontal: 18,
    },
    primary: { backgroundColor: p.green },
    secondary: {
      backgroundColor: p.mode === "dark" ? p.surface : "transparent",
      borderColor: p.mode === "dark" ? p.border : p.green,
    },
    buttonText: { fontWeight: "700", textAlign: "center" },
    primaryText: { color: p.onGreen },
    secondaryText: { color: p.mode === "dark" ? p.muted : p.green },
    disabled: { opacity: 0.6 },
    link: { fontWeight: "700", color: "#c5b783" },
    linkRight: { alignSelf: "flex-end" },
  });
