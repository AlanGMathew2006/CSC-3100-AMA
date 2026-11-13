import { defineConfig, devices } from "@playwright/test";

// Browser smoke test (npm run test:e2e), not part of npm test. The API and Supabase are stubbed in
// e2e/stubs.ts with a fake session, so it needs no credentials and never touches the real database.
// The env vars below take priority over apps/web/.env.local, and the stubs block every request
// that isn't to this dev server.
const PORT = 5174;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://e2e-stub.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-stub-publishable-key",
      VITE_API_URL: `http://localhost:${PORT}`,
    },
  },
});
