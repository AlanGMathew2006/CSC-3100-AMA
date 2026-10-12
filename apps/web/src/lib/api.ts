import { supabase } from "./supabase";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8000";

export interface Profile {
  id: string;
  display_name: string | null;
  dining_dollars_balance: number;
  daily_spending_target: number | null;
  onboarding_completed: boolean;
}

export interface Goals {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
}

export interface Totals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  spent: number;
}

export interface DashboardData {
  profile: Profile | null;
  goals: Goals | null;
  today: Totals;
  week: Totals;
}

export interface MealLogInput {
  name: string;
  location_name?: string;
  price?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are signed out. Please log in again.");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new Error("Can't reach the PolyProvision server. Try again.");
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

export function logMeal(meal: MealLogInput): Promise<unknown> {
  return request("/api/meal-logs", {
    method: "POST",
    body: JSON.stringify(meal),
  });
}
