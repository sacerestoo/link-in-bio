import "server-only";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { genericOAuth, line } from "better-auth/plugins";
import { creemPlugin, disabledCreemPaths, type CreemKeys } from "./creem";

export type AuthSettings = Readonly<{
  baseURL: string;
  basePath: string;
  secret: string;
  /**
   * Built by apps/server/src/lib/auth.ts with drizzleAdapter, so this package
   * never imports packages/db.
   */
  database: ReturnType<typeof drizzleAdapter>;
  google?: { clientId: string; clientSecret: string };
  line?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
  /** Creem registers only when both keys are set. */
  creem?: CreemKeys;
}>;

export const createAuth = (settings: AuthSettings) =>
  betterAuth({
    baseURL: settings.baseURL,
    basePath: settings.basePath,
    secret: settings.secret,
    database: settings.database,
    emailAndPassword: { enabled: false },
    socialProviders: {
      ...(settings.google === undefined ? {} : { google: settings.google }),
      ...(settings.twitter === undefined ? {} : { twitter: settings.twitter }),
    },
    disabledPaths: disabledCreemPaths,
    plugins: [
      ...(settings.creem === undefined ? [] : [creemPlugin(settings.creem)]),
      ...(settings.line === undefined
        ? []
        : [
            genericOAuth({
              config: [
                line({
                  clientId: settings.line.clientId,
                  clientSecret: settings.line.clientSecret,
                }),
              ],
            }),
          ]),
    ],
  });

export type Auth = ReturnType<typeof createAuth>;
