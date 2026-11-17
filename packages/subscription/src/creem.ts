import "server-only";
import { creem } from "@creem_io/better-auth";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";

type CreemOptions = Parameters<typeof creem>[0];

export type CreemKeys = Readonly<
  Pick<
    CreemOptions,
    "apiKey" | "webhookSecret" | "testMode" | "defaultSuccessUrl"
  >
>;

/** The Creem Better Auth plugin. */
export const creemPlugin = (keys: CreemKeys): ReturnType<typeof creem> =>
  creem({
    ...keys,
    persistSubscriptions: true,
  });

// These endpoints accept customer or subscription IDs that Better Auth does
// not verify against the session. Checkout and portal are session-guarded in
// the server auth before hook.
// https://docs.creem.io/code/sdks/better-auth/client
export const disabledCreemPaths = [
  "/creem/cancel-subscription",
  "/creem/retrieve-subscription",
  "/creem/search-transactions",
];

export const isAllowedCreemProductId = (
  productId: unknown,
  productIds?: readonly string[],
): boolean =>
  typeof productId === "string" && productIds?.includes(productId) === true;

type CreemSettingsInput = Readonly<{
  apiKey: string | undefined;
  webhookSecret: string | undefined;
  testMode: boolean | undefined;
  baseURL: string;
}>;

export const getCreemSettings = ({
  apiKey,
  webhookSecret,
  testMode,
  baseURL,
}: CreemSettingsInput): CreemKeys | undefined =>
  apiKey === undefined || webhookSecret === undefined
    ? undefined
    : {
        apiKey,
        webhookSecret,
        testMode,
        defaultSuccessUrl: new URL(
          "/settings/billing?checkout=success",
          baseURL,
        ).toString(),
      };

export const getCreemProductIds = (
  ...productIds: (string | undefined)[]
): readonly string[] =>
  productIds.filter(
    (productId): productId is string => productId !== undefined,
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createCreemBeforeHook = (productIds: readonly string[]) =>
  createAuthMiddleware(async (ctx) => {
    if (ctx.path === "/creem/create-checkout") {
      const session = await getSessionFromCtx(ctx);
      if (session === null) {
        throw new APIError("UNAUTHORIZED", {
          message: "Sign in to start a subscription.",
        });
      }

      const body = isRecord(ctx.body) ? ctx.body : {};
      if (!isAllowedCreemProductId(body.productId, productIds)) {
        throw new APIError("BAD_REQUEST", {
          message: "Choose an available billing plan.",
        });
      }
      if (
        body.customer !== undefined ||
        body.metadata !== undefined ||
        body.successUrl !== undefined
      ) {
        throw new APIError("BAD_REQUEST", {
          message: "Checkout details are managed by Grabbin.",
        });
      }
    } else if (ctx.path === "/creem/create-portal") {
      const body = isRecord(ctx.body) ? ctx.body : {};
      if (body.customerId !== undefined) {
        throw new APIError("BAD_REQUEST", {
          message: "The billing account is selected from your session.",
        });
      }
    }
  });
