import { definePlugin } from "vite-plus/lint/plugins";
import { pascalCaseTypes } from "./rules/identifier-case.ts";
import noJavascriptFiles from "./rules/no-javascript-files.ts";

export default definePlugin({
  meta: { name: "codebase" },
  rules: {
    "no-javascript-files": noJavascriptFiles,
    "pascal-case-types": pascalCaseTypes,
  },
});
