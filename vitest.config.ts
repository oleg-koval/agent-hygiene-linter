import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/types.ts", "src/index.ts"],
      thresholds: {
        lines: 75,
        functions: 88,
        branches: 62,
        statements: 75,
      },
    },
  },
});
