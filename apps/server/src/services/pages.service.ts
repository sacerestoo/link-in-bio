import "server-only";
import type { Database } from "@grabbin/db";
import { bentoItems } from "@grabbin/db/schema/bento-items";
import { pages } from "@grabbin/db/schema/pages";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
  type PageResponse,
  type PageSaveRequest,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { and, eq as equal } from "drizzle-orm";
import * as v from "valibot";
import { isPostgresUniqueViolation } from "../lib/postgres-error";
import { shouldResetImageCrop } from "../lib/profile-images";
import {
  PAGE_SAVE_STATUS,
  savePage,
  type SavePageForUserResult,
} from "./page-save";

export const PAGE_SERVICE_STATUS = {
  ...PAGE_SAVE_STATUS,
  available: "available",
  invalidHandle: "invalid-handle",
  handleUnavailable: "handle-unavailable",
  created: "created",
  alreadyExists: "already-exists",
  handleConflict: "handle-conflict",
  imageUpdateReady: "image-update-ready",
  imageRequired: "image-required",
} as const;

export type HandleAvailabilityResult =
  | { status: typeof PAGE_SERVICE_STATUS.available; handle: Handle }
  | { status: typeof PAGE_SERVICE_STATUS.invalidHandle; message: string }
  | {
      status: typeof PAGE_SERVICE_STATUS.handleUnavailable;
      message: string;
    };

export type EnsurePageForUserResult =
  | {
      status:
        | typeof PAGE_SERVICE_STATUS.created
        | typeof PAGE_SERVICE_STATUS.alreadyExists;
    }
  | Exclude<
      HandleAvailabilityResult,
      { status: typeof PAGE_SERVICE_STATUS.available }
    >;

type PageProfileInfo = Omit<PageResponse, "isOwner" | "bento"> & {
  userId: string;
};
type PageInfo = Omit<PageResponse, "isOwner"> & {
  userId: string;
};
type PageInfoLookup = { handle: string } | { userId: string };

export class PagesService {
  constructor(private readonly database: Database) {}

  savePageForUser(
    userId: string,
    handle: string,
    save: PageSaveRequest,
  ): Promise<SavePageForUserResult> {
    return savePage(this.database, userId, handle, save);
  }

  async isPageHandleAvailable(handle: string): Promise<boolean> {
    const matchingPage = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (page, { eq }) => eq(page.handle, handle),
    });

    return matchingPage === undefined;
  }

  async findOwnedPageId(
    userId: string,
    handle: string,
  ): Promise<string | undefined> {
    const matchingPage = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (page, { eq: equals }) =>
        and(equals(page.userId, userId), equals(page.handle, handle)),
    });

    return matchingPage?.id;
  }

  findPageInfo(lookup: { handle: string }): Promise<PageInfo | undefined>;
  findPageInfo(lookup: {
    userId: string;
  }): Promise<PageProfileInfo | undefined>;
  async findPageInfo(
    lookup: PageInfoLookup,
  ): Promise<PageInfo | PageProfileInfo | undefined> {
    if ("userId" in lookup)
      return this.database.query.pages.findFirst({
        columns: {
          userId: true,
          handle: true,
          name: true,
          bio: true,
          imageKey: true,
          imageCrop: true,
        },
        where: (page, { eq }) => eq(page.userId, lookup.userId),
      });

    const rows = await this.database
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
      .leftJoin(bentoItems, equal(bentoItems.pageId, pages.id))
      .where(equal(pages.handle, lookup.handle));
    const firstRow = rows[0];
    if (firstRow === undefined) return undefined;

    const { userId, ...page } = firstRow.page;
    return {
      ...page,
      userId,
      bento: rows.flatMap((row) => (row.bento === null ? [] : [row.bento])),
    };
  }

  async getPageBeforeImageUpdate(
    userId: string,
    handle: string,
    update: PageUpdate,
  ) {
    if (update.imageKey === undefined && update.imageCrop === undefined)
      return {
        status: PAGE_SERVICE_STATUS.imageUpdateReady,
        page: null,
      } as const;

    const page = await this.findPageInfo({ handle });
    if (page === undefined || page.userId !== userId)
      return { status: PAGE_SERVICE_STATUS.notFound } as const;

    const nextImageKey =
      update.imageKey === undefined ? page.imageKey : update.imageKey;
    if (
      update.imageCrop !== undefined &&
      update.imageCrop !== null &&
      (nextImageKey === null || nextImageKey === undefined)
    )
      return { status: PAGE_SERVICE_STATUS.imageRequired } as const;

    return {
      status: PAGE_SERVICE_STATUS.imageUpdateReady,
      page: { imageKey: page.imageKey },
    } as const;
  }

  async updatePageForUser(
    userId: string,
    currentHandle: string,
    update: PageUpdate,
  ) {
    try {
      const values = shouldResetImageCrop(update)
        ? { ...update, imageCrop: null }
        : update;

      const [page] = await this.database
        .update(pages)
        .set(values)
        .where(
          and(equal(pages.userId, userId), equal(pages.handle, currentHandle)),
        )
        .returning({
          handle: pages.handle,
          name: pages.name,
          bio: pages.bio,
        });

      return page === undefined
        ? { status: PAGE_SERVICE_STATUS.notFound }
        : { status: PAGE_SERVICE_STATUS.updated, data: page };
    } catch (error) {
      if (isPostgresUniqueViolation(error, "pages_handle_idx"))
        return { status: PAGE_SERVICE_STATUS.handleConflict };
      throw error;
    }
  }

  async ensurePageForUser(
    userId: string,
    rawHandle: unknown,
  ): Promise<EnsurePageForUserResult> {
    const existingPage = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (page, { eq }) => eq(page.userId, userId),
    });
    if (existingPage !== undefined)
      return { status: PAGE_SERVICE_STATUS.alreadyExists };

    const handleResult = await this.checkHandleAvailability(rawHandle);
    if (handleResult.status !== PAGE_SERVICE_STATUS.available)
      return handleResult;

    try {
      const [createdPage] = await this.database
        .insert(pages)
        .values({
          id: crypto.randomUUID(),
          userId,
          handle: handleResult.handle,
        })
        .onConflictDoNothing({ target: pages.userId })
        .returning({ id: pages.id });

      return createdPage === undefined
        ? { status: PAGE_SERVICE_STATUS.alreadyExists }
        : { status: PAGE_SERVICE_STATUS.created };
    } catch (error) {
      if (isPostgresUniqueViolation(error, "pages_handle_idx"))
        return {
          status: PAGE_SERVICE_STATUS.handleUnavailable,
          message: HANDLE_UNAVAILABLE_MESSAGE,
        };
      throw error;
    }
  }

  ensureHandleAvailable(rawHandle: unknown): Promise<HandleAvailabilityResult> {
    return this.checkHandleAvailability(rawHandle);
  }

  private async checkHandleAvailability(
    rawHandle: unknown,
  ): Promise<HandleAvailabilityResult> {
    const handleResult = v.safeParse(handleSchema, rawHandle);
    if (!handleResult.success)
      return {
        status: PAGE_SERVICE_STATUS.invalidHandle,
        message: handleResult.issues.map((issue) => issue.message).join(" "),
      };

    const available = await this.isPageHandleAvailable(handleResult.output);
    return available
      ? {
          status: PAGE_SERVICE_STATUS.available,
          handle: handleResult.output,
        }
      : {
          status: PAGE_SERVICE_STATUS.handleUnavailable,
          message: HANDLE_UNAVAILABLE_MESSAGE,
        };
  }
}
