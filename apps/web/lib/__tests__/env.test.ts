import { describe, expect, it } from "vite-plus/test";
import { readWebEnv } from "../env.ts";

describe("readWebEnv", (): void => {
  it("treats blank optional settings as unset", (): void => {
    const settings = readWebEnv({
      NEXT_PUBLIC_DOMAIN: "",
      SENTRY_AUTH_TOKEN: "",
      CRON_DRY_RUN: "",
    });

    expect(settings.NEXT_PUBLIC_DOMAIN).toBeUndefined();
    expect(settings.SENTRY_AUTH_TOKEN).toBeUndefined();
    expect(settings.CRON_DRY_RUN).toBe(false);
  });
});
