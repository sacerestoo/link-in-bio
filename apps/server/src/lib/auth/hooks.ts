import "server-only";
import type { Database } from "@grabbin/db";
import type { BetterAuthOptions } from "better-auth";
import {
  createCreemBeforeHook,
  getCreemProductIds,
} from "@grabbin/subscription/creem";
import { APIError, createAuthMiddleware, getOAuthState } from "better-auth/api";
import type { ServerEnv } from "../env";
import { PagesRepository } from "../../repositories/pages.repository";
import {
  PagesService,
  PAGE_SERVICE_STATUS,
  type EnsurePageForUserResult,
  type HandleAvailabilityResult,
} from "../../services/pages.service";

const throwIfPageOperationFailed = (
  result: EnsurePageForUserResult | HandleAvailabilityResult,
) => {
  if (
    result.status === PAGE_SERVICE_STATUS.invalidHandle ||
    result.status === PAGE_SERVICE_STATUS.handleUnavailable
  )
    throw new APIError("BAD_REQUEST", { message: result.message });
};

export const createDatabaseHooks = (
  database: Database,
): NonNullable<BetterAuthOptions["databaseHooks"]> => {
  const pagesService = new PagesService(new PagesRepository(database));

  return {
    user: {
      create: {
        before: async (user, context) => {
          const rawHandle =
            context?.path === "/sign-in/email-otp"
              ? user.name
              : (await getOAuthState<{ handle?: unknown }>())?.handle;
          const result = await pagesService.ensureHandleAvailable(rawHandle);
          throwIfPageOperationFailed(result);
        },
      },
    },
  };
};

export const createAuthHooks = (settings: ServerEnv, database: Database) => {
  const pagesService = new PagesService(new PagesRepository(database));

  return {
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
          const result = await pagesService.ensurePageForUser(
            session.user.id,
            oauthState.handle,
          );
          throwIfPageOperationFailed(result);
        }
      } else if (ctx.path === "/sign-in/email-otp") {
        const result = await pagesService.ensurePageForUser(
          session.user.id,
          session.user.name,
        );
        throwIfPageOperationFailed(result);
      }
    }),
  };
};
