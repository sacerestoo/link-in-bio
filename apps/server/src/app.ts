import { API_VERSION } from "@grabbin/shared/api-version";
import { initLogger } from "evlog";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prettyJSON } from "hono/pretty-json";
import { timing } from "hono/timing";
import { trimTrailingSlash } from "hono/trailing-slash";
import type { ServerBindings } from "./lib/env";
import { authController } from "./controllers/auth.controller";
import { healthController } from "./controllers/health.controller";

initLogger({ env: { service: "grabbin-server" } });

const app = new Hono<{
  Bindings: ServerBindings;
  Variables: EvlogVariables["Variables"];
}>()
  .basePath(`/${API_VERSION}`)
  .use("*", trimTrailingSlash())
  .use("*", prettyJSON())
  .use("*", evlog())
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

export default app;
