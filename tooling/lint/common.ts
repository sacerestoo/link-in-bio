import type { OxlintOverride } from "vite-plus/lint";
import { featureUiSourceGlobs, webSourceGlobs } from "../architecture/paths.ts";
import { envAccessAllowedFiles } from "./env-access.ts";

export const commonPlugins = [
  "eslint",
  "typescript",
  "oxc",
  "unicorn",
  "promise",
  "import",
] as const;

export const commonJsPlugins = [
  { name: "codebase", specifier: "./tooling/lint/naming.ts" },
  { name: "testing", specifier: "./tooling/lint/testing.ts" },
  { name: "env-access", specifier: "./tooling/lint/env-access.ts" },
] as const;

export const commonLintOptions = { typeAware: true, typeCheck: true } as const;

export const commonLintCategories = {
  correctness: "error",
  pedantic: "error",
  suspicious: "error",
} as const;

export const commonRules = {
  "codebase/no-javascript-files": "error",
  "codebase/pascal-case-types": "error",
  "testing/require-test-filename": "error",
  "env-access/no-direct-env": "error",
  "eslint/no-useless-catch": "error",
  "eslint/no-unused-vars": ["error", { args: "all", caughtErrors: "all" }],
  "eslint/no-duplicate-imports": "error",
  "typescript/no-floating-promises": ["error", { ignoreVoid: true }],
  "typescript/no-misused-promises": "error",
  "typescript/strict-void-return": "error",
  "typescript/consistent-type-imports": "error",
  "typescript/prefer-readonly-parameter-types": "off",
  "import/no-cycle": "error",
  "typescript/no-explicit-any": "error",
  "eslint/no-param-reassign": "error",
  "typescript/prefer-as-const": "error",
  "typescript/no-unnecessary-template-expression": "error",
  "unicorn/prefer-number-properties": "error",
  "unicorn/filename-case": ["error", { case: "lowercase" }],
  "no-console": ["error", { allow: ["warn", "error"] }],
} satisfies NonNullable<OxlintOverride["rules"]>;

export const commonRuleOverrides = [
  {
    files: envAccessAllowedFiles,
    rules: { "env-access/no-direct-env": "off" },
  },
  {
    files: webSourceGlobs,
    rules: {
      "typescript/no-non-null-assertion": "error",
      "typescript/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": "allow-with-description",
        },
      ],
    },
  },
  {
    files: featureUiSourceGlobs,
    rules: {
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },
] satisfies OxlintOverride[];
