import { useCallback, useEffect, useState } from "react";
import { fetchDashboard } from "../lib/api";
import { errorMessage } from "../lib/errors";
import type { DashboardData, MealLogInput } from "../types/dashboard";
import { useLogMeal } from "./useLogMeal";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const log = useLogMeal();

  const reload = useCallback(async () => {
    try {
      setData(await fetchDashboard());
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function addMeal(meal: MealLogInput): Promise<boolean> {
    if (!(await log.addMeal(meal))) return false;
    await reload();
    return true;
  }

  return { data, error: error || log.error, logging: log.logging, reload, addMeal };
}
