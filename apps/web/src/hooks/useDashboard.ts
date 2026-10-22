import { useCallback, useEffect, useState } from "react";
import { fetchDashboard, logMeal } from "../lib/api";
import { errorMessage } from "../lib/errors";
import type { DashboardData, MealLogInput } from "../types/dashboard";

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [logging, setLogging] = useState(false);

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
    setLogging(true);
    try {
      await logMeal(meal);
      await reload();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setLogging(false);
    }
  }

  return { data, error, logging, reload, addMeal };
}
