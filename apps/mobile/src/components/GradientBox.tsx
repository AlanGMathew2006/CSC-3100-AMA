import { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";

// The soft sand-to-mint square standing in for a food photo (.alternative-placeholder).
export function GradientBox({ size, radius }: { size: number; radius: number }) {
  const { palette } = useTheme();
  // Each box needs its own gradient id on the page.
  const id = `placeholder${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius }]} accessibilityElementsHidden>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.placeholderFrom} />
            <Stop offset="1" stopColor={palette.placeholderTo} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ box: { overflow: "hidden", flexShrink: 0 } });
