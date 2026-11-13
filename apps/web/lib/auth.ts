import "server-only";
import { readWebEnv } from "@/lib/env";
import { createAuth, type Auth } from "@grabbin/auth";
import { createDatabase, schema } from "@grabbin/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const getAuth = (bindings: Readonly<Env>): Auth => {
  const settings = readWebEnv(bindings);

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
    database: drizzleAdapter(
      createDatabase(bindings.HYPERDRIVE.connectionString),
      { provider: "pg", schema },
    ),
    ...(creem === undefined ? {} : { creem }),
  });
};
