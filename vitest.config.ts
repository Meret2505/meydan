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
    // Integration files truncate shared tables between tests, so running two
    // of them at once makes each one's fixtures vanish mid-test. The suite is
    // only a few seconds long, so serialising files is cheaper than giving
    // each one its own database schema.
    fileParallelism: false,
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
      // Next's build-time client-bundle marker; has no resolvable entry
      // outside Next's bundler. See tests/stubs/server-only.ts.
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
});
