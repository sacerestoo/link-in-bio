import "server-only";
import { Hono } from "hono";
import type { ServerBindings } from "../lib/env";
import { getAuth } from "../lib/auth";
import { requireSession } from "../middleware/session.middleware";

export const authRoute = new Hono<{ Bindings: ServerBindings }>()
  .get("/session", requireSession, (c) => {
    const { name, email, image } = c.get("session").user;
    return c.json({ user: { name, email, image } });
  })
  .on(["GET", "POST"], "/*", (c) => getAuth(c.env).handler(c.req.raw));
