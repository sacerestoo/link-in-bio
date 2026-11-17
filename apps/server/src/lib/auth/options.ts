import "server-only";
import type { Database } from "@grabbin/db";
import type { BetterAuthOptions } from "better-auth";
import type { ServerEnv } from "../env";
import { createCoreAuthOptions } from "./core-options";
import { createUserOptions } from "./email";
import { createAuthHooks, createDatabaseHooks } from "./hooks";
import { createAuthPlugins } from "./plugins";
import { createSocialProviders } from "./providers";
import { createSubscriptionOptions } from "./subscription";

export const createAuthOptions = (settings: ServerEnv, database: Database) => {
  const subscription = createSubscriptionOptions(settings);

  return {
    ...createCoreAuthOptions(settings, database),
    user: createUserOptions(settings),
    account: { accountLinking: { enabled: true, trustedProviders: ["line"] } },
    databaseHooks: createDatabaseHooks(database),
    hooks: createAuthHooks(settings, database),
    socialProviders: createSocialProviders(settings),
    disabledPaths: subscription.disabledPaths,
    plugins: createAuthPlugins(settings, subscription.creem),
  } satisfies BetterAuthOptions;
};
