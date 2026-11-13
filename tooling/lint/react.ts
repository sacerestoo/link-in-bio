import type { OxlintOverride } from "vite-plus/lint";
import { commonPlugins } from "./common";

export const reactJsPlugins = [
  { name: "react-codebase", specifier: "./tooling/lint/react-naming.ts" },
] as const;

export const reactLint = {
  plugins: [...commonPlugins, "react", "jsx-a11y"],
  rules: {
    // Turn off to allow empty JSX elements to use separate opening and closing tags.
    "react/self-closing-comp": "error",
    // Turn off to allow custom hooks without a use prefix.
    "react-codebase/custom-hook-name": "error",
    "react-codebase/non-jsx-function-export-const": "error",
    // Turn off to allow array positions to be used as React keys.
    "react/no-array-index-key": "error",
    // Turn off to allow hooks with missing or extra dependencies.
    "react/exhaustive-deps": "error",
    // React Compiler diagnostics from eslint-plugin-react-hooks v7
    // `recommended`. Oxlint has no port of component-hook-factories, config
    // or gating yet; see AGENTS.md "Rule enforcement".
    "react/rules-of-hooks": "error",
    "react/error-boundaries": "error",
    "react/globals": "error",
    "react/immutability": "error",
    "react/incompatible-library": "error",
    "react/preserve-manual-memoization": "error",
    "react/purity": "error",
    "react/refs": "error",
    "react/set-state-in-effect": "error",
    "react/set-state-in-render": "error",
    "react/static-components": "error",
    "react/unsupported-syntax": "error",
    "react/use-memo": "error",
    // Turn off to allow interactive click handlers without keyboard support.
    "jsx-a11y/click-events-have-key-events": "error",
    // Turn off to allow labels without a linked form control.
    "jsx-a11y/label-has-associated-control": "error",
    // Turn off to allow images without alternative text.
    "jsx-a11y/alt-text": "error",
  },
} satisfies Omit<OxlintOverride, "files">;
