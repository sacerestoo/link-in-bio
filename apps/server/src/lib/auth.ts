import "server-only";
import { createAuth, type Auth, type AuthSettings } from "@grabbin/auth";
import { createDatabase, schema } from "@grabbin/db";
import { sendAccountDeletionEmail } from "@grabbin/email/account-deletion";
import { sendOtpEmail } from "@grabbin/email/otp";
import { API_VERSION } from "@grabbin/shared/api-version";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  ensureHandleAvailable,
  ensurePageForUser,
} from "../services/pages.service";
import { readServerEnv, type ServerBindings } from "./env";

const socialProvider = (
  clientId: string | undefined,
  clientSecret: string | undefined,
) =>
  clientId === undefined || clientSecret === undefined
    ? undefined
    : { clientId, clientSecret };

const createOtpEmailSender =
  (
    apiKey: string | undefined,
    from: string | undefined,
  ): AuthSettings["sendVerificationOTP"] =>
  async ({ email, otp }) => {
    if (apiKey === undefined || from === undefined) {
      throw new Error("Email sign-in is not configured.");
    }

    await sendOtpEmail({ apiKey, from, email, otp });
  };

const createAccountDeletionEmailSender =
  (
    apiKey: string | undefined,
    from: string | undefined,
  ): AuthSettings["sendDeleteAccountVerification"] =>
  async ({ email, url }) => {
    if (apiKey === undefined || from === undefined) {
      throw new Error("Account deletion email is not configured.");
    }
    await sendAccountDeletionEmail({ apiKey, from, email, url });
  };

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

  const database = createDatabase(bindings.HYPERDRIVE.connectionString);

  return createAuth({
    baseURL: settings.BETTER_AUTH_URL,
    basePath: `/${API_VERSION}/auth`,
    secret: settings.BETTER_AUTH_SECRET,
    google: socialProvider(
      settings.GOOGLE_CLIENT_ID,
      settings.GOOGLE_CLIENT_SECRET,
    ),
    line: socialProvider(settings.LINE_CLIENT_ID, settings.LINE_CLIENT_SECRET),
    twitter: socialProvider(
      settings.TWITTER_CLIENT_ID,
      settings.TWITTER_CLIENT_SECRET,
    ),
    database: drizzleAdapter(database, { provider: "pg", schema }),
    onBeforeUserCreated: async () => {
      await ensureHandleAvailable(database);
    },
    onOAuthCallback: (userId, handle) =>
      ensurePageForUser(database, userId, handle),
    onBeforeEmailOtpUserCreated: async (handle) => {
      await ensureHandleAvailable(database, handle);
    },
    onEmailOtpCallback: (userId, handle) =>
      ensurePageForUser(database, userId, handle),
    sendVerificationOTP: createOtpEmailSender(
      settings.RESEND_API_KEY,
      settings.RESEND_FROM_EMAIL,
    ),
    sendDeleteAccountVerification: createAccountDeletionEmailSender(
      settings.RESEND_API_KEY,
      settings.RESEND_FROM_EMAIL,
    ),
    ...(creem === undefined ? {} : { creem }),
  });
};
