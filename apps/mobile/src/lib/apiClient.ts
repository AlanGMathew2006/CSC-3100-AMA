import {
  dashboardQuery,
  recommendationQuery,
  type DashboardData,
  type DiningLocation,
  type MealLogInput,
  type MealTargetsResponse,
  type MenuResponse,
  type OnboardingInput,
  type Profile,
  type ProfileInput,
  type RecommendationParams,
  type RecommendationsResponse,
  type UserPreferences,
} from "@csc-3100-ama/shared";

// Same pattern as apps/web/src/lib/api.ts: Bearer token from the Supabase
// session, one refresh-and-retry on a 401, and sign out on a second 401.
// The Supabase and fetch pieces are passed in so this can be tested without either.
export interface ApiDeps {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  // Returns the new access token, or null when the session can't be refreshed.
  refreshAccessToken: () => Promise<string | null>;
  // Ends the local session only (no network call to revoke it).
  signOutLocal: () => Promise<void>;
  fetchImpl?: typeof fetch;
}

export function createApiClient(deps: ApiDeps) {
  const doFetch = deps.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let token = await deps.getAccessToken();
    if (!token) throw new Error("You are signed out. Please log in again.");

    const send = async (accessToken: string): Promise<Response> => {
      try {
        return await doFetch(`${deps.baseUrl}${path}`, {
          ...init,
          headers: {
            "Content-Type": "application/json",
            ...init.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch {
        throw new Error("Can't reach the PolyProvision server. Try again.");
      }
    };

    const expireSession = async (): Promise<never> => {
      await deps.signOutLocal();
      throw new Error("Your session expired. Please log in again.");
    };

    let response = await send(token);
    if (response.status === 401) {
      token = await deps.refreshAccessToken();
      if (!token) return expireSession();
      response = await send(token);
      if (response.status === 401) return expireSession();
    }

    if (response.status === 204) return undefined as T;
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((body as { error?: string }).error ?? "Request failed");
    }
    return body as T;
  }

  // The same endpoints and request bodies as apps/web/src/lib/api.ts.
  return {
    fetchDashboard: () => request<DashboardData>(`/api/dashboard${dashboardQuery()}`),
    fetchProfile: () => request<Profile | null>("/api/profile"),
    updateProfile: (fields: ProfileInput) =>
      request<Profile>("/api/profile", { method: "PATCH", body: JSON.stringify(fields) }),
    completeOnboarding: (input: OnboardingInput) =>
      request<void>("/api/onboarding/complete", { method: "POST", body: JSON.stringify(input) }),
    fetchMenu: () => request<MenuResponse>("/api/menu"),
    fetchRecommendations: (params: RecommendationParams = {}) =>
      request<RecommendationsResponse>(`/api/recommendations${recommendationQuery(params)}`),
    fetchMealTargets: (params: Pick<RecommendationParams, "mealsRemaining"> = {}) =>
      request<MealTargetsResponse>(`/api/meal-targets${recommendationQuery(params)}`),
    fetchPreferences: () => request<UserPreferences | null>("/api/preferences"),
    updatePreferences: (fields: Partial<UserPreferences>) =>
      request<UserPreferences>("/api/preferences", { method: "PUT", body: JSON.stringify(fields) }),
    fetchLocations: () => request<DiningLocation[]>("/api/locations"),
    logMeal: (meal: MealLogInput) =>
      request<unknown>("/api/meal-logs", { method: "POST", body: JSON.stringify(meal) }),
  };
}
