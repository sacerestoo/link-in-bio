import { Hono } from "hono";
import { getBindings } from "./bindings";
import { auth } from "./routes/auth";
import { health } from "./routes/health";

// The web app's API. app/api/[[...route]]/route.ts hands every /api/* request
// to it through handleApiRequest.
export const api = new Hono<{ Bindings: Env }>()
  .basePath("/api")
  .route("/health", health)
  .route("/auth", auth);

export type Api = typeof api;

export const handleApiRequest = (
  request: Request,
): Response | Promise<Response> => api.fetch(request, getBindings());
