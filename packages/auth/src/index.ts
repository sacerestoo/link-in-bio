import "server-only";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
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
    disabledPaths: disabledCreemPaths,
    plugins: settings.creem === undefined ? [] : [creemPlugin(settings.creem)],
  });

export type Auth = ReturnType<typeof createAuth>;
