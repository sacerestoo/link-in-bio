import type { OxlintOverride } from "vite-plus/lint";

export const tanstackQueryJsPlugins = [
  { name: "@tanstack/query", specifier: "@tanstack/eslint-plugin-query" },
  { name: "query", specifier: "./tooling/lint/query.ts" },
] as const;

export const tanstackQueryRules = {
  "@tanstack/query/exhaustive-deps": "error",
  "@tanstack/query/stable-query-client": "error",
  "@tanstack/query/no-rest-destructuring": "error",
  "@tanstack/query/no-unstable-deps": "error",
  "@tanstack/query/no-void-query-fn": "error",
  "@tanstack/query/mutation-property-order": "error",
  "@tanstack/query/prefer-query-options": "error",
  "query/canonical-query-definitions": "error",
  "query/no-hardcoded-query-keys": "error",
} satisfies NonNullable<OxlintOverride["rules"]>;
