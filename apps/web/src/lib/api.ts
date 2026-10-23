import { requireSupabase } from "./supabase";
import type { MenuResponse, OnboardingInput } from "@csc-3100-ama/shared";
import type {
  DashboardData,
  DiningLocation,
  GoalsInput,
  MealLogInput,
  Profile,
  ProfileInput,
  SavedMeal,
  UserPreferences,
} from "../types/dashboard";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = requireSupabase().auth;
  const { data } = await auth.getSession();
  let token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Please log in again.");

  const send = async (accessToken: string): Promise<Response> => {
    try {
      return await fetch(`${API_URL}${path}`, {
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
    const { error: signOutError } = await auth.signOut({ scope: "local" });
    if (signOutError) throw signOutError;
    throw new Error("Your session expired. Please log in again.");
  };

  let response = await send(token);
  if (response.status === 401) {
    const { data: refreshed, error } = await auth.refreshSession();
    if (error || !refreshed.session) {
      return expireSession();
    }

    token = refreshed.session.access_token;
    response = await send(token);
    if (response.status === 401) {
      return expireSession();
    }
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? "Request failed");
  }
  return body as T;
}

function localDayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function localWeekStart(): Date {
  const start = localDayStart();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function fetchDashboard(): Promise<DashboardData> {
  const params = new URLSearchParams({
    day_start: localDayStart().toISOString(),
    week_start: localWeekStart().toISOString(),
  });
  return request<DashboardData>(`/api/dashboard?${params}`);
}

export function fetchMealLogs(from?: string): Promise<MealLogInput[]> {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  return request<MealLogInput[]>(`/api/meal-logs${query.size ? `?${query}` : ""}`);
}

export function logMeal(meal: MealLogInput): Promise<unknown> {
  return request("/api/meal-logs", {
    method: "POST",
    body: JSON.stringify(meal),
  });
}

export function fetchProfile(): Promise<Profile | null> {
  return request<Profile | null>("/api/profile");
}

export function updateProfile(fields: ProfileInput): Promise<Profile> {
  return request<Profile>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function saveGoals(goals: GoalsInput): Promise<unknown> {
  return request("/api/goals", {
    method: "PUT",
    body: JSON.stringify(goals),
  });
}

export function completeOnboarding(input: OnboardingInput): Promise<void> {
  return request("/api/onboarding/complete", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchMenu(): Promise<MenuResponse> {
  return request<MenuResponse>("/api/menu");
}

export function fetchPreferences(): Promise<UserPreferences | null> {
  return request<UserPreferences | null>("/api/preferences");
}

export function updatePreferences(
  fields: Partial<UserPreferences>,
): Promise<UserPreferences> {
  return request<UserPreferences>("/api/preferences", {
    method: "PUT",
    body: JSON.stringify(fields),
  });
}

export function fetchLocations(): Promise<DiningLocation[]> {
  return request<DiningLocation[]>("/api/locations");
}

export function fetchSavedMeals(): Promise<SavedMeal[]> {
  return request<SavedMeal[]>("/api/saved-meals");
}

export function saveMeal(mealId: string): Promise<unknown> {
  return request(`/api/saved-meals/${encodeURIComponent(mealId)}`, {
    method: "PUT",
  });
}

export function unsaveMeal(mealId: string): Promise<void> {
  return request(`/api/saved-meals/${encodeURIComponent(mealId)}`, {
    method: "DELETE",
  });
}
