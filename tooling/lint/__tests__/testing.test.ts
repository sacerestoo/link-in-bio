import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import testingPlugin from "../testing.ts";

RuleTester.describe = (name, callback): void => {
  describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

tester.run(
  "require-vite-plus-test",
  testingPlugin.rules["require-vite-plus-test"],
  {
    valid: [
      {
        code: 'import { describe, expect, it, vi } from "vite-plus/test";',
        filename: "features/users/__tests__/users.test.ts",
      },
      {
        code: 'import { it } from "vite-plus/test";',
        filename: "features/users/__tests__/users.test.ts",
      },
      {
        code: 'import { test } from "node:test";',
        filename: "features/users/e2e/users.test.ts",
      },
      {
        code: 'import { test } from "bun:test";',
        filename: "features/users/users.e2e.test.ts",
      },
    ],
    invalid: [
      {
        code: "const answer = 42;",
        filename: "features/users/__tests__/users.test.ts",
        errors: [{ messageId: "missingImport" }],
      },
      {
        code: 'import { describe, it } from "node:test";',
        filename: "features/users/__tests__/users.test.ts",
        errors: [{ messageId: "testImport" }],
      },
      {
        code: 'import { expect } from "node:assert/strict";',
        filename: "features/users/__tests__/users.test.ts",
        errors: [{ messageId: "testImport" }],
      },
      {
        code: 'import { it } from "some-test-package";',
        filename: "features/users/__tests__/users.test.ts",
        errors: [{ messageId: "testImport" }],
      },
      {
        code: 'import { it } from "vite-plus/test"; import { vi } from "vitest";',
        filename: "features/users/__tests__/users.test.ts",
        errors: [{ messageId: "testImport" }],
      },
    ],
  },
);

it("registers the test import rule", () => {
  expect(Object.keys(testingPlugin.rules)).toEqual([
    "require-vite-plus-test",
    "require-test-filename",
  ]);
});

tester.run(
  "require-test-filename",
  testingPlugin.rules["require-test-filename"],
  {
    valid: [
      {
        code: "const value = 1;",
        filename: "features/users/__tests__/users.test.ts",
      },
      {
        code: "const value = 1;",
        filename: "features/users/e2e/users.e2e.ts",
      },
      {
        code: "const value = 1;",
        filename: "features/users/users.e2e.ts",
      },
      {
        code: "const value = 1;",
        filename: "features/users/model/users.ts",
      },
    ],
    invalid: [
      {
        code: "const value = 1;",
        filename: "features/users/__tests__/users.spec.ts",
        errors: [{ messageId: "unit" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/__tests__/users.test.tsx",
        errors: [{ messageId: "unit" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/e2e/users.test.ts",
        errors: [{ messageId: "e2e" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/e2e/checkout.ts",
        errors: [{ messageId: "e2e" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/users.e2e.test.ts",
        errors: [{ messageId: "e2e" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/checkout.e2e.test.ts",
        errors: [{ messageId: "e2e" }],
      },
      {
        code: "const value = 1;",
        filename: "features/users/tests/users.test.ts",
        errors: [{ messageId: "testDirectory" }],
      },
    ],
  },
);
