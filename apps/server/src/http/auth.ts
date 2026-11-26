import "server-only";
import { Hono } from "hono";
import type { ServerBindings } from "../env";
import { getAuth } from "../auth";
import { requireSession } from "../middleware";

export const authRoute = new Hono<{ Bindings: ServerBindings }>()
  .get("/session", requireSession, (c) => {
    const { user } = c.get("session");
    return c.json({ user });
  })
  .get("/error", (c) => {
    if (c.req.query("error") === "signup_disabled") {
      return Promise.resolve(c.redirect("/sign-up"));
    }
    return getAuth(c.env).handler(c.req.raw);
  })
  .all("/*", (c) => getAuth(c.env).handler(c.req.raw));
