import "server-only";
import { Hono } from "hono";
import type { ServerBindings } from "../lib/env";
import { getAuth } from "../lib/auth";
import { requireSession } from "../middleware/session.middleware";

export const authRoute = new Hono<{ Bindings: ServerBindings }>()
  .get("/session", requireSession, (c) => {
    const {
      id,
      name,
      email,
      image,
      hasAccessGranted,
      subscription,
      subscriptions,
    } = c.get("session").user;
    return c.json({
      user: {
        id,
        name,
        email,
        image,
        hasAccessGranted,
        subscription,
        subscriptions,
      },
    });
  })
  .all("/*", (c) => getAuth(c.env).handler(c.req.raw));
