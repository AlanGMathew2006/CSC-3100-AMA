import { useEffect } from "react";
import { api } from "../lib/api";
import { useTheme } from "../theme";
import { useLoad } from "./useAsync";

// The saved preferences (GET /api/preferences). Like the web app, the saved theme is applied as
// soon as the preferences load.
export function usePreferences(refreshKey = 0) {
  const { setMode } = useTheme();
  const preferences = useLoad(api.fetchPreferences, true, refreshKey);
  const theme = preferences.data?.theme;
  useEffect(() => {
    if (theme) setMode(theme);
  }, [theme, setMode]);
  return preferences;
}
