import { authController } from "@/controllers/auth.controller";
import { healthController } from "@/controllers/health.controller";
import { env } from "cloudflare:workers";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>()
  .basePath("/api")
  .route("/health", healthController)
  .route("/auth", authController);

const handleApiRequest = (request: Request): Response | Promise<Response> =>
  app.fetch(request, env);

export {
  handleApiRequest as GET,
  handleApiRequest as POST,
  handleApiRequest as PUT,
  handleApiRequest as PATCH,
  handleApiRequest as DELETE,
  handleApiRequest as OPTIONS,
};
