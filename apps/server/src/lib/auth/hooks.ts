import "server-only";
import type { Database } from "@grabbin/db";
import type { BetterAuthOptions } from "better-auth";
import {
  createCreemBeforeHook,
  getCreemProductIds,
} from "@grabbin/subscription/creem";
import { createAuthMiddleware, getOAuthState } from "better-auth/api";
import type { ServerEnv } from "../env";
import {
  ensureHandleAvailable,
  ensurePageForUser,
} from "../../services/pages.service";

export const createDatabaseHooks = (
  database: Database,
): NonNullable<BetterAuthOptions["databaseHooks"]> => ({
  user: {
    create: {
      before: async (user, context) => {
        if (context?.path === "/sign-in/email-otp") {
          await ensureHandleAvailable(database, user.name);
        } else {
          await ensureHandleAvailable(database);
        }
      },
    },
  },
});

export const createAuthHooks = (settings: ServerEnv, database: Database) => ({
  before: createCreemBeforeHook(
    getCreemProductIds(
      settings.CREEM_PRO_MONTHLY_PRODUCT_ID,
      settings.CREEM_PRO_YEARLY_PRODUCT_ID,
    ),
  ),
  after: createAuthMiddleware(async (ctx) => {
    const session = ctx.context.newSession;
    if (!session) return;

    if (ctx.path === "/callback/:id") {
      const oauthState = await getOAuthState<{ handle?: unknown }>();
      if (oauthState?.handle !== undefined) {
        await ensurePageForUser(database, session.user.id, oauthState.handle);
      }
    } else if (ctx.path === "/sign-in/email-otp") {
      await ensurePageForUser(database, session.user.id, session.user.name);
    }
  }),
});
