import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useStyles, useTheme, type Palette } from "../theme";
import { Text } from "./Text";

const SIZE = 104; // .nutrition-chart is 104x104
const STROKE = 6;

// The calorie ring: a gray disc (the web's #f0f1f2 chart face) with an arc around its edge for
// how much of the calorie goal has been eaten, and the number, caption and detail in the middle.
// The web draws the same disc and text but its arc is hidden behind the disc, so there the ring
// never shows progress; here it does.
export function NutritionRing({
  value,
  label,
  detail,
  percent,
}: {
  value: string;
  label: string;
  detail: string;
  // 0-100
  percent: number;
}) {
  const styles = useStyles(makeStyles);
  const { palette } = useTheme();
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(percent, 100)) / 100) * circumference;

  return (
    <View
      style={styles.chart}
      accessible
      accessibilityLabel={`Nutrition summary. ${value} ${label}. ${detail}`}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill={palette.track} />
        {filled > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke={palette.ringArc}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <Text style={styles.value} maxFontSizeMultiplier={1.15} adjustsFontSizeToFit numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} maxFontSizeMultiplier={1.15} numberOfLines={2}>
          {label}
        </Text>
        <Text style={styles.detail} maxFontSizeMultiplier={1.15} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (p: Palette) =>
  StyleSheet.create({
    chart: { width: SIZE, height: SIZE },
    center: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    value: { fontSize: 21, lineHeight: 21, fontWeight: "700", color: p.mode === "dark" ? p.text : p.heading },
    label: { marginTop: 3, fontSize: 8, textAlign: "center", color: p.muted },
    detail: { marginTop: 2, fontSize: 7, textAlign: "center", color: p.muted },
  });
