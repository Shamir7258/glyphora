import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: [],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration test files share one real `glyphora_test` database (see
    // tests/setup/db.ts) and each drops it clean in beforeAll/afterAll — running
    // files in parallel races those drops against each other's fixtures. The
    // suite is small enough that sequential files cost little.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
