import "server-only";
import { createDatabase } from "@grabbin/db";
import { handleSchema, pageResponseSchema } from "@grabbin/shared/schemas/page";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import {
  optionalSession,
  requireSession,
} from "../middleware/session.middleware";
import {
  findPageByHandle,
  findPageHandleForUser,
  isPageHandleAvailable,
  updatePageHandleForUser,
} from "../services/pages.service";

export const pagesRoute = new Hono<{
  Bindings: ServerBindings;
}>()
  .get("/me", requireSession, async (c) => {
    const database = createDatabase(c.env.HYPERDRIVE.connectionString);
    const handle = await findPageHandleForUser(
      database,
      c.get("session").user.id,
    );
    if (handle === undefined)
      throw new HTTPException(404, { message: "Page not found" });

    return c.json({ handle });
  })
  .get(
    "/handles/:handle/availability",
    sValidator("param", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const { handle } = c.req.valid("param");
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const available = await isPageHandleAvailable(database, handle);
      return c.json({ available });
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
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const { handle } = c.req.valid("param");
      const userId = c.get("session")?.user.id;

      const page = await findPageByHandle(database, handle);
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
    sValidator("json", v.object({ handle: handleSchema }), (result) => {
      if (!result.success)
        throw new HTTPException(400, {
          message: result.error.map((issue) => issue.message).join(" "),
        });
    }),
    async (c) => {
      const database = createDatabase(c.env.HYPERDRIVE.connectionString);
      const userId = c.get("session").user.id;
      const currentHandle = c.req.valid("param").handle;
      const { handle } = c.req.valid("json");
      const ownedHandle = await findPageHandleForUser(database, userId);
      if (ownedHandle !== currentHandle)
        throw new HTTPException(404, { message: "Page not found" });

      if (
        handle !== currentHandle &&
        !(await isPageHandleAvailable(database, handle))
      ) {
        throw new HTTPException(409, {
          message: "That handle is already taken. Try another one.",
        });
      }

      try {
        const updatedHandle = await updatePageHandleForUser(
          database,
          userId,
          currentHandle,
          handle,
        );
        if (updatedHandle === undefined)
          throw new HTTPException(404, { message: "Page not found" });
        return c.json({ handle: updatedHandle });
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505" &&
          "constraint" in error &&
          error.constraint === "pages_handle_idx"
        ) {
          throw new HTTPException(409, {
            message: "That handle is already taken. Try another one.",
          });
        }
        throw error;
      }
    },
  );
