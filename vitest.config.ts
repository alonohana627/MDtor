import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/**/index.ts",
        "src/**/types.ts",
        "src/**/*.worker.ts",
        "src/hooks/useProjectWorkspaceHelpers.ts",
        "src/hooks/workspaceTypes.ts",
        "src/markdown/exportMarkdown.ts",
        "src/project/projectTypes.ts",
      ],
    },
  },
});
