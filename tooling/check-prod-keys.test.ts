import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { getProductionKeyErrors } from "./check-prod-keys.ts";
import { readDotenvEntries } from "./dotenv.ts";

function settingsFromExample(path: string): Record<string, string> {
  const entries = readDotenvEntries(readFileSync(path, "utf8"), path);
  return Object.fromEntries(
    [...entries.keys()].map((key) => [
      key,
      key === "BETTER_AUTH_URL"
        ? "https://grabbin.me"
        : key === "BETTER_AUTH_SECRET"
          ? "test-secret-that-is-at-least-32-characters"
          : key === "CREEM_TEST_MODE" || key === "CRON_DRY_RUN"
            ? "false"
            : "configured-test-value",
    ]),
  );
}

function dotenv(settings: Record<string, string>): string {
  return Object.entries(settings)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

const validBindings = {
  CLOUDFLARE_API_TOKEN: "test-token",
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  WEB_ENV_PRODUCTION: dotenv(settingsFromExample("apps/web/.env.example")),
  SERVER_ENV_PRODUCTION: dotenv(
    settingsFromExample("apps/server/.env.example"),
  ),
  CRON_ENV_PRODUCTION: dotenv(settingsFromExample("apps/cron/.env.example")),
};

describe("getProductionKeyErrors accepts", (): void => {
  it("complete settings matching all Worker examples", (): void => {
    expect(getProductionKeyErrors(validBindings)).toEqual([]);
  });
});

describe("getProductionKeyErrors reports", (): void => {
  it("missing settings without exposing values", (): void => {
    const serverSettings = settingsFromExample("apps/server/.env.example");
    delete serverSettings.BETTER_AUTH_SECRET;
    const errors = getProductionKeyErrors({
      ...validBindings,
      CLOUDFLARE_API_TOKEN: "",
      SERVER_ENV_PRODUCTION: dotenv(serverSettings),
    });

    expect(errors).toContain(
      "Missing production setting: CLOUDFLARE_API_TOKEN",
    );
    expect(errors).toContain(
      "SERVER_ENV_PRODUCTION is missing setting: BETTER_AUTH_SECRET",
    );
    expect(errors.join(" ")).not.toContain(
      "test-secret-that-is-at-least-32-characters",
    );
  });
});

describe("getProductionKeyErrors rejects", (): void => {
  it("undeclared, blank, and invalidly formatted settings", (): void => {
    const serverSettings = {
      ...settingsFromExample("apps/server/.env.example"),
      BETTER_AUTH_URL: "not a URL",
      EXTRA_SETTING: "not declared",
      SENTRY_DSN: " ",
    };
    const errors = getProductionKeyErrors({
      ...validBindings,
      SERVER_ENV_PRODUCTION: dotenv(serverSettings),
    });

    expect(errors).toContain(
      "SERVER_ENV_PRODUCTION has an undeclared setting: EXTRA_SETTING",
    );
    expect(errors).toContain(
      "SERVER_ENV_PRODUCTION has an empty or non-text value for: SENTRY_DSN",
    );
    expect(
      errors.some((error) => error.includes("BETTER_AUTH_URL (url)")),
    ).toBe(true);
  });

  it("malformed dotenv settings", (): void => {
    expect(
      getProductionKeyErrors({ ...validBindings, CRON_ENV_PRODUCTION: "{" }),
    ).toContain(
      "CRON_ENV_PRODUCTION is invalid dotenv: CRON_ENV_PRODUCTION has an invalid entry on line 1.",
    );
  });
});
