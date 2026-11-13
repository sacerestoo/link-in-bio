import { describe, expect, it } from "vite-plus/test";
import { readWebEnv } from "../env.ts";

describe("readWebEnv", (): void => {
  it("treats blank optional settings as unset", (): void => {
    const settings = readWebEnv({
      BETTER_AUTH_URL: "https://example.com",
      BETTER_AUTH_SECRET: "fake-better-auth-secret-at-least-32-chars",
      CREEM_API_KEY: "",
      CREEM_WEBHOOK_SECRET: "",
      CREEM_TEST_MODE: "",
      SENTRY_DSN: "",
      CRON_DRY_RUN: "",
    });

    expect(settings.CREEM_API_KEY).toBeUndefined();
    expect(settings.CREEM_WEBHOOK_SECRET).toBeUndefined();
    expect(settings.CREEM_TEST_MODE).toBe(true);
    expect(settings.SENTRY_DSN).toBeUndefined();
    expect(settings.CRON_DRY_RUN).toBe(false);
  });
});
