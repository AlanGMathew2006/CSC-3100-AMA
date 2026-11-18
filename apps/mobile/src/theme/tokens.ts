import type { ViewStyle } from "react-native";

// Colors, spacing, radii and shadows copied from apps/web/src/App.css (final values after the
// cascade). The web's dark theme is a set of overrides under html[data-theme="dark"]; `dark`
// below is the same overrides as one palette.

export interface Palette {
  mode: "light" | "dark";
  // Page and surfaces
  pageBg: string; // .page-shell background
  surface: string; // cards, inputs, chips
  raised: string; // profile pill, goal-fit card (dark only; light uses the same colors as the web)
  // Text
  text: string; // body text (#24302b)
  heading: string; // headings and titles (#154734)
  muted: string; // secondary text (#68736d)
  fieldHelper: string; // plain .field-helper text, inherited from the page color
  // Brand
  green: string; // #154734: primary buttons, nav bar, Dining Dollars card
  gold: string; // #c5b783
  onGreen: string; // text on green buttons
  // Borders
  border: string; // cards (#c5b783)
  inputBorder: string; // auth inputs (#ded8c7)
  emptyBorder: string; // empty-state card (#d9d2bf)
  // States
  error: string;
  errorBg: string;
  mint: string; // #b3e3d5: goal-fit card, tags
  mintText: string;
  // Chips, toggles and selected states
  chipBorder: string;
  chipBg: string;
  chipText: string;
  selectedBg: string;
  selectedBorder: string;
  selectedText: string;
  // Header and nav
  brandText: string; // the "Poly" half of the logo
  brandAccent: string;
  navBg: string;
  navText: string;
  navActive: string;
  // Profile pill on the dashboard
  pillBg: string;
  pillBorder: string;
  greeting: string;
  bellBorder: string;
  bellBg: string;
  bellIcon: string;
  // Nutrition card
  track: string; // ring disc and bar tracks
  legend: { protein: string; carbs: string; fat: string; fiber: string };
  summaryTrack: string;
  weeklyTrackBorder: string;
  weeklyTrackBg: string;
  weeklyFill: string;
  weeklyFillHighlight: string;
  weeklyDivider: string;
  // Dining Dollars card
  dollarsBg: string;
  dollarsBorder: string;
  dollarsValue: string;
  dollarsAccent: string; // eyebrow and "remaining"
  dollarsMeta: string;
  dollarsTrack: string;
  dollarsBar: string;
  dollarsBold: string;
  dollarsTagBg: string;
  dollarsTagText: string;
  // Meal card pieces
  cardShadow: boolean;
  iconMuted: string; // meta icons on meal cards
  link: string; // "View Meal", empty-state link
  emptyLink: string;
  logout: string;
  actionBg: string;
  actionBorder: string;
  actionText: string;
  // Macro Match status colors
  matchOn: string;
  matchOver: string;
  // Goal-fit card
  goalFitBg: string;
  goalFitBorder: string;
  goalFitHeading: string;
  goalFitText: string;
  goalFitCheck: string;
  detailDot: string;
  placeholderFrom: string;
  placeholderTo: string;
  toastBg: string;
  toastText: string;
  inputText: string;
  // Back button icon circle
  backCircle: string;
  backIcon: string;
}

export const light: Palette = {
  mode: "light",
  pageBg: "#faf9f5",
  surface: "#ffffff",
  raised: "#ffffff",
  text: "#24302b",
  heading: "#154734",
  muted: "#68736d",
  fieldHelper: "#154734",
  green: "#154734",
  gold: "#c5b783",
  onGreen: "#f5f3ed",
  border: "#c5b783",
  inputBorder: "#ded8c7",
  emptyBorder: "#d9d2bf",
  error: "#b5473d",
  errorBg: "#fff5f3",
  mint: "#b3e3d5",
  mintText: "#154734",
  chipBorder: "#c5b783",
  chipBg: "#ffffff",
  chipText: "#68736d",
  selectedBg: "#154734",
  selectedBorder: "#154734",
  selectedText: "#ffffff",
  brandText: "#154734",
  brandAccent: "#c5b783",
  navBg: "#154734",
  navText: "#ffffff",
  navActive: "#c5b783",
  pillBg: "#154734",
  pillBorder: "transparent",
  greeting: "#c5b783",
  bellBorder: "#c5b783",
  bellBg: "#ffffff",
  bellIcon: "#154734",
  track: "#f0f1f2",
  legend: { protein: "#3b82f6", carbs: "#f59e0b", fat: "#8b5cf6", fiber: "#14b8a6" },
  summaryTrack: "#e7e8e9",
  weeklyTrackBorder: "#e3e6e8",
  weeklyTrackBg: "#ffffff",
  weeklyFill: "#154734",
  weeklyFillHighlight: "#f59e0b",
  weeklyDivider: "#d8c991",
  dollarsBg: "#154734",
  dollarsBorder: "#c5b783",
  dollarsValue: "#ffffff",
  dollarsAccent: "#c5b783",
  dollarsMeta: "#f5f3ed",
  dollarsTrack: "#b3e3d5",
  dollarsBar: "#c5b783",
  dollarsBold: "#b3e3d5",
  dollarsTagBg: "#b3e3d5",
  dollarsTagText: "#154734",
  cardShadow: true,
  iconMuted: "#68736d",
  link: "#154734",
  emptyLink: "#154734",
  logout: "#e89a28",
  actionBg: "#154734",
  actionBorder: "#154734",
  actionText: "#ffffff",
  matchOn: "#154734",
  matchOver: "#8a1c1c",
  goalFitBg: "#b3e3d5",
  goalFitBorder: "transparent",
  goalFitHeading: "#154734",
  goalFitText: "#24302b",
  goalFitCheck: "#154734",
  detailDot: "#3c9c5c",
  placeholderFrom: "#d9d2bf",
  placeholderTo: "#b3e3d5",
  toastBg: "#154734",
  toastText: "#ffffff",
  inputText: "#154734",
  backCircle: "#ffffff",
  backIcon: "#154734",
};

export const dark: Palette = {
  mode: "dark",
  pageBg: "#0d1512",
  surface: "#18241f",
  raised: "#1f3029",
  text: "#f3f6f4",
  heading: "#f3f6f4",
  muted: "#aab8b1",
  fieldHelper: "#f3f6f4",
  green: "#154734",
  gold: "#e5b73b",
  onGreen: "#f3f6f4",
  border: "#304139",
  inputBorder: "#304139",
  emptyBorder: "#304139",
  error: "#b5473d",
  errorBg: "#fff5f3",
  mint: "#1f3029",
  mintText: "#55c995",
  chipBorder: "#304139",
  chipBg: "#18241f",
  chipText: "#aab8b1",
  selectedBg: "#2e7d62",
  selectedBorder: "#2e7d62",
  selectedText: "#f3f6f4",
  brandText: "#154734",
  brandAccent: "#c5b783",
  navBg: "#154734",
  navText: "#f3f6f4",
  navActive: "#e5b73b",
  pillBg: "#1f3029",
  pillBorder: "#304139",
  greeting: "#e5b73b",
  bellBorder: "#304139",
  bellBg: "#1f3029",
  bellIcon: "#ffffff",
  track: "#24322c",
  legend: { protein: "#60a5fa", carbs: "#fbbf24", fat: "#a78bfa", fiber: "#2dd4bf" },
  summaryTrack: "#24322c",
  weeklyTrackBorder: "#304139",
  weeklyTrackBg: "#24322c",
  weeklyFill: "#2e7d62",
  weeklyFillHighlight: "#e5b73b",
  weeklyDivider: "#304139",
  dollarsBg: "#1f3029",
  dollarsBorder: "#304139",
  dollarsValue: "#f3f6f4",
  dollarsAccent: "#e5b73b",
  dollarsMeta: "#aab8b1",
  dollarsTrack: "#24322c",
  dollarsBar: "#2e7d62",
  dollarsBold: "#55c995",
  dollarsTagBg: "#24322c",
  dollarsTagText: "#55c995",
  cardShadow: false,
  iconMuted: "#b8b8b8",
  link: "#e5b73b",
  emptyLink: "#55c995",
  logout: "#e5b73b",
  actionBg: "#2e7d62",
  actionBorder: "#2e7d62",
  actionText: "#f3f6f4",
  matchOn: "#55c995",
  matchOver: "#f0a9a9",
  goalFitBg: "#1f3029",
  goalFitBorder: "#304139",
  goalFitHeading: "#e5b73b",
  goalFitText: "#aab8b1",
  goalFitCheck: "#55c995",
  detailDot: "#55c995",
  placeholderFrom: "#1f3029",
  placeholderTo: "#24322c",
  toastBg: "#2e7d62",
  toastText: "#f3f6f4",
  inputText: "#f3f6f4",
  backCircle: "#ffffff",
  backIcon: "#b8b8b8",
};

// Radii, in points, from the CSS border-radius values.
export const radii = {
  pill: 999,
  card: 16, // meal-card, nutrition-card, dollars-card, goal-fit, profile summary
  cardLarge: 18, // detail hero
  input: 12,
  field: 11,
  small: 8,
  chip: 18,
  panel: 14, // empty-card
  tile: 13, // detail cards, setting cards
  summary: 12,
  welcomeImage: 24,
  welcomeButton: 27,
} as const;

export const spacing = {
  gutter: 20, // .app-content horizontal padding
  authGutter: 28, // .auth-content horizontal padding
  sectionGap: 14,
  dashboardGap: 12,
  brandHeaderHeight: 56,
  brandTopSpacing: 6,
} as const;

// box-shadow: 0 4px 8px rgba(36, 48, 43, 0.04), as iOS shadow props.
export const cardShadow: ViewStyle = {
  shadowColor: "#243028",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
};

// Toast: 0 4px 8px rgba(36, 48, 43, .16)
export const toastShadow: ViewStyle = {
  shadowColor: "#243028",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.16,
  shadowRadius: 8,
  elevation: 4,
};

// Back button circle: 0 4px 10px rgba(36, 48, 43, .08)
export const backShadow: ViewStyle = {
  shadowColor: "#243028",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 10,
};

// Bottom nav: fixed 82px tall with 8px above and 14px below the items.
export const NAV_CONTENT_HEIGHT = 60;
export const NAV_PADDING_TOP = 8;
export const NAV_MIN_PADDING_BOTTOM = 14;
