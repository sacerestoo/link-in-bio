import "server-only";
import { creemPlugin, type CreemKeys } from "@grabbin/subscription/creem";
import { createBillingSessionPlugin } from "@grabbin/subscription/subscription-session";
import type { ServerEnv } from "./env";
import { createEmailOtpPlugin } from "./email";
import { createLineOAuthPlugins } from "./providers";

export const createAuthPlugins = (
  settings: ServerEnv,
  creem: CreemKeys | undefined,
) => [
  ...(creem === undefined ? [] : [creemPlugin(creem)]),
  createEmailOtpPlugin(settings),
  ...createLineOAuthPlugins(settings),
  createBillingSessionPlugin(creem !== undefined),
];
