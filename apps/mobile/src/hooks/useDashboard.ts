import type { MealLogInput } from "@csc-3100-ama/shared";
import { api } from "../lib/api";
import { useLoad } from "./useAsync";
import { useLogMeal } from "./useLogMeal";

// GET /api/dashboard plus adding a meal to today (then the totals reload), like the web hook.
// `refreshKey` reloads it when the screen comes back into view.
export function useDashboard(refreshKey = 0) {
  const dashboard = useLoad(api.fetchDashboard, true, refreshKey);
  const log = useLogMeal();

  async function addMeal(meal: MealLogInput): Promise<boolean> {
    if (!(await log.addMeal(meal))) return false;
    await dashboard.reload();
    return true;
  }

  return {
    data: dashboard.data,
    error: dashboard.error || log.error,
    logging: log.logging,
    reload: dashboard.reload,
    addMeal,
  };
}
