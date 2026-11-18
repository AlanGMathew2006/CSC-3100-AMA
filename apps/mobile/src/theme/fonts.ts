// Each weight is imported from its own folder: the package root also pulls in a hook that
// imports expo-font, which isn't resolvable from the workspace root in Jest.
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_700Bold } from "@expo-google-fonts/dm-sans/700Bold";
import { DMSans_800ExtraBold } from "@expo-google-fonts/dm-sans/800ExtraBold";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";

// The web app loads DM Sans 400/500/700/800 and Inter 600 from Google Fonts (apps/web/src/App.css).
// These are the same families, bundled with the app so there is no network fetch at launch.
export const fontAssets = {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  Inter_600SemiBold,
};

export type FontWeight = "400" | "500" | "600" | "700" | "800";

// Custom fonts need one family name per weight. The web only loads 400/500/700/800 of DM Sans, so
// a CSS weight of 600 renders as the 700 face there; this maps it the same way.
const DM_SANS: Record<FontWeight, string> = {
  "400": "DMSans_400Regular",
  "500": "DMSans_500Medium",
  "600": "DMSans_700Bold",
  "700": "DMSans_700Bold",
  "800": "DMSans_800ExtraBold",
};

export const BRAND_FONT = "Inter_600SemiBold";

export function dmSans(weight: string | number | undefined): string {
  const key = String(weight ?? "400") as FontWeight;
  return DM_SANS[key] ?? DM_SANS["400"];
}
