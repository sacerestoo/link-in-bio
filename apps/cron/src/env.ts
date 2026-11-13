import * as v from "valibot";

// Settings the cron worker reads. Bindings come from wrangler.jsonc.
export const cronEnvSchema = v.object({
  CRON_DRY_RUN: v.optional(
    v.pipe(
      v.picklist(["true", "false"]),
      v.transform((value) => value === "true"),
    ),
    "false",
  ),
});

export type CronEnv = v.InferOutput<typeof cronEnvSchema>;

export const readCronEnv = (bindings: Readonly<object>): CronEnv =>
  v.parse(cronEnvSchema, bindings);
