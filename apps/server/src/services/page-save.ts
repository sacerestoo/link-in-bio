import "server-only";
import type { Database } from "@grabbin/db";
import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import type {
  PageResponse,
  PageSaveRequest,
} from "@grabbin/shared/schemas/page";
import { bentoItems } from "@grabbin/db/schema/bento-items";
import { pages } from "@grabbin/db/schema/pages";
import { and, asc, eq as equal } from "drizzle-orm";
import type { BentoBatchPolicyError } from "../lib/bento-batch-policy";
import { BentoService } from "./bento.service";

export const PAGE_SAVE_STATUS = {
  notFound: "not-found",
  updated: "updated",
  invalidBentoBatch: "invalid-bento-batch",
} as const;

type PageInfo = Omit<PageResponse, "isOwner"> & {
  userId: string;
};

export type SavePageForUserResult =
  | { status: typeof PAGE_SAVE_STATUS.notFound }
  | {
      status: typeof PAGE_SAVE_STATUS.invalidBentoBatch;
      reason: BentoBatchPolicyError;
    }
  | { status: typeof PAGE_SAVE_STATUS.updated; data: PageInfo };

export function savePage(
  database: Database,
  userId: string,
  handle: string,
  save: PageSaveRequest,
): Promise<SavePageForUserResult> {
  return database.transaction(async (transaction) => {
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
      .where(and(equal(pages.userId, userId), equal(pages.handle, handle)))
      .limit(1)
      .for("update");

    if (page === undefined) return { status: PAGE_SAVE_STATUS.notFound };

    const persistedItems: BentoItem[] = await transaction
      .select({
        id: bentoItems.id,
        type: bentoItems.type,
        data: bentoItems.data,
        style: bentoItems.style,
        layouts: bentoItems.layouts,
      })
      .from(bentoItems)
      .where(equal(bentoItems.pageId, page.id))
      .orderBy(asc(bentoItems.createdAt), asc(bentoItems.id));

    let savedItems: readonly BentoItem[] = persistedItems;
    if (save.bento !== undefined) {
      const bentoResult = await new BentoService(transaction).save(
        page.id,
        persistedItems,
        save.bento,
      );
      if (bentoResult.status === "invalid")
        return {
          status: PAGE_SAVE_STATUS.invalidBentoBatch,
          reason: bentoResult.reason,
        };

      savedItems = bentoResult.items;
    }

    let updatedPage = page;
    if (save.page !== undefined) {
      const [pageAfterUpdate] = await transaction
        .update(pages)
        .set(save.page)
        .where(
          and(
            equal(pages.id, page.id),
            equal(pages.userId, userId),
            equal(pages.handle, handle),
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
      status: PAGE_SAVE_STATUS.updated,
      data: {
        userId: updatedPage.userId,
        handle: updatedPage.handle,
        name: updatedPage.name,
        bio: updatedPage.bio,
        imageKey: updatedPage.imageKey,
        imageCrop: updatedPage.imageCrop,
        bento: [...savedItems],
      },
    };
  });
}
