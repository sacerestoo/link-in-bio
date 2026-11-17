import "server-only";
import type { BetterAuthOptions } from "better-auth";
import { sendAccountDeletionEmail } from "@grabbin/email/account-deletion";
import { sendOtpEmail } from "@grabbin/email/otp";
import { emailOTP } from "better-auth/plugins/email-otp";
import type { ServerEnv } from "../env";

export const createUserOptions = (
  settings: ServerEnv,
): BetterAuthOptions["user"] => ({
  deleteUser: {
    enabled: true,
    sendDeleteAccountVerification: ({ user, url }) => {
      if (
        settings.RESEND_API_KEY === undefined ||
        settings.RESEND_FROM_EMAIL === undefined
      ) {
        throw new Error("Account deletion email is not configured.");
      }
      return sendAccountDeletionEmail({
        apiKey: settings.RESEND_API_KEY,
        from: settings.RESEND_FROM_EMAIL,
        email: user.email,
        url,
      });
    },
  },
});

export const createEmailOtpPlugin = (settings: ServerEnv) =>
  emailOTP({
    sendVerificationOTP: async ({ email, otp }) => {
      if (
        settings.RESEND_API_KEY === undefined ||
        settings.RESEND_FROM_EMAIL === undefined
      ) {
        throw new Error("Email sign-in is not configured.");
      }
      await sendOtpEmail({
        apiKey: settings.RESEND_API_KEY,
        from: settings.RESEND_FROM_EMAIL,
        email,
        otp,
      });
    },
  });
