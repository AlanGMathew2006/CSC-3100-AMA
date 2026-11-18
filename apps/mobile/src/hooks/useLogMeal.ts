import { submitMealLog, type MealLogInput } from "@csc-3100-ama/shared";
import { useState } from "react";
import { api } from "../lib/api";

// Logs one meal to today (POST /api/meal-logs); same behavior as the web useLogMeal.
export function useLogMeal() {
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");

  async function addMeal(meal: MealLogInput): Promise<boolean> {
    setLogging(true);
    const failure = await submitMealLog(meal, api.logMeal);
    setError(failure ?? "");
    setLogging(false);
    return failure === null;
  }

  return { logging, error, addMeal };
}
