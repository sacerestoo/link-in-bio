import "server-only";
import type { Database } from "@grabbin/db";
import { pages } from "@grabbin/db/schema/pages";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
  type PageSnapshotResponse,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { and, eq as equal } from "drizzle-orm";
import * as v from "valibot";
import { isPostgresUniqueViolation } from "../lib/postgres-error";
import { shouldResetImageCrop } from "../lib/profile-images";
import {
  findPageSnapshotRows,
  type PageSnapshotLookup,
} from "./bento.repository";

export const PAGE_SERVICE_STATUS = {
  available: "available",
  invalidHandle: "invalid-handle",
  handleUnavailable: "handle-unavailable",
  created: "created",
  alreadyExists: "already-exists",
  notFound: "not-found",
  handleConflict: "handle-conflict",
  updated: "updated",
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

type PageInfo = PageSnapshotResponse & { userId: string };

export class PagesService {
  constructor(private readonly database: Database) {}

  async isPageHandleAvailable(handle: string): Promise<boolean> {
    const matchingPage = await this.database.query.pages.findFirst({
      columns: { id: true },
      where: (page, { eq }) => eq(page.handle, handle),
    });

    return matchingPage === undefined;
  }

  async findPageInfo(
    lookup: PageSnapshotLookup,
    currentUserId?: string,
  ): Promise<PageInfo | undefined> {
    const rows = await findPageSnapshotRows(this.database, lookup);
    const firstRow = rows[0];
    if (firstRow === undefined) return undefined;

    const { userId: ownerId, ...page } = firstRow.page;
    return {
      ...page,
      userId: ownerId,
      isOwner: ownerId === currentUserId,
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

    const page = await this.findPageInfo({ handle }, userId);
    if (page?.isOwner !== true)
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
