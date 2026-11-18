import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { dmSans } from "../theme";

// Dynamic Type still scales text, but only up to 1.4x by default so cards and the tab bar keep
// their layout. Screens pass a smaller cap for the tightest spots.
export const DEFAULT_MAX_FONT_SCALE = 1.4;

function withFamily(style: TextProps["style"]) {
  const flat = StyleSheet.flatten(style) ?? {};
  const { fontWeight, fontFamily, ...rest } = flat;
  return [rest, { fontFamily: fontFamily ?? dmSans(fontWeight) }];
}

// Text that works like CSS: a style with fontWeight "700" picks the matching DM Sans file
// (custom fonts have one family name per weight in React Native).
export function Text({ style, maxFontSizeMultiplier, ...props }: TextProps) {
  return (
    <RNText
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? DEFAULT_MAX_FONT_SCALE}
      style={withFamily(style)}
    />
  );
}

export function TextInput({ style, maxFontSizeMultiplier, ...props }: TextInputProps) {
  return (
    <RNTextInput
      {...props}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? DEFAULT_MAX_FONT_SCALE}
      style={withFamily(style)}
    />
  );
}
