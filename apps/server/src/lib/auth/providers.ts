import "server-only";
import type { BetterAuthOptions } from "better-auth";
import { genericOAuth, line } from "better-auth/plugins/generic-oauth";
import type { ServerEnv } from "../env";

export const createSocialProviders = (
  settings: ServerEnv,
): NonNullable<BetterAuthOptions["socialProviders"]> => ({
  ...(settings.GOOGLE_CLIENT_ID === undefined ||
  settings.GOOGLE_CLIENT_SECRET === undefined
    ? {}
    : {
        google: {
          clientId: settings.GOOGLE_CLIENT_ID,
          clientSecret: settings.GOOGLE_CLIENT_SECRET,
          disableImplicitSignUp: true,
        },
      }),
  ...(settings.TWITTER_CLIENT_ID === undefined ||
  settings.TWITTER_CLIENT_SECRET === undefined
    ? {}
    : {
        twitter: {
          clientId: settings.TWITTER_CLIENT_ID,
          clientSecret: settings.TWITTER_CLIENT_SECRET,
          disableImplicitSignUp: true,
        },
      }),
});

export const createLineOAuthPlugins = (settings: ServerEnv) => {
  if (
    settings.LINE_CLIENT_ID === undefined ||
    settings.LINE_CLIENT_SECRET === undefined
  ) {
    return [];
  }
  return [
    genericOAuth({
      config: [
        line({
          clientId: settings.LINE_CLIENT_ID,
          clientSecret: settings.LINE_CLIENT_SECRET,
          disableImplicitSignUp: true,
        }),
      ],
    }),
  ];
};
