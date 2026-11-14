import "server-only";
import { Hono } from "hono";
import type { ServerBindings } from "../lib/env";
import { getAuth } from "../lib/auth";

export const authController = new Hono<{ Bindings: ServerBindings }>().on(
  ["GET", "POST"],
  "/*",
  (c) => getAuth(c.env).handler(c.req.raw),
);
