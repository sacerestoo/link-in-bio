import * as v from "valibot";

export const healthStatusSchema = v.object({
  ok: v.literal(true),
  service: v.string(),
  time: v.string(),
});

export type HealthStatus = v.InferOutput<typeof healthStatusSchema>;
