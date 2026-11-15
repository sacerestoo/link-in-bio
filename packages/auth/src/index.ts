import "server-only";
import type { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { createAuthMiddleware, getOAuthState } from "better-auth/api";
import { emailOTP, genericOAuth, line } from "better-auth/plugins";
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
  onBeforeEmailOtpUserCreated?: (handle: string) => Promise<void>;
  onEmailOtpCallback?: (userId: string, handle: string) => Promise<void>;
  sendVerificationOTP: (input: {
    email: string;
    otp: string;
    type: "change-email" | "email-verification" | "sign-in" | "forget-password";
  }) => Promise<void>;
  google?: { clientId: string; clientSecret: string };
  line?: { clientId: string; clientSecret: string };
  twitter?: { clientId: string; clientSecret: string };
  /** Creem registers only when both keys are set. */
  creem?: CreemKeys;
}>;

const createAuthAfterHook = (settings: AuthSettings) =>
  createAuthMiddleware(async (ctx) => {
    const session = ctx.context.newSession;
    if (!session) return;

    if (ctx.path === "/callback/:id") {
      const oauthState = await getOAuthState<{ handle?: unknown }>();
      if (oauthState?.handle !== undefined) {
        await settings.onOAuthCallback?.(session.user.id, oauthState.handle);
      }
    } else if (ctx.path === "/sign-in/email-otp") {
      await settings.onEmailOtpCallback?.(session.user.id, session.user.name);
    }
  });

type BetterAuthOptions = Parameters<typeof betterAuth>[0];

const createDatabaseHooks = (
  settings: AuthSettings,
): NonNullable<BetterAuthOptions["databaseHooks"]> => ({
  user: {
    create: {
      before: async (user, context) => {
        if (context?.path === "/sign-in/email-otp") {
          await settings.onBeforeEmailOtpUserCreated?.(user.name);
        } else {
          await settings.onBeforeUserCreated?.();
        }
      },
    },
  },
});

export const createAuth = (settings: AuthSettings) =>
  betterAuth({
    baseURL: settings.baseURL,
    basePath: settings.basePath,
    secret: settings.secret,
    database: settings.database,
    account: { accountLinking: { enabled: true } },
    databaseHooks: createDatabaseHooks(settings),
    hooks: {
      after: createAuthAfterHook(settings),
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
      emailOTP({ sendVerificationOTP: settings.sendVerificationOTP }),
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
