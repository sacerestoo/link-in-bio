import { Hono } from "hono";
import { auth } from "./routes/auth";
import { health } from "./routes/health";

// The web app's API, mounted by worker/index.ts under /api/*.
export const api = new Hono<{ Bindings: Env }>()
  .basePath("/api")
  .route("/health", health)
  .route("/auth", auth);

export type Api = typeof api;
