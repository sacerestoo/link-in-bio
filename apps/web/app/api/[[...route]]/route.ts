import { authController } from "@/controllers/auth.controller";
import { healthController } from "@/controllers/health.controller";
import { env } from "cloudflare:workers";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { timing } from "hono/timing";
import { trimTrailingSlash } from "hono/trailing-slash";

const app = new Hono<{ Bindings: Env }>()
  .basePath("/api")
  .use("*", trimTrailingSlash())
  .use("*", prettyJSON())
  .use("*", timing())
  .onError((error, c) => {
    const status = error instanceof HTTPException ? error.status : 500;
    const title = status >= 500 ? "Internal Server Error" : error.message;

    return c.json(
      {
        type: "about:blank",
        title,
        status,
        instance: c.req.path,
      },
      status,
      { "Content-Type": "application/problem+json" },
    );
  })
  .notFound((c) =>
    c.json(
      {
        type: "about:blank",
        title: "Not Found",
        status: 404,
        instance: c.req.path,
      },
      404,
      { "Content-Type": "application/problem+json" },
    ),
  )
  .route("/health", healthController)
  .route("/auth", authController);

export type AppType = typeof app;

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
