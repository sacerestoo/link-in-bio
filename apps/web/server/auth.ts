import "server-only";
import { createAuth, type Auth } from "@grabbin/auth";
import { schema } from "@grabbin/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDatabase } from "./database";
import { readWebEnv } from "./env";

/**
 * Builds Better Auth for one request. Returns undefined until
 * BETTER_AUTH_SECRET is set, so local dev runs without auth configured.
 */
export const getAuth = (bindings: Readonly<Env>): Auth | undefined => {
  const settings = readWebEnv(bindings);
  if (settings.BETTER_AUTH_SECRET === undefined) return undefined;
  const creem =
    settings.CREEM_API_KEY !== undefined &&
    settings.CREEM_WEBHOOK_SECRET !== undefined
      ? {
          apiKey: settings.CREEM_API_KEY,
          webhookSecret: settings.CREEM_WEBHOOK_SECRET,
          testMode: settings.CREEM_TEST_MODE,
        }
      : undefined;
  return createAuth({
    baseURL: settings.BETTER_AUTH_URL,
    secret: settings.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDatabase(bindings), {
      provider: "pg",
      schema,
    }),
    ...(creem === undefined ? {} : { creem }),
  });
};
