import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Node environment: everything under test is server-side (services, API
    // route handlers, pure helpers). No jsdom needed — the web UI is not
    // covered by this suite.
    environment: "node",
    include: ["lib/**/*.test.ts", "app/api/**/*.test.ts", "tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Coverage is measured on the layers we actually own tests for. The
      // web UI is excluded: it is unchanged by this project and untested.
      include: ["lib/services/**", "lib/api/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
