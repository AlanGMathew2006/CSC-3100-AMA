import type { RecommendationParams } from "@csc-3100-ama/shared";
import { useCallback } from "react";
import { api } from "../lib/api";
import { useLoad } from "./useAsync";

// Optimizer results from GET /api/recommendations (top locations for the next meal).
export function useRecommendations(
  { limit, locationId, mealsRemaining }: RecommendationParams = {},
  refreshKey = 0,
) {
  const load = useCallback(
    () => api.fetchRecommendations({ limit, locationId, mealsRemaining }),
    [limit, locationId, mealsRemaining],
  );
  return useLoad(load, true, refreshKey);
}
