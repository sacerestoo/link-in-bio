import "server-only";
import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import { createDatabase } from "@grabbin/db";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  pageProfileResponseSchema,
  pageResponseSchema,
  pageSaveRequestSchema,
  profileImageUploadSchema,
  pageUpdateSchema,
  type PageSaveRequest,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import { BentoItemPageConflictError } from "../lib/bento-item-page-conflict-error";
import { BentoMediaError } from "../lib/bento-media-error";
import {
  createProfileImageUpload,
  deleteProfileImageObject,
  ensureProfileImageIsValid,
  isProfileImageKeyOwnedByUser,
} from "../lib/profile-images";
import {
  optionalSession,
  requireSession,
} from "../middleware/session.middleware";
import { BentoMediaService } from "../services/bento-media.service";
import { PagesService, PAGE_SERVICE_STATUS } from "../services/pages.service";
import { bentoMediaRoute } from "./bento-media.route";

const createPagesService = (connectionString: string) =>
  new PagesService(createDatabase(connectionString));

const pagePatchRequestSchema = v.union([
  pageSaveRequestSchema,
  pageUpdateSchema,
]);

const isPageSaveRequest = (
  request: PageSaveRequest | PageUpdate,
): request is PageSaveRequest => "page" in request || "bento" in request;

const assertBentoMediaBatchIsReady = async (
  pagesService: PagesService,
  mediaService: BentoMediaService,
  userId: string,
  handle: string,
  items: readonly BentoItem[],
): Promise<void> => {
  if (!items.some((item) => item.type === "media")) return;
  const pageId = await pagesService.findOwnedPageId(userId, handle);
  if (pageId === undefined)
    throw new HTTPException(404, { message: "Page not found" });

  try {
    await mediaService.assertBatchMediaUploaded(pageId, items);
  } catch (error) {
    if (error instanceof BentoMediaError)
      throw new HTTPException(error.status, { message: error.message });
    throw error;
  }
};

export const pagesRoute = new Hono<{
  Bindings: ServerBindings;
}>()
  .get("/me", requireSession, async (c): Promise<Response> => {
    const pagesService = createPagesService(c.env.HYPERDRIVE.connectionString);
    const userId = c.get("session").user.id;
    const page = await pagesService.findPageInfo({ userId });
    if (page === undefined)
      throw new HTTPException(404, { message: "Page not found" });

    const { userId: ownerId, ...pageInfo } = page;
    return c.json(
      v.parse(pageProfileResponseSchema, {
        ...pageInfo,
        isOwner: ownerId === userId,
      }),
    );
  })
  .post(
    "/handle",
    sValidator("json", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const { handle: requestedHandle } = c.req.valid("json");
      const pagesService = createPagesService(
        c.env.HYPERDRIVE.connectionString,
      );
      const available =
        await pagesService.isPageHandleAvailable(requestedHandle);
      return c.json({ available });
    },
  )
  .post(
    "/:handle/image-upload",
    requireSession,
    sValidator("param", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    sValidator("json", profileImageUploadSchema, (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const { handle } = c.req.valid("param");
      const { contentType } = c.req.valid("json");
      const userId = c.get("session").user.id;
      const page = await createPagesService(
        c.env.HYPERDRIVE.connectionString,
      ).findPageInfo({ handle });
      if (page === undefined || page.userId !== userId)
        throw new HTTPException(404, { message: "Page not found" });

      const upload = await createProfileImageUpload(
        c.env,
        c.req.url,
        userId,
        contentType,
      );
      if (upload === null)
        throw new HTTPException(503, {
          message: "Image uploads are unavailable",
        });

      return c.json(upload);
    },
  )
  .get(
    "/:handle",
    optionalSession,
    sValidator("param", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c): Promise<Response> => {
      const pagesService = createPagesService(
        c.env.HYPERDRIVE.connectionString,
      );
      const { handle } = c.req.valid("param");
      const userId = c.get("session")?.user.id;

      const page = await pagesService.findPageInfo({ handle });
      if (page === undefined)
        throw new HTTPException(404, { message: "Page not found" });

      const { userId: ownerId, ...pageInfo } = page;
      return c.json(
        v.parse(pageResponseSchema, {
          ...pageInfo,
          isOwner: ownerId === userId,
        }),
      );
    },
  )
  .patch(
    "/:handle",
    requireSession,
    sValidator("param", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    sValidator("json", pagePatchRequestSchema, (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const pagesService = new PagesService(database);
      const userId = c.get("session").user.id;

      const { handle: currentHandle } = c.req.valid("param");
      const request = c.req.valid("json");

      if (isPageSaveRequest(request)) {
        if (request.bento !== undefined)
          await assertBentoMediaBatchIsReady(
            pagesService,
            new BentoMediaService(database, c.env, c.req.url),
            userId,
            currentHandle,
            request.bento.upserts,
          );

        try {
          const savedPage = await pagesService.savePageForUser(
            userId,
            currentHandle,
            request,
          );

          if (savedPage.status === PAGE_SERVICE_STATUS.notFound)
            throw new HTTPException(404, { message: "Page not found" });
          if (savedPage.status === PAGE_SERVICE_STATUS.invalidBentoBatch)
            throw new HTTPException(400, {
              message: `Invalid Bento batch: ${savedPage.reason}`,
            });

          const { userId: ownerId, ...pageInfo } = savedPage.data;
          return c.json(
            v.parse(pageResponseSchema, {
              ...pageInfo,
              isOwner: ownerId === userId,
            }),
          );
        } catch (error) {
          if (error instanceof BentoItemPageConflictError)
            throw new HTTPException(409, {
              message: "A Bento item belongs to another page.",
            });
          if (error instanceof BentoMediaError)
            throw new HTTPException(error.status, { message: error.message });
          throw error;
        }
      }

      const update = request;
      const pageBeforeImageUpdate = await pagesService.getPageBeforeImageUpdate(
        userId,
        currentHandle,
        update,
      );
      if (pageBeforeImageUpdate.status === PAGE_SERVICE_STATUS.notFound)
        throw new HTTPException(404, { message: "Page not found" });
      if (pageBeforeImageUpdate.status === PAGE_SERVICE_STATUS.imageRequired)
        throw new HTTPException(400, {
          message: "Upload a profile image before cropping it.",
        });
      const pageBeforeUpdate = pageBeforeImageUpdate.page;

      if (update.imageKey !== undefined && update.imageKey !== null)
        await ensureProfileImageIsValid(
          c.env,
          c.req.url,
          userId,
          update.imageKey,
        );

      const updatedPage = await pagesService.updatePageForUser(
        userId,
        currentHandle,
        update,
      );

      if (updatedPage.status === PAGE_SERVICE_STATUS.notFound)
        throw new HTTPException(404, { message: "Page not found" });
      if (updatedPage.status === PAGE_SERVICE_STATUS.handleConflict)
        throw new HTTPException(409, { message: HANDLE_UNAVAILABLE_MESSAGE });

      const oldImageKey = pageBeforeUpdate?.imageKey;
      if (
        update.imageKey !== undefined &&
        isProfileImageKeyOwnedByUser(userId, oldImageKey) &&
        oldImageKey !== update.imageKey
      ) {
        c.executionCtx.waitUntil(
          deleteProfileImageObject(c.env, c.req.url, oldImageKey).catch(
            (error: unknown) => {
              console.error("Could not remove previous profile image", error);
            },
          ),
        );
      }

      return c.json(updatedPage.data);
    },
  )
  .route("/", bentoMediaRoute);
