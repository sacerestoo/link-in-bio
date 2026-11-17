import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

export type SocialProvider = "google" | "line" | "twitter";

export const getAuthCallbackURL = (redirectTo?: string): string => {
  if (redirectTo === undefined || !redirectTo.startsWith("/")) {
    return "/sign-in";
  }

  try {
    const destination = new URL(redirectTo, window.location.origin);
    return destination.origin === window.location.origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "/sign-in";
  } catch {
    return "/sign-in";
  }
};

export const signInWithSocial = (
  provider: SocialProvider,
  handle?: string,
  redirectTo?: string,
) => {
  return authClient.signIn.social({
    provider,
    callbackURL: getAuthCallbackURL(redirectTo),
    requestSignUp: handle !== undefined,
    ...(handle === undefined ? {} : { additionalData: { handle } }),
  });
};

export const sendEmailOtp = (email: string) =>
  authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });

export const verifyEmailOtp = (email: string, otp: string, name?: string) =>
  authClient.signIn.emailOtp({
    email,
    otp,
    ...(name === undefined ? {} : { name }),
  });

export const signOut = () => authClient.signOut();

export const checkHandleAvailability = (handle: string) =>
  api.v1.pages.handles[":handle"].availability.$get({ param: { handle } });
