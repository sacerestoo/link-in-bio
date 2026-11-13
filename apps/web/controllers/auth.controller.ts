import "server-only";
import { getAuth } from "@/lib/auth";
import { Hono } from "hono";

export const authController = new Hono<{ Bindings: Env }>().on(
  ["GET", "POST"],
  "/*",
  (c) => getAuth(c.env).handler(c.req.raw),
);
