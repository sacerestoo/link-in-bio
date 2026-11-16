import "server-only";
import type { HealthStatus } from "@grabbin/shared/schemas/health";
import { Hono } from "hono";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({
    ok: true,
    service: "grabbin-server",
    time: new Date().toISOString(),
  } satisfies HealthStatus),
);
