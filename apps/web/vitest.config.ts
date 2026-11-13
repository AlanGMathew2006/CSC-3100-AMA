import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Unit and DOM tests (npm test). Browser smoke tests live in e2e/ and run with npm run test:e2e.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.{ts,tsx}"],
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      restoreMocks: true,
    },
  }),
);
