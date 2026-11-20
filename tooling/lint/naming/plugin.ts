import { definePlugin } from "vite-plus/lint/plugins";
import callbackOnPrefix from "./rules/callback-on-prefix.ts";
import { pascalCaseTypes } from "./rules/identifier-case.ts";
import noJavascriptFiles from "./rules/no-javascript-files.ts";

export default definePlugin({
  meta: { name: "codebase" },
  rules: {
    "callback-on-prefix": callbackOnPrefix,
    "no-javascript-files": noJavascriptFiles,
    "pascal-case-types": pascalCaseTypes,
  },
});
