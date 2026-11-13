import { creem } from "@creem_io/better-auth";

type CreemOptions = Parameters<typeof creem>[0];

export type CreemKeys = Readonly<
  Pick<CreemOptions, "apiKey" | "webhookSecret" | "testMode">
>;

/** The Creem Better Auth plugin. Placeholder wiring until billing lands. */
export const creemPlugin = (keys: CreemKeys): ReturnType<typeof creem> =>
  creem({
    ...keys,
    persistSubscriptions: true,
    defaultSuccessUrl: "/",
  });

// Creem endpoints that trust customer or subscription IDs from the request
// body. Better Auth answers 404 for them; web routes replace them with
// session-scoped handlers.
// https://docs.creem.io/code/sdks/better-auth/client
export const disabledCreemPaths = [
  "/creem/create-checkout",
  "/creem/create-portal",
  "/creem/cancel-subscription",
  "/creem/retrieve-subscription",
  "/creem/search-transactions",
];
