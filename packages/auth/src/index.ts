import "server-only";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, getOAuthState } from "better-auth/api";
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
  onBeforeUserCreated?: () => Promise<void>;
  onOAuthCallback?: (userId: string, handle: unknown) => Promise<void>;
  google?: { clientId: string; clientSecret: string };
  line?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
  /** Creem registers only when both keys are set. */
  creem?: CreemKeys;
}>;

const createOAuthCallbackHook = (settings: AuthSettings) =>
  createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/callback/:id" || !ctx.context.newSession) return;

    const oauthState = await getOAuthState<{ handle?: unknown }>();
    if (oauthState?.handle === undefined) return;

    await settings.onOAuthCallback?.(
      ctx.context.newSession.user.id,
      oauthState.handle,
    );
  });

export const createAuth = (settings: AuthSettings) =>
  betterAuth({
    baseURL: settings.baseURL,
    basePath: settings.basePath,
    secret: settings.secret,
    database: settings.database,
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            await settings.onBeforeUserCreated?.();
          },
        },
      },
    },
    hooks: {
      after: createOAuthCallbackHook(settings),
    },
    emailAndPassword: { enabled: false },
    socialProviders: {
      ...(settings.google === undefined
        ? {}
        : { google: { ...settings.google, disableImplicitSignUp: true } }),
      ...(settings.twitter === undefined
        ? {}
        : { twitter: { ...settings.twitter, disableImplicitSignUp: true } }),
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
                  disableImplicitSignUp: true,
                }),
              ],
            }),
          ]),
    ],
  });

export type Auth = ReturnType<typeof createAuth>;
