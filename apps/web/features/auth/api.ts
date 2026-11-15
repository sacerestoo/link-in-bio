import { api } from "@/lib/api-client";
import { authClient } from "@grabbin/auth/client";

export type SocialProvider = "google" | "line" | "twitter";

export const signInWithSocial = (provider: SocialProvider, handle?: string) =>
  authClient.signIn.social({
    provider,
    callbackURL: "/redirect",
    requestSignUp: handle !== undefined,
    ...(handle === undefined ? {} : { additionalData: { handle } }),
  });

export const checkHandleAvailability = (handle: string) =>
  api.v1.pages.handles[":handle"].availability.$get({ param: { handle } });
