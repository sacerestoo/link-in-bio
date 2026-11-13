import { definePlugin } from "vite-plus/lint/plugins";
import customHookName from "./naming/rules/custom-hook-name.ts";
import nonJsxFunctionExportConst from "./naming/rules/non-jsx-function-export-const.ts";

export default definePlugin({
  meta: { name: "react-codebase" },
  rules: {
    "custom-hook-name": customHookName,
    "non-jsx-function-export-const": nonJsxFunctionExportConst,
  },
});
