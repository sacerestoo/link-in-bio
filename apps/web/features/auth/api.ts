import { authClient } from "@grabbin/auth/client";

export type SocialProvider = "google" | "line" | "twitter";

export const signInWithSocial = (provider: SocialProvider) =>
  authClient.signIn.social({ provider, callbackURL: "/" });
