import { useState } from "react";
import { logMeal } from "../lib/api";
import { submitMealLog } from "../lib/mealLog";
import type { MealLogInput } from "../types/dashboard";

// Logs one meal to today. The dashboard reloads its data whenever it opens, so a log added
// from Explore shows up there next time. `onError` also gets the message (e.g. for a toast, where
// the page's error text may be scrolled out of view).
export function useLogMeal({ onError }: { onError?: (message: string) => void } = {}) {
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");

  async function addMeal(meal: MealLogInput): Promise<boolean> {
    setLogging(true);
    const failure = await submitMealLog(meal, logMeal);
    setError(failure ?? "");
    setLogging(false);
    if (failure) onError?.(failure);
    return failure === null;
  }

  return { logging, error, addMeal };
}
