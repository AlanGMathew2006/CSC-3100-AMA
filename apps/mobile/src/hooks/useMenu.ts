import { api } from "../lib/api";
import { useLoad } from "./useAsync";

// The menu, for item details inside a recommendation (nutrition, allergens, serving times).
export function useMenu(refreshKey = 0) {
  const { data, loading, error, reload } = useLoad(api.fetchMenu, true, refreshKey);
  return { menu: data, loading, error, reload };
}
