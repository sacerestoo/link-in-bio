import "server-only";
import {
  disabledCreemPaths,
  getCreemSettings,
} from "@grabbin/subscription/creem";
import type { ServerEnv } from "./env";

export const createSubscriptionOptions = (settings: ServerEnv) => ({
  creem: getCreemSettings({
    apiKey: settings.CREEM_API_KEY,
    webhookSecret: settings.CREEM_WEBHOOK_SECRET,
    testMode: settings.CREEM_TEST_MODE,
    baseURL: settings.BETTER_AUTH_URL,
  }),
  disabledPaths: disabledCreemPaths,
});
