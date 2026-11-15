import "server-only";
import { createDatabase } from "@grabbin/db";
import { usernameSchema } from "@grabbin/shared/schemas/profile";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import * as v from "valibot";
import type { ServerBindings } from "../lib/env";
import { getAuth } from "../lib/auth";
import {
  findPageHandleForUser,
  isPageHandleAvailable,
} from "../services/pages.service";

export const pagesController = new Hono<{
  Bindings: ServerBindings;
}>()
  .get("/me", async (c) => {
    const session = await getAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    if (session === null)
      throw new HTTPException(401, { message: "Unauthorized" });

    const database = createDatabase(c.env.HYPERDRIVE.connectionString);
    const handle = await findPageHandleForUser(database, session.user.id);
    if (handle === undefined)
      throw new HTTPException(404, { message: "Page not found" });

    return c.json({ handle });
  })
  .get("/handles/:handle/availability", async (c) => {
    const result = v.safeParse(usernameSchema, c.req.param("handle"));
    if (!result.success) {
      throw new HTTPException(400, {
        message: result.issues.map((issue) => issue.message).join(" "),
      });
    }

    const database = createDatabase(c.env.HYPERDRIVE.connectionString);
    const available = await isPageHandleAvailable(database, result.output);
    return c.json({ available });
  });
