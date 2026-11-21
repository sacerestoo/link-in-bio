import type { OxlintConfig } from "vite-plus/lint";
import {
  architectureDirectories,
  webSourceGlobs,
} from "../architecture/paths.ts";
import {
  commonJsPlugins,
  commonLintCategories,
  commonLintOptions,
  commonPlugins,
  commonRuleOverrides,
  commonRules,
} from "./common";
import {
  nextAppJsPlugins,
  nextAppOverrides,
  nextAppRules,
  nextAppWebPlugins,
  nextAppWebRules,
} from "./next-app";
import { reactJsPlugins, reactLint } from "./react";
import { tanstackQueryJsPlugins, tanstackQueryRules } from "./tanstack-query";
import { vitePlusJsPlugins, vitePlusRules } from "./vite-plus";

export type LintProfileSelection = Readonly<{
  react: boolean;
  vitePlus: boolean;
  tanstackQuery: boolean;
  nextApp: boolean;
}>;

function reactOverrides(selection: LintProfileSelection) {
  if (!selection.react) return [];
  return [
    {
      files: webSourceGlobs,
      plugins: [
        ...reactLint.plugins,
        ...(selection.nextApp ? nextAppWebPlugins : []),
      ],
      rules: {
        ...reactLint.rules,
        ...(selection.nextApp ? nextAppWebRules : {}),
      },
    },
  ] satisfies NonNullable<OxlintConfig["overrides"]>;
}

export function createLintConfig(selection: LintProfileSelection) {
  return {
    plugins: [...commonPlugins],
    jsPlugins: [
      ...commonJsPlugins,
      ...(selection.react ? reactJsPlugins : []),
      ...(selection.vitePlus ? vitePlusJsPlugins : []),
      ...(selection.tanstackQuery ? tanstackQueryJsPlugins : []),
      ...(selection.nextApp ? nextAppJsPlugins : []),
    ],
    categories: commonLintCategories,
    rules: {
      ...commonRules,
      ...(selection.vitePlus ? vitePlusRules : {}),
      ...(selection.tanstackQuery ? tanstackQueryRules : {}),
      ...(selection.nextApp ? nextAppRules : {}),
    },
    options: commonLintOptions,
    overrides: [
      ...reactOverrides(selection),
      {
        files: [`${architectureDirectories.app}/layout.tsx`],
        rules: {
          "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }],
        },
      },
      ...(selection.nextApp ? nextAppOverrides : []),
      ...commonRuleOverrides,
    ],
  } satisfies OxlintConfig;
}
