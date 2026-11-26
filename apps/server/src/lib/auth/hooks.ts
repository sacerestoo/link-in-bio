import "server-only";
import type { Database } from "@grabbin/db";
import {
  createPageForUser,
  hasPageForUser,
  isPageHandleAvailable,
  PageError,
} from "@grabbin/db/repositories/page";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
} from "@grabbin/domain/page";
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
import * as v from "valibot";
import type { ServerEnv } from "../env";

const ensureHandleAvailable = async (
  database: Database,
  rawHandle: unknown,
): Promise<Handle> => {
  const result = v.safeParse(handleSchema, rawHandle);
  if (!result.success)
    throw new PageError(
      "invalid-handle",
      result.issues.map((issue) => issue.message).join(" "),
    );

  if (!(await isPageHandleAvailable(database, result.output)))
    throw new PageError("handle-unavailable", HANDLE_UNAVAILABLE_MESSAGE);
  return result.output;
};

const withPageErrors = async <T>(onAction: () => Promise<T>): Promise<T> => {
  try {
    return await onAction();
  } catch (error) {
    if (error instanceof PageError)
      throw new APIError("BAD_REQUEST", { message: error.message });
    throw error;
  }
};

export const createDatabaseHooks = (
  database: Database,
): NonNullable<BetterAuthOptions["databaseHooks"]> => {
  return {
    user: {
      create: {
        before: async (user, context) => {
          const rawHandle =
            context?.path === "/sign-in/email-otp"
              ? user.name
              : (await getOAuthState<{ handle?: unknown }>())?.handle;
          await withPageErrors(() =>
            ensureHandleAvailable(database, rawHandle),
          );
        },
      },
    },
  };
};

export const createAuthHooks = (settings: ServerEnv, database: Database) => {
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
        const created = await withPageErrors(async () => {
          if (await hasPageForUser(database, userId)) return false;
          const handle = await ensureHandleAvailable(database, rawHandle);
          return createPageForUser(database, userId, handle);
        });

        if (created) {
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
