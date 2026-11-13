import type { OxlintOverride } from "vite-plus/lint";

export const vitePlusJsPlugins = [
  { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
] as const;

export const vitePlusRules = {
  "vite-plus/prefer-vite-plus-imports": "error",
  "testing/require-vite-plus-test": "error",
} satisfies NonNullable<OxlintOverride["rules"]>;
