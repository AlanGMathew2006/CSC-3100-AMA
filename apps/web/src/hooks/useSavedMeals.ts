import { useCallback, useEffect, useState } from "react";
import { fetchSavedMeals, saveMeal, unsaveMeal } from "../lib/api";
import { errorMessage } from "../lib/errors";
import type { SavedMeal } from "../types/dashboard";

export function useSavedMeals() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMeals(await fetchSavedMeals());
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(async (mealId: string) => {
    const wasSaved = meals.some((entry) => entry.meal?.id === mealId);
    try {
      if (wasSaved) {
        await unsaveMeal(mealId);
        setMeals((current) =>
          current.filter((entry) => entry.meal?.id !== mealId),
        );
      } else {
        await saveMeal(mealId);
        setMeals(await fetchSavedMeals());
      }
      setError("");
      return !wasSaved;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    }
  }, [meals, reload]);

  return {
    meals,
    loading,
    error,
    reload,
    toggle,
    isSaved: (mealId: string) =>
      meals.some((entry) => entry.meal?.id === mealId),
  };
}
