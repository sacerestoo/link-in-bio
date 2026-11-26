import "server-only";
import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import { createDatabase, type Executor } from "@grabbin/db";
import {
  findOwnedPageId,
  findOwnedPageImageKey,
  findPageInfoByHandle,
  findPageInfoByUserId,
  hasOwnedPage,
  isPageHandleAvailable,
  PageError,
  savePageForUser,
} from "@grabbin/db/repositories/page";
import {
  handleSchema,
  pageProfileResponseSchema,
  pageResponseSchema,
  pageSaveRequestSchema,
  profileImageUploadSchema,
  shouldResetImageCrop,
  type PageSaveRequest,
} from "@grabbin/domain/page";
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
import { BentoService } from "../services/bento.service";
import { withPageErrors } from "./page-route-errors";

const assertBentoMediaBatchIsReady = async (
  database: ReturnType<typeof createDatabase>,
  mediaService: BentoMediaService,
  userId: string,
  handle: string,
  items: readonly BentoItem[],
): Promise<void> => {
  if (!items.some((item) => item.type === "media")) return;
  const pageId = await findOwnedPageId(database, userId, handle);
  if (pageId === undefined) throw new PageError("not-found", "Page not found");

  try {
    await mediaService.assertBatchMediaUploaded(pageId, items);
  } catch (error) {
    if (error instanceof BentoMediaError)
      throw new HTTPException(error.status, { message: error.message });
    throw error;
  }
};

const saveBentoBatch = async (
  executor: Executor,
  pageId: string,
  batch: PageSaveRequest["bento"],
): Promise<readonly BentoItem[]> => {
  const bentoService = new BentoService(executor);
  if (batch === undefined) return bentoService.list(pageId);

  const result = await bentoService.save(pageId, batch);
  if (result.status === "invalid")
    throw new PageError(
      "invalid-bento-batch",
      `Invalid Bento batch: ${result.reason}`,
      result.reason,
    );
  return result.items;
};

export const pagesRoute = new Hono<{
  Bindings: ServerBindings;
}>()
  .get("/me", requireSession, (c): Promise<Response> =>
    withPageErrors(async () => {
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const userId = c.get("session").user.id;
      const page = await findPageInfoByUserId(database, userId);
      if (page === undefined)
        throw new PageError("not-found", "Page not found");

      const { userId: ownerId, ...pageInfo } = page;
      return c.json(
        v.parse(pageProfileResponseSchema, {
          ...pageInfo,
          isOwner: ownerId === userId,
        }),
      );
    }),
  )
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
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const available = await isPageHandleAvailable(database, requestedHandle);
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
    (c) =>
      withPageErrors(async () => {
        const { handle } = c.req.valid("param");
        const { contentType } = c.req.valid("json");
        const userId = c.get("session").user.id;
        const database = createDatabase(c.env.HYPERDRIVE.connectionString);
        if (!(await hasOwnedPage(database, userId, handle)))
          throw new PageError("not-found", "Page not found");

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
      }),
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
    (c): Promise<Response> =>
      withPageErrors(async () => {
        const database = createDatabase(c.env.HYPERDRIVE.connectionString);
        const { handle } = c.req.valid("param");
        const userId = c.get("session")?.user.id;

        const page = await findPageInfoByHandle(database, handle);
        if (page === undefined)
          throw new PageError("not-found", "Page not found");

        const { userId: ownerId, ...pageInfo } = page;
        return c.json(
          v.parse(pageResponseSchema, {
            ...pageInfo,
            isOwner: ownerId === userId,
          }),
        );
      }),
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
    sValidator("json", pageSaveRequestSchema, (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    (c) =>
      withPageErrors(async () => {
        const database = createDatabase(c.env.HYPERDRIVE.connectionString);
        const userId = c.get("session").user.id;
        const { handle: currentHandle } = c.req.valid("param");
        const request = c.req.valid("json");
        const update = request.page;
        let oldImageKey: string | null | undefined;
        if (update?.imageKey !== undefined || update?.imageCrop !== undefined) {
          oldImageKey = await findOwnedPageImageKey(
            database,
            userId,
            currentHandle,
          );
          if (oldImageKey === undefined)
            throw new PageError("not-found", "Page not found");

          const nextImageKey =
            update?.imageKey === undefined ? oldImageKey : update.imageKey;
          if (
            update?.imageCrop !== undefined &&
            update.imageCrop !== null &&
            nextImageKey === null
          )
            throw new PageError(
              "image-required",
              "Upload a profile image before cropping it.",
            );
        }

        if (update?.imageKey !== undefined && update.imageKey !== null)
          await ensureProfileImageIsValid(
            c.env,
            c.req.url,
            userId,
            update.imageKey,
          );

        const pageUpdate =
          update !== undefined && shouldResetImageCrop(update)
            ? { ...update, imageCrop: null }
            : update;
        const save =
          pageUpdate === update ? request : { ...request, page: pageUpdate };

        if (request.bento !== undefined)
          await assertBentoMediaBatchIsReady(
            database,
            new BentoMediaService(database, c.env, c.req.url),
            userId,
            currentHandle,
            request.bento.upserts,
          );

        let savedPage: Awaited<ReturnType<typeof savePageForUser>>;
        try {
          savedPage = await savePageForUser(
            database,
            userId,
            currentHandle,
            save,
            saveBentoBatch,
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

        if (
          update?.imageKey !== undefined &&
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

        const { userId: ownerId, ...pageInfo } = savedPage;
        return c.json(
          v.parse(pageResponseSchema, {
            ...pageInfo,
            isOwner: ownerId === userId,
          }),
        );
      }),
  );
