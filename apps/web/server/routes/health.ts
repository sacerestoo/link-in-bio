import type { HealthStatus } from "@grabbin/shared/types/health";
import { Hono } from "hono";

export const health = new Hono<{ Bindings: Env }>().get("/", (c) =>
  c.json({
    ok: true,
    service: "grabbin-web",
    time: new Date().toISOString(),
  } satisfies HealthStatus),
);
