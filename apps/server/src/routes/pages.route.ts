import "server-only";
import { createDatabase } from "@grabbin/db";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  pageResponseSchema,
  profileImageUploadSchema,
  pageUpdateSchema,
} from "@grabbin/shared/schemas/page";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import {
  createProfileImageUpload,
  deleteProfileImageObject,
  isProfileImageKeyOwnedByUser,
  validateProfileImageObject,
} from "../lib/profile-images";
import {
  optionalSession,
  requireSession,
} from "../middleware/session.middleware";
import { PagesService, PAGE_SERVICE_STATUS } from "../services/pages.service";

const createPagesService = (connectionString: string) =>
  new PagesService(createDatabase(connectionString));

const ensureProfileImageIsValid = async (
  env: ServerBindings,
  requestUrl: string,
  userId: string,
  imageKey: string,
): Promise<void> => {
  const result = await validateProfileImageObject(
    env,
    requestUrl,
    userId,
    imageKey,
  );
  if (result === "valid") return;

  const errors = {
    invalidKey: { status: 400, message: "Invalid profile image" },
    uploadMissing: {
      status: 400,
      message: "Upload the image before saving it",
    },
    invalidImage: {
      status: 413,
      message: "Choose a GIF, JPG, JPEG, or PNG image up to 5 MB.",
    },
    unavailable: {
      status: 503,
      message: "Image uploads are unavailable",
    },
  } as const;
  const error = errors[result];
  throw new HTTPException(error.status, { message: error.message });
};

export const pagesRoute = new Hono<{
  Bindings: ServerBindings;
}>()
  .get("/me", requireSession, async (c) => {
    const pagesService = createPagesService(c.env.HYPERDRIVE.connectionString);
    const userOwnedHandle = await pagesService.findPageHandleForUser(
      c.get("session").user.id,
    );
    if (userOwnedHandle === undefined)
      throw new HTTPException(404, { message: "Page not found" });

    return c.json({ handle: userOwnedHandle });
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
      ).findPageByHandle(handle);
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
    async (c) => {
      const pagesService = createPagesService(
        c.env.HYPERDRIVE.connectionString,
      );
      const { handle } = c.req.valid("param");
      const userId = c.get("session")?.user.id;

      const page = await pagesService.findPageByHandle(handle);
      if (page === undefined)
        throw new HTTPException(404, { message: "Page not found" });

      const { userId: ownerId, ...pageData } = page;
      return c.json(
        v.parse(pageResponseSchema, {
          ...pageData,
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
    sValidator("json", pageUpdateSchema, (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const pagesService = createPagesService(
        c.env.HYPERDRIVE.connectionString,
      );
      const userId = c.get("session").user.id;

      const { handle: currentHandle } = c.req.valid("param");
      const update = c.req.valid("json");
      const pageBeforeUpdate =
        update.imageKey === undefined
          ? undefined
          : await pagesService.findPageByHandle(currentHandle);
      if (update.imageKey !== undefined && pageBeforeUpdate?.userId !== userId)
        throw new HTTPException(404, { message: "Page not found" });

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
        isProfileImageKeyOwnedByUser(userId, oldImageKey) &&
        oldImageKey !== update.imageKey
      ) {
        await deleteProfileImageObject(c.env, c.req.url, oldImageKey).catch(
          (error: unknown) => {
            console.error("Could not remove previous profile image", error);
          },
        );
      }

      return c.json(updatedPage.data);
    },
  );
