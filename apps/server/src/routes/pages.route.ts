import "server-only";
import { createDatabase } from "@grabbin/db";
import { usernameSchema } from "@grabbin/shared/schemas/profile";
import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import { requireSession } from "../middleware/session.middleware";
import {
  findPageHandleForUser,
  isPageHandleAvailable,
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
    sValidator("param", v.object({ handle: usernameSchema }), (result) => {
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
  );
