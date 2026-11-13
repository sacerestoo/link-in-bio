import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";
import customHookName from "../rules/custom-hook-name.ts";
import { pascalCaseTypes } from "../rules/identifier-case.ts";
import noJavascriptFiles from "../rules/no-javascript-files.ts";
import nonJsxFunctionExportConst from "../rules/non-jsx-function-export-const.ts";

RuleTester.describe = (name, callback): void => {
  void describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

tester.run("no-javascript-files", noJavascriptFiles, {
  valid: [
    { code: "const title = 'Void';", filename: "page.ts" },
    { code: "const title = 'Void';", filename: "page.tsx" },
  ],
  invalid: ["page.js", "page.jsx", "page.mjs", "page.cjs"].map((filename) => ({
    code: "const title = 'Void';",
    filename,
    errors: [{ messageId: "typescriptOnly" }],
  })),
});

tester.run("custom-hook-name", customHookName, {
  valid: [
    "function useUser() { useQuery(); }",
    "const useUser = () => useQuery();",
    "function getUser() { return user; }",
  ],
  invalid: [
    {
      code: "function getUser() { useQuery(); }",
      errors: [{ messageId: "hook" }],
    },
    {
      code: "const getUser = () => useQuery();",
      errors: [{ messageId: "hook" }],
    },
    {
      code: "const getUser = function () { useQuery(); };",
      errors: [{ messageId: "hook" }],
    },
  ],
});

tester.run("pascal-case-types", pascalCaseTypes, {
  valid: [
    "type UserRecord = { displayName: string };",
    "interface UserInfo { displayName: string; }",
    "type UserRecord<TValue> = { value: TValue };",
  ],
  invalid: [
    {
      code: "type userRecord = { displayName: string };",
      errors: [{ message: /userRecord.*must use PascalCase/u }],
    },
    {
      code: "interface userInfo { displayName: string; }",
      errors: [{ message: /userInfo.*must use PascalCase/u }],
    },
    {
      code: "type UserRecord<value> = { value: value };",
      errors: [{ message: /value.*must use PascalCase/u }],
    },
  ],
});

tester.run("non-jsx-function-export-const", nonJsxFunctionExportConst, {
  valid: [
    "export const getUser = () => user;",
    "export const getUser = function () { return user; };",
    "export default function HomePage() { return <main />; }",
    "export const HomePage = () => <main />;",
    "const value = 1;",
    "function getUser() { return user; }",
    "const getUser = () => user;",
    "const getUser = function () { return user; };",
  ],
  invalid: [
    {
      code: "export function getUser() { return user; }",
      errors: [{ messageId: "exportConst" }],
    },
    {
      code: "export default function getUser() { return user; }",
      errors: [{ messageId: "exportConst" }],
    },
    {
      code: "export let getUser = () => user;",
      errors: [{ messageId: "exportConst" }],
    },
  ],
});
