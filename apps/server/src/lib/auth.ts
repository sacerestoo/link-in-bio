import "server-only";
import { createAuth, type Auth } from "@grabbin/auth";
import { createDatabase, schema } from "@grabbin/db";
import { API_VERSION } from "@grabbin/shared/api-version";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { readServerEnv, type ServerBindings } from "./env";

export const getAuth = (bindings: Readonly<ServerBindings>): Auth => {
  const settings = readServerEnv(bindings);
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
    basePath: `/${API_VERSION}/auth`,
    secret: settings.BETTER_AUTH_SECRET,
    google:
      settings.GOOGLE_CLIENT_ID !== undefined &&
      settings.GOOGLE_CLIENT_SECRET !== undefined
        ? {
            clientId: settings.GOOGLE_CLIENT_ID,
            clientSecret: settings.GOOGLE_CLIENT_SECRET,
          }
        : undefined,
    line:
      settings.LINE_CLIENT_ID !== undefined &&
      settings.LINE_CLIENT_SECRET !== undefined
        ? {
            clientId: settings.LINE_CLIENT_ID,
            clientSecret: settings.LINE_CLIENT_SECRET,
          }
        : undefined,
    twitter:
      settings.TWITTER_CLIENT_ID !== undefined &&
      settings.TWITTER_CLIENT_SECRET !== undefined
        ? {
            clientId: settings.TWITTER_CLIENT_ID,
            clientSecret: settings.TWITTER_CLIENT_SECRET,
          }
        : undefined,
    database: drizzleAdapter(
      createDatabase(bindings.HYPERDRIVE.connectionString),
      { provider: "pg", schema },
    ),
    ...(creem === undefined ? {} : { creem }),
  });
};
