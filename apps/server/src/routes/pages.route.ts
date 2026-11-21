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
  ensureProfileImageIsValid,
  isProfileImageKeyOwnedByUser,
} from "../lib/profile-images";
import {
  optionalSession,
  requireSession,
} from "../middleware/session.middleware";
import { PagesService, PAGE_SERVICE_STATUS } from "../services/pages.service";

const createPagesService = (connectionString: string) =>
  new PagesService(createDatabase(connectionString));

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
  );
