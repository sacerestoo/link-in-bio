import "server-only";
import type { HealthStatus } from "@grabbin/shared/schemas/health";
import { Hono } from "hono";

export const healthController = new Hono<{ Bindings: Env }>().get("/", (c) =>
  c.json({
    ok: true,
    service: "grabbin-web",
    time: new Date().toISOString(),
  } satisfies HealthStatus),
);
