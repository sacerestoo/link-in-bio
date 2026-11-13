import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import envAccessPlugin from "../env-access.ts";
import { createLintConfig } from "../profiles.ts";

RuleTester.describe = (name, callback): void => {
  describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});

tester.run("no-direct-env", envAccessPlugin.rules["no-direct-env"], {
  valid: [
    { code: 'import { getEnv } from "@/env"; const { A } = getEnv();' },
    { code: 'import { waitUntil } from "cloudflare:workers";' },
    { code: "const env = { A: 1 }; const value = env.A;" },
    { code: "const value = process.cwd();" },
    { code: "const value = import.meta.url;" },
  ],
  invalid: [
    {
      code: "const url = process.env.DATABASE_URL;",
      errors: [{ messageId: "processEnv" }],
    },
    {
      code: 'const url = process.env["DATABASE_URL"];',
      errors: [{ messageId: "processEnv" }],
    },
    {
      code: 'const url = process["env"].DATABASE_URL;',
      errors: [{ messageId: "processEnv" }],
    },
    {
      code: "const url = globalThis.process.env.DATABASE_URL;",
      errors: [{ messageId: "processEnv" }],
    },
    {
      code: "const { env } = process;",
      errors: [{ messageId: "processEnv" }],
    },
    {
      code: "const key = import.meta.env.VITE_KEY;",
      errors: [{ messageId: "importMetaEnv" }],
    },
    {
      code: 'import { env } from "cloudflare:workers";',
      errors: [{ messageId: "workersEnv" }],
    },
    {
      code: 'import { env as bindings, waitUntil } from "cloudflare:workers";',
      errors: [{ messageId: "workersEnv" }],
    },
    {
      code: 'import * as workers from "cloudflare:workers";',
      errors: [{ messageId: "workersEnv" }],
    },
  ],
});

it("enables the rule everywhere except the app env.ts files, server bindings, config files, and tooling", () => {
  const config = createLintConfig({
    react: false,
    vitePlus: false,
    tanstackQuery: false,
    nextApp: false,
  });
  expect(config.rules["env-access/no-direct-env"]).toBe("error");
  expect(config.overrides).toContainEqual({
    files: [
      "apps/web/server/env.ts",
      "apps/web/server/bindings.ts",
      "apps/cron/src/env.ts",
      "**/*.config.ts",
      "tooling/**",
    ],
    rules: { "env-access/no-direct-env": "off" },
  });
});
