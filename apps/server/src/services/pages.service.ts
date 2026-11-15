import "server-only";
import type { Database } from "@grabbin/db";
import { pages } from "@grabbin/db/schema/pages";
import {
  availableUsernameSchema,
  usernameSchema,
  type Username,
} from "@grabbin/shared/schemas/profile";
import { APIError, getOAuthState } from "better-auth/api";
import * as v from "valibot";

export const isPageHandleAvailable = async (
  database: Database,
  handle: string,
): Promise<boolean> => {
  const matchingPage = await database.query.pages.findFirst({
    columns: { id: true },
    where: (page, { eq }) => eq(page.handle, handle),
  });

  return matchingPage === undefined;
};

export const createPageForUser = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<void> => {
  await database
    .insert(pages)
    .values({ id: crypto.randomUUID(), userId, handle })
    .onConflictDoNothing({ target: pages.userId });
};

export const ensurePageForUser = async (
  database: Database,
  userId: string,
  rawHandle: unknown,
): Promise<void> => {
  const existingPage = await database.query.pages.findFirst({
    columns: { id: true },
    where: (page, { eq }) => eq(page.userId, userId),
  });
  if (existingPage !== undefined) return;

  const handleResult = v.safeParse(usernameSchema, rawHandle);
  if (!handleResult.success) {
    throw new APIError("BAD_REQUEST", {
      message: handleResult.issues.map((issue) => issue.message).join(" "),
    });
  }

  const availableHandleResult = v.safeParse(
    availableUsernameSchema(
      await isPageHandleAvailable(database, handleResult.output),
    ),
    handleResult.output,
  );
  if (!availableHandleResult.success) {
    throw new APIError("BAD_REQUEST", {
      message: availableHandleResult.issues
        .map((issue) => issue.message)
        .join(" "),
    });
  }

  await createPageForUser(database, userId, availableHandleResult.output);
};

export const readSignupHandle = async (): Promise<Username> => {
  const oauthState = await getOAuthState<{ handle?: unknown }>();
  const result = v.safeParse(usernameSchema, oauthState?.handle);
  if (!result.success) {
    throw new APIError("BAD_REQUEST", {
      message: result.issues.map((issue) => issue.message).join(" "),
    });
  }
  return result.output;
};

export const ensureHandleAvailable = async (
  database: Database,
): Promise<Username> => {
  const handle = await readSignupHandle();
  const result = v.safeParse(
    availableUsernameSchema(await isPageHandleAvailable(database, handle)),
    handle,
  );
  if (!result.success) {
    throw new APIError("BAD_REQUEST", {
      message: result.issues.map((issue) => issue.message).join(" "),
    });
  }
  return result.output;
};
