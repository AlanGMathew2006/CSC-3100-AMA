import Svg, { Path } from "react-native-svg";
import { ICON_PATHS, type IconName } from "./iconPaths";

// One of the web app's Figma icons, drawn at `size` points (default: the size it has on the web)
// in the given stroke color.
export function Icon({ name, color, size }: { name: IconName; color: string; size?: number }) {
  const icon = ICON_PATHS[name];
  const px = size ?? icon.size;
  return (
    <Svg
      width={px}
      height={px}
      viewBox={`0 0 ${icon.size} ${icon.size}`}
      fill="none"
      style={{ overflow: "visible" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Path d={icon.d} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
