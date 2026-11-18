import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dark, light, type Palette } from "./tokens";

interface ThemeValue {
  mode: "light" | "dark";
  palette: Palette;
  setMode: (mode: "light" | "dark") => void;
}

const ThemeContext = createContext<ThemeValue>({
  mode: "light",
  palette: light,
  setMode: () => {},
});

// Light unless the signed-in user's saved theme preference says dark (same as the web app, which
// sets data-theme from the preferences it loads).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const value = useMemo<ThemeValue>(
    () => ({ mode, palette: mode === "dark" ? dark : light, setMode }),
    [mode],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

// Builds a StyleSheet from the current palette: `const styles = useStyles(makeStyles)`.
export function useStyles<T>(factory: (palette: Palette) => T): T {
  const { palette } = useTheme();
  // The factory is a module-level function, so the palette is the only thing that changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(palette), [palette]);
}
