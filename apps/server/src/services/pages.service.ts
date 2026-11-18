import "server-only";
import type { Database } from "@grabbin/db";
import { pages } from "@grabbin/db/schema/pages";
import {
  availableHandleSchema,
  handleSchema,
  type Handle,
} from "@grabbin/shared/schemas/page";
import { APIError, getOAuthState } from "better-auth/api";
import { eq as equal } from "drizzle-orm";
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

export const findPageHandleForUser = async (
  database: Database,
  userId: string,
): Promise<string | undefined> => {
  const page = await database.query.pages.findFirst({
    columns: { handle: true },
    where: (pageRow, { eq }) => eq(pageRow.userId, userId),
  });

  return page?.handle;
};

export const findPageByHandle = (database: Database, handle: string) =>
  database.query.pages.findFirst({
    columns: {
      userId: true,
      handle: true,
      name: true,
      bio: true,
      imageKey: true,
    },
    where: (pageRow, { eq }) => eq(pageRow.handle, handle),
  });

export const updatePageHandleForUser = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<string | undefined> => {
  const [page] = await database
    .update(pages)
    .set({ handle })
    .where(equal(pages.userId, userId))
    .returning({ handle: pages.handle });

  return page?.handle;
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

  const handleResult = v.safeParse(handleSchema, rawHandle);
  if (!handleResult.success) {
    throw new APIError("BAD_REQUEST", {
      message: handleResult.issues.map((issue) => issue.message).join(" "),
    });
  }

  const availableHandleResult = v.safeParse(
    availableHandleSchema(
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

export const readSignupHandle = async (): Promise<Handle> => {
  const oauthState = await getOAuthState<{ handle?: unknown }>();
  const result = v.safeParse(handleSchema, oauthState?.handle);
  if (!result.success) {
    throw new APIError("BAD_REQUEST", {
      message: result.issues.map((issue) => issue.message).join(" "),
    });
  }
  return result.output;
};

export const ensureHandleAvailable = async (
  database: Database,
  rawHandle?: unknown,
): Promise<Handle> => {
  const parsedHandle = v.safeParse(
    handleSchema,
    rawHandle === undefined ? await readSignupHandle() : rawHandle,
  );
  if (!parsedHandle.success) {
    throw new APIError("BAD_REQUEST", {
      message: parsedHandle.issues.map((issue) => issue.message).join(" "),
    });
  }

  const handle = parsedHandle.output;
  const result = v.safeParse(
    availableHandleSchema(await isPageHandleAvailable(database, handle)),
    handle,
  );
  if (!result.success) {
    throw new APIError("BAD_REQUEST", {
      message: result.issues.map((issue) => issue.message).join(" "),
    });
  }
  return result.output;
};
