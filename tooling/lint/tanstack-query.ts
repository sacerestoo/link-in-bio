import type { OxlintOverride } from "vite-plus/lint";

export const tanstackQueryJsPlugins = [
  { name: "@tanstack/query", specifier: "@tanstack/eslint-plugin-query" },
  { name: "query", specifier: "./tooling/lint/query.ts" },
] as const;

export const tanstackQueryRules = {
  // Transport clients choose where requests go; they are not query data identity.
  "@tanstack/query/exhaustive-deps": [
    "error",
    { allowlist: { variables: ["client"], types: ["ApiClient"] } },
  ],
  "@tanstack/query/stable-query-client": "error",
  "@tanstack/query/no-rest-destructuring": "error",
  "@tanstack/query/no-unstable-deps": "error",
  "@tanstack/query/no-void-query-fn": "error",
  "@tanstack/query/mutation-property-order": "error",
  "@tanstack/query/prefer-query-options": "error",
  "query/canonical-query-definitions": "error",
  "query/canonical-query-hooks": "error",
  "query/no-hardcoded-query-keys": "error",
  "query/no-query-key-helper-functions": "error",
  "query/no-page-set-query-data": "error",
} satisfies NonNullable<OxlintOverride["rules"]>;
