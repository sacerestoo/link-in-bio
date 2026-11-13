import { definePlugin, defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";

const testApis = new Set([
  "afterAll",
  "afterEach",
  "assert",
  "beforeAll",
  "beforeEach",
  "describe",
  "expect",
  "it",
  "test",
  "vi",
]);
const testModules = new Set([
  "@jest/globals",
  "bun:test",
  "chai",
  "node:assert",
  "node:assert/strict",
  "node:test",
  "vitest",
]);

function isTestFile(filename: string): boolean {
  return (
    /(?:^|[/\\])(?:__tests__|e2e|tests?)(?:[/\\]|$)/u.test(filename) ||
    /\.(?:e2e|spec|test)\.[cm]?[jt]sx?$/u.test(filename)
  );
}

function isE2eFile(filename: string): boolean {
  return (
    /(?:^|[/\\])e2e(?:[/\\]|$)/u.test(filename) ||
    /\.e2e(?:\.(?:test|spec))?\.[cm]?[jt]sx?$/u.test(filename)
  );
}

function hasLegacyTestDirectory(filename: string): boolean {
  return /(?:^|[/\\])tests?(?:[/\\]|$)/u.test(filename);
}

function isTestModule(source: string): boolean {
  return (
    testModules.has(source) ||
    source.startsWith("vitest/") ||
    source.startsWith("chai/")
  );
}

function importsTestApi(node: Readonly<AstNode>): boolean {
  return getChildren(node, "specifiers").some((specifier) => {
    const imported = getChild(specifier, "imported");
    return testApis.has(getName(imported) ?? "");
  });
}

const requireVitePlusTest = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require vite-plus/test in test files" },
    messages: {
      testImport: "Import test APIs only from `vite-plus/test`.",
      missingImport: "Import test APIs from `vite-plus/test`.",
    },
  },
  create(context) {
    const filename = context.filename;
    const applies = isTestFile(filename) && !isE2eFile(filename);
    let hasValidImport = false;
    let hasInvalidImport = false;

    return {
      ImportDeclaration(input: unknown): void {
        if (!applies || !isAstNode(input)) return;
        const source = getString(getChild(input, "source"), "value");
        if (source === undefined || source.length === 0) return;

        if (source === "vite-plus/test" && importsTestApi(input)) {
          hasValidImport = true;
          return;
        }

        if (isTestModule(source) || importsTestApi(input)) {
          hasInvalidImport = true;
          context.report({ node: input, messageId: "testImport" });
        }
      },
      "Program:exit"(input: unknown): void {
        if (
          applies &&
          !hasValidImport &&
          !hasInvalidImport &&
          isAstNode(input)
        ) {
          context.report({ node: input, messageId: "missingImport" });
        }
      },
    };
  },
});

const requireTestFilename = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require standard test file suffixes" },
    messages: {
      unit: "Unit test files must end with `.test.ts`.",
      e2e: "E2E test files must end with `.e2e.ts`.",
      testDirectory: "Use `__tests__` for unit test folders.",
    },
  },
  create(context) {
    const filename = context.filename;
    if (!isTestFile(filename)) return {};

    return {
      Program(input: unknown): void {
        if (!isAstNode(input)) return;
        const isE2e = isE2eFile(filename);
        if (!isE2e && hasLegacyTestDirectory(filename)) {
          context.report({ node: input, messageId: "testDirectory" });
        }
        if (isE2e && !filename.endsWith(".e2e.ts")) {
          context.report({ node: input, messageId: "e2e" });
        } else if (!isE2e && !filename.endsWith(".test.ts")) {
          context.report({ node: input, messageId: "unit" });
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "testing" },
  rules: {
    "require-vite-plus-test": requireVitePlusTest,
    "require-test-filename": requireTestFilename,
  },
});
