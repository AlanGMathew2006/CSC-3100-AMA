import { useCallback, useEffect, useState } from "react";
import type { MealTargetsResponse, RecommendationsResponse } from "@csc-3100-ama/shared";
import { fetchMealTargets, fetchRecommendations, type RecommendationParams } from "../lib/api";
import { errorMessage } from "../lib/errors";

function useRequest<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await load());
      setError("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload };
}

// Optimizer results from GET /api/recommendations (top locations for the next meal).
export function useRecommendations({ limit, locationId, mealsRemaining }: RecommendationParams = {}) {
  const load = useCallback(
    () => fetchRecommendations({ limit, locationId, mealsRemaining }),
    [limit, locationId, mealsRemaining],
  );
  return useRequest<RecommendationsResponse>(load);
}

// Per-meal targets only (for scoring single items without running the optimizer).
export function useMealTargets() {
  return useRequest<MealTargetsResponse>(fetchMealTargets);
}
