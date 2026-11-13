import { expect, it } from "vite-plus/test";
import { commonRuleOverrides } from "../common.ts";
import { nextAppOverrides } from "../next-app.ts";
import { createLintConfig, type LintProfileSelection } from "../profiles.ts";

const enabledProfiles = {
  react: true,
  vitePlus: true,
  tanstackQuery: true,
  nextApp: true,
} satisfies LintProfileSelection;

const disabledProfiles = {
  react: false,
  vitePlus: false,
  tanstackQuery: false,
  nextApp: false,
} satisfies LintProfileSelection;

it("keeps common checks on when every optional profile is off", () => {
  const config = createLintConfig(disabledProfiles);

  expect(config.rules).toMatchObject({
    "codebase/no-javascript-files": "error",
    "testing/require-test-filename": "error",
  });
  expect(config.rules).not.toHaveProperty("vite-plus/prefer-vite-plus-imports");
  expect(config.jsPlugins).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "codebase" }),
      expect.objectContaining({ name: "testing" }),
    ]),
  );
});

it("disables React rules without changing the other profiles", () => {
  const config = createLintConfig({
    ...enabledProfiles,
    react: false,
  });

  expect(config.jsPlugins).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "react-codebase" }),
    ]),
  );
  expect(config.overrides).toHaveLength(
    commonRuleOverrides.length + nextAppOverrides.length + 1,
  );
  expect(config.rules).toHaveProperty(
    "testing/require-vite-plus-test",
    "error",
  );
  expect(config.rules).toHaveProperty(
    "query/canonical-query-definitions",
    "error",
  );
  expect(config.rules).toHaveProperty("query/no-hardcoded-query-keys", "error");
});

it("disables Vite+ lint rules while keeping TanStack rules", () => {
  const config = createLintConfig({
    ...enabledProfiles,
    vitePlus: false,
  });

  expect(config.jsPlugins).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ name: "vite-plus" })]),
  );
  expect(config.rules).not.toHaveProperty("vite-plus/prefer-vite-plus-imports");
  expect(config.rules).not.toHaveProperty("testing/require-vite-plus-test");
  expect(config.rules).toHaveProperty("query/no-hardcoded-query-keys", "error");
});

it("lets TanStack Query be disabled independently", () => {
  const config = createLintConfig({
    ...enabledProfiles,
    tanstackQuery: false,
  });

  expect(config.rules).not.toHaveProperty("query/canonical-query-definitions");
  expect(config.rules).not.toHaveProperty("query/no-hardcoded-query-keys");
  expect(config.rules).toHaveProperty(
    "vite-plus/prefer-vite-plus-imports",
    "error",
  );
});

it("adds the Next.js App Router checks only with the nextApp profile", () => {
  const enabled = createLintConfig(enabledProfiles);
  const disabled = createLintConfig({ ...enabledProfiles, nextApp: false });
  const webOverride = enabled.overrides.find((override) => {
    const plugins: readonly string[] =
      "plugins" in override ? (override.plugins ?? []) : [];
    return plugins.includes("nextjs");
  });

  expect(webOverride?.rules).toHaveProperty(
    "nextjs/no-html-link-for-pages",
    "error",
  );
  expect(enabled.rules).toHaveProperty(
    "next-app/client-directive-placement",
    "error",
  );
  expect(JSON.stringify(disabled)).not.toContain("nextjs");
  expect(JSON.stringify(disabled)).not.toContain("next-app/");
});
