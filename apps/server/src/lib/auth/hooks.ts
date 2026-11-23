import "server-only";
import type { Database } from "@grabbin/db";
import {
  PAGE_CREATED_COOKIE_MAX_AGE_SECONDS,
  PAGE_CREATED_COOKIE_NAME,
  PAGE_CREATED_COOKIE_VALUE,
} from "@grabbin/shared/lib/page-created-event";
import {
  createCreemBeforeHook,
  getCreemProductIds,
} from "@grabbin/subscription/creem";
import { getProtocolFromSource, type BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getOAuthState } from "better-auth/api";
import type { ServerEnv } from "../env";
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
  const pagesService = new PagesService(database);

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
  const pagesService = new PagesService(database);

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

      const ensurePage = async (
        userId: string,
        rawHandle: unknown,
      ): Promise<void> => {
        const result = await pagesService.ensurePageForUser(userId, rawHandle);
        throwIfPageOperationFailed(result);

        if (result.status === PAGE_SERVICE_STATUS.created) {
          const baseURL = ctx.context.options.baseURL;
          const baseURLProtocol =
            typeof baseURL === "string"
              ? new URL(baseURL).protocol === "https:"
                ? "https"
                : "http"
              : (baseURL?.protocol ?? "auto");
          ctx.setCookie(PAGE_CREATED_COOKIE_NAME, PAGE_CREATED_COOKIE_VALUE, {
            httpOnly: false,
            maxAge: PAGE_CREATED_COOKIE_MAX_AGE_SECONDS,
            path: "/",
            sameSite: "lax",
            secure:
              ctx.context.options.advanced?.useSecureCookies ??
              getProtocolFromSource(
                ctx.headers ?? new Headers(),
                baseURLProtocol,
                ctx.context.options.advanced?.trustedProxyHeaders,
              ) === "https",
          });
        }
      };

      if (ctx.path === "/callback/:id") {
        const oauthState = await getOAuthState<{ handle?: unknown }>();
        if (oauthState?.handle !== undefined) {
          await ensurePage(session.user.id, oauthState.handle);
        }
      } else if (ctx.path === "/sign-in/email-otp") {
        await ensurePage(session.user.id, session.user.name);
      }
    }),
  };
};
