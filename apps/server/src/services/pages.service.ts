import "server-only";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import * as v from "valibot";
import {
  PAGE_REPOSITORY_STATUS,
  type PagesRepository,
} from "../repositories/pages.repository";

export const PAGE_SERVICE_STATUS = {
  available: "available",
  invalidHandle: "invalid-handle",
  handleUnavailable: "handle-unavailable",
  complete: "complete",
  notFound: "not-found",
  handleConflict: "handle-conflict",
  updated: "updated",
} as const;

export type HandleAvailabilityResult =
  | { status: typeof PAGE_SERVICE_STATUS.available; handle: Handle }
  | { status: typeof PAGE_SERVICE_STATUS.invalidHandle; message: string }
  | {
      status: typeof PAGE_SERVICE_STATUS.handleUnavailable;
      message: string;
    };

export type EnsurePageForUserResult =
  | { status: typeof PAGE_SERVICE_STATUS.complete }
  | Exclude<
      HandleAvailabilityResult,
      { status: typeof PAGE_SERVICE_STATUS.available }
    >;

export class PagesService {
  constructor(private readonly pagesRepository: PagesRepository) {}

  isPageHandleAvailable(handle: string): Promise<boolean> {
    return this.pagesRepository.isHandleAvailable(handle);
  }

  findPageHandleForUser(userId: string): Promise<string | undefined> {
    return this.pagesRepository.findByUserId(userId);
  }

  findPageByHandle(handle: string) {
    return this.pagesRepository.findByHandle(handle);
  }

  async updatePageForUser(
    userId: string,
    currentHandle: string,
    update: PageUpdate,
  ) {
    const page = await this.pagesRepository.updateForUser(
      userId,
      currentHandle,
      update,
    );

    if (page === undefined) return { status: PAGE_SERVICE_STATUS.notFound };
    if (
      "status" in page &&
      page.status === PAGE_REPOSITORY_STATUS.uniqueConflict
    )
      return { status: PAGE_SERVICE_STATUS.handleConflict };
    return { status: PAGE_SERVICE_STATUS.updated, data: page };
  }

  async ensurePageForUser(
    userId: string,
    rawHandle: unknown,
  ): Promise<EnsurePageForUserResult> {
    if (await this.pagesRepository.hasPageForUser(userId))
      return { status: PAGE_SERVICE_STATUS.complete };

    const handleResult = await this.checkHandleAvailability(rawHandle);
    if (handleResult.status !== PAGE_SERVICE_STATUS.available)
      return handleResult;

    const creationResult = await this.pagesRepository.createForUser(
      userId,
      handleResult.handle,
    );
    if (creationResult?.status === PAGE_REPOSITORY_STATUS.uniqueConflict)
      return {
        status: PAGE_SERVICE_STATUS.handleUnavailable,
        message: HANDLE_UNAVAILABLE_MESSAGE,
      };

    return { status: PAGE_SERVICE_STATUS.complete };
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

    const available = await this.pagesRepository.isHandleAvailable(
      handleResult.output,
    );
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
