// Stubs for the browser smoke test: a fake signed-in Supabase session and a fake API backed by the
// MOCK fixtures in src/test/fixtures.ts. Nothing here reaches a real server.
import type { Page, Route } from "@playwright/test";
import { DASHBOARD, MEAL_TARGETS, MENU, PREFERENCES, PROFILE, RECOMMENDATIONS } from "../src/test/fixtures";
import type { MealLogInput } from "../src/types/dashboard";

// supabase-js keeps the session under sb-<first part of the project host>-auth-token.
const SESSION_KEY = "sb-e2e-stub-auth-token";
const now = () => Math.floor(Date.now() / 1000);
const fakeUser = {
  id: PROFILE.id,
  aud: "authenticated",
  role: "authenticated",
  email: "student@example.com",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: "2026-11-01T00:00:00Z",
};

export interface Backend {
  logs: MealLogInput[];
  failNextLog: boolean;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

export async function stubBackend(page: Page): Promise<Backend> {
  const backend: Backend = { logs: [], failNextLog: false };

  await page.addInitScript(
    ([key, user, expiresAt]) => {
      window.localStorage.setItem(
        key as string,
        JSON.stringify({
          access_token: "e2e-fake-access-token",
          refresh_token: "e2e-fake-refresh-token",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: expiresAt,
          user,
        }),
      );
    },
    [SESSION_KEY, fakeUser, now() + 3600] as const,
  );

  // Block everything that isn't the dev server (real Supabase, fonts, analytics, ...).
  await page.route(/^https?:\/\/(?!localhost:5174\/)/, (route) => {
    const url = route.request().url();
    if (url.startsWith("https://e2e-stub.supabase.co/auth/v1/user")) return json(route, fakeUser);
    return route.abort();
  });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    if (path === "/api/profile") return json(route, PROFILE);
    if (path === "/api/menu") return json(route, MENU);
    if (path === "/api/recommendations") return json(route, RECOMMENDATIONS);
    if (path === "/api/meal-targets") return json(route, MEAL_TARGETS);
    if (path === "/api/preferences") return json(route, PREFERENCES);
    if (path === "/api/locations") return json(route, []);
    if (path.startsWith("/api/saved-meals")) return method === "GET" ? json(route, []) : json(route, {});
    if (path === "/api/meal-logs" && method === "POST") {
      if (backend.failNextLog) {
        backend.failNextLog = false;
        return json(route, { error: "Couldn't save the meal (stubbed failure)" }, 500);
      }
      backend.logs.push(JSON.parse(request.postData() ?? "{}") as MealLogInput);
      return json(route, { id: `log-${backend.logs.length}` }, 201);
    }
    if (path === "/api/dashboard") {
      const sum = (key: "calories" | "protein_g" | "carbs_g" | "fat_g" | "price") =>
        backend.logs.reduce((total, log) => total + (log[key] ?? 0), 0);
      const today = {
        calories: sum("calories"),
        protein_g: sum("protein_g"),
        carbs_g: sum("carbs_g"),
        fat_g: sum("fat_g"),
        fiber_g: 0,
        spent: sum("price"),
      };
      return json(route, { ...DASHBOARD, today, week: today, recent_logs: backend.logs, week_logs: [] });
    }
    return json(route, { error: `No stub for ${method} ${path}` }, 404);
  });

  return backend;
}
