import { defineConfig } from "vite-plus";
import {
  createLintConfig,
  type LintProfileSelection,
} from "./tooling/lint/profiles.ts";

// Workspace-wide lint, format and staged settings. `vp lint`, `vp fmt` and
// `vp check` use this block from every package directory; package configs
// (apps/web, apps/cron) only hold Vite/runtime settings.
const enabledLintProfiles = {
  react: true,
  vitePlus: true,
  tanstackQuery: true,
  nextApp: true,
} as const satisfies LintProfileSelection;

const generatedPatterns = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.wrangler/**",
  "**/.vinext/**",
  "**/.next/**",
  "**/.cloudflare/**",
  "**/worker-configuration.d.ts",
  "packages/db/src/migrations/**",
];

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: generatedPatterns,
  },
  fmt: {
    semi: true,
    singleQuote: false,
    printWidth: 80,
    jsxSingleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "lf",
    insertFinalNewline: true,
    singleAttributePerLine: true,
    proseWrap: "always",
    ignorePatterns: [...generatedPatterns, "bun.lock"],
    sortPackageJson: {
      sortScripts: true,
    },
    sortTailwindcss: {
      // Tailwind class sorting reads the shared stylesheet and helpers.
      stylesheet: "./packages/ui/src/styles/globals.css",
      functions: ["cn", "clsx", "cva"],
    },
    sortImports: {
      newlinesBetween: false,
      internalPattern: ["@/**", "@grabbin/**"],
      groups: [
        "type-import",
        ["value-builtin", "value-external"],
        "type-internal",
        "value-internal",
        ["type-parent", "type-sibling", "type-index"],
        ["value-parent", "value-sibling", "value-index"],
        "unknown",
      ],
    },
  },
  lint: {
    ...createLintConfig(enabledLintProfiles),
    ignorePatterns: generatedPatterns,
  },
  run: {
    cache: true,
    tasks: {
      // The root package's own tests (tooling/). Not cached: the
      // dependency-cruiser fixtures spawn depcruise in temp directories, which
      // fails under the cache's file-access tracking.
      test: { command: "vp test run tooling", cache: false },
    },
  },
  staged: {
    "*.{js,jsx,ts,tsx,json,jsonc,css,md,mdx}": "vp fmt",
  },
});
