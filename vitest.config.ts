import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: [
        "src/cli.ts",
        "src/hygiene-report.ts",
        "src/hygiene-scan.ts",
        "src/fix.ts",
        "src/fix-templates.ts",
        "src/fix-writer.ts",
      ],
      exclude: ["src/index.ts", "src/hygiene-types.ts"],
      thresholds: {
        lines: 75,
        functions: 80,
        branches: 60,
        statements: 75,
      },
    },
  },
});
