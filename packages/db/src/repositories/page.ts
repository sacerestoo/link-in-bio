import type {
  BentoBatchRequest,
  BentoItem,
} from "@grabbin/shared/schemas/bento-item";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  type PageSaveRequest,
} from "@grabbin/domain/page";
import { and, eq, type InferSelectModel } from "drizzle-orm";
import type { Database, Executor } from "../client";
import { bentoItems } from "../schema/bento-items";
import { pages } from "../schema/pages";

type PageRecord = InferSelectModel<typeof pages>;
type PageProfileInfo = Pick<
  PageRecord,
  "userId" | "handle" | "name" | "bio" | "imageKey" | "imageCrop"
>;
type PageInfo = PageProfileInfo & { bento: BentoItem[] };

export type PageViolation =
  | "not-found"
  | "invalid-handle"
  | "handle-unavailable"
  | "handle-conflict"
  | "invalid-bento-batch"
  | "image-required";

export class PageError extends Error {
  constructor(
    readonly violation: PageViolation,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "PageError";
  }
}

type SaveBentoBatch = (
  executor: Executor,
  pageId: string,
  batch: BentoBatchRequest | undefined,
) => Promise<readonly BentoItem[]>;

const isPostgresUniqueViolation = (
  error: unknown,
  constraint: string,
): boolean =>
  error instanceof Error &&
  "code" in error &&
  error.code === "23505" &&
  "constraint" in error &&
  error.constraint === constraint;

export const isPageHandleAvailable = async (
  database: Database,
  handle: string,
): Promise<boolean> => {
  const page = await database.query.pages.findFirst({
    columns: { id: true },
    where: (row, { eq: equals }) => equals(row.handle, handle),
  });
  return page === undefined;
};

export const hasPageForUser = async (
  database: Database,
  userId: string,
): Promise<boolean> => {
  const page = await database.query.pages.findFirst({
    columns: { id: true },
    where: (row, { eq: equals }) => equals(row.userId, userId),
  });
  return page !== undefined;
};

export const findOwnedPageId = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<string | undefined> => {
  const page = await database.query.pages.findFirst({
    columns: { id: true },
    where: (row, operators) =>
      and(operators.eq(row.userId, userId), operators.eq(row.handle, handle)),
  });
  return page?.id;
};

export const hasOwnedPage = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<boolean> => {
  const page = await database.query.pages.findFirst({
    columns: { id: true },
    where: (row, operators) =>
      and(operators.eq(row.userId, userId), operators.eq(row.handle, handle)),
  });
  return page !== undefined;
};

export const findPageInfoByUserId = (
  database: Database,
  userId: string,
): Promise<PageProfileInfo | undefined> =>
  database.query.pages.findFirst({
    columns: {
      userId: true,
      handle: true,
      name: true,
      bio: true,
      imageKey: true,
      imageCrop: true,
    },
    where: (page, { eq: equals }) => equals(page.userId, userId),
  });

export const findPageInfoByHandle = async (
  database: Database,
  handle: string,
): Promise<PageInfo | undefined> => {
  const rows = await database
    .select({
      page: {
        userId: pages.userId,
        handle: pages.handle,
        name: pages.name,
        bio: pages.bio,
        imageKey: pages.imageKey,
        imageCrop: pages.imageCrop,
      },
      bento: {
        id: bentoItems.id,
        type: bentoItems.type,
        data: bentoItems.data,
        style: bentoItems.style,
        layouts: bentoItems.layouts,
      },
    })
    .from(pages)
    .leftJoin(bentoItems, eq(bentoItems.pageId, pages.id))
    .where(eq(pages.handle, handle));

  const firstRow = rows[0];
  if (firstRow === undefined) return undefined;

  return {
    ...firstRow.page,
    bento: rows.flatMap((row) => (row.bento === null ? [] : [row.bento])),
  };
};

export const findOwnedPageImageKey = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<string | null | undefined> => {
  const page = await database.query.pages.findFirst({
    columns: { imageKey: true },
    where: (row, operators) =>
      and(operators.eq(row.userId, userId), operators.eq(row.handle, handle)),
  });
  return page?.imageKey;
};

export const createPageForUser = async (
  database: Database,
  userId: string,
  handle: string,
): Promise<boolean> => {
  try {
    const [page] = await database
      .insert(pages)
      .values({ id: crypto.randomUUID(), userId, handle })
      .onConflictDoNothing({ target: pages.userId })
      .returning({ id: pages.id });
    return page !== undefined;
  } catch (error) {
    if (isPostgresUniqueViolation(error, "pages_handle_idx"))
      throw new PageError("handle-unavailable", HANDLE_UNAVAILABLE_MESSAGE);
    throw error;
  }
};

export const savePageForUser = async (
  database: Database,
  userId: string,
  handle: string,
  save: PageSaveRequest,
  onSaveBentoBatch: SaveBentoBatch,
): Promise<PageInfo> => {
  try {
    return await database.transaction(async (transaction) => {
      const [page] = await transaction
        .select({
          id: pages.id,
          userId: pages.userId,
          handle: pages.handle,
          name: pages.name,
          bio: pages.bio,
          imageKey: pages.imageKey,
          imageCrop: pages.imageCrop,
        })
        .from(pages)
        .where(and(eq(pages.userId, userId), eq(pages.handle, handle)))
        .limit(1)
        .for("update");

      if (page === undefined)
        throw new PageError("not-found", "Page not found");

      const savedItems = await onSaveBentoBatch(
        transaction,
        page.id,
        save.bento,
      );

      let updatedPage = page;
      if (save.page !== undefined) {
        const [pageAfterUpdate] = await transaction
          .update(pages)
          .set(save.page)
          .where(
            and(
              eq(pages.id, page.id),
              eq(pages.userId, userId),
              eq(pages.handle, handle),
            ),
          )
          .returning({
            id: pages.id,
            userId: pages.userId,
            handle: pages.handle,
            name: pages.name,
            bio: pages.bio,
            imageKey: pages.imageKey,
            imageCrop: pages.imageCrop,
          });

        if (pageAfterUpdate === undefined)
          throw new Error("Page disappeared during save.");

        updatedPage = pageAfterUpdate;
      }

      return {
        userId: updatedPage.userId,
        handle: updatedPage.handle,
        name: updatedPage.name,
        bio: updatedPage.bio,
        imageKey: updatedPage.imageKey,
        imageCrop: updatedPage.imageCrop,
        bento: [...savedItems],
      };
    });
  } catch (error) {
    if (isPostgresUniqueViolation(error, "pages_handle_idx"))
      throw new PageError("handle-conflict", HANDLE_UNAVAILABLE_MESSAGE);
    throw error;
  }
};
