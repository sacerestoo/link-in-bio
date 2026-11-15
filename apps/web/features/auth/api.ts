import { api } from "@/lib/api-client";
import { authClient } from "@grabbin/auth/client";

export type SocialProvider = "google" | "line" | "twitter";

const getCallbackURL = (redirectTo?: string): string => {
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
    callbackURL: getCallbackURL(redirectTo),
    requestSignUp: handle !== undefined,
    ...(handle === undefined ? {} : { additionalData: { handle } }),
  });
};

export const checkHandleAvailability = (handle: string) =>
  api.v1.pages.handles[":handle"].availability.$get({ param: { handle } });
