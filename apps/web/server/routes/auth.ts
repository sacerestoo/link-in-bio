import { Hono } from "hono";
import { getAuth } from "../auth";

// Better Auth (and the Creem webhook at /api/auth/creem/webhook).
export const auth = new Hono<{ Bindings: Env }>().on(
  ["GET", "POST"],
  "/*",
  (c): Response | Promise<Response> => {
    const instance = getAuth(c.env);
    if (instance === undefined) {
      return c.json({ error: "Auth is not configured." }, 503);
    }
    return instance.handler(c.req.raw);
  },
);
