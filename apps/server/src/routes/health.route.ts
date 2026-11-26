import "server-only";
import type { HealthStatus } from "@grabbin/domain/health";
import { Hono } from "hono";

export const healthRoute = new Hono().get("/", (c) =>
  c.json({
    ok: true,
    time: new Date().toISOString(),
  } satisfies HealthStatus),
);
