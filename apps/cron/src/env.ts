import * as v from "valibot";

// Settings the cron worker reads. Bindings come from wrangler.jsonc.
export const cronEnvSchema = v.object({
  CLOUDFLARE_SAAS_ZONE_ID: v.optional(v.string()),
  CLOUDFLARE_SAAS_API_TOKEN: v.optional(v.string()),
  CREEM_API_KEY: v.optional(v.string()),
  CREEM_TEST_MODE: v.optional(
    v.pipe(
      v.string(),
      v.transform((value) => (value.trim() === "" ? "true" : value)),
      v.picklist(["true", "false"]),
      v.transform((value) => value === "true"),
    ),
    "true",
  ),
  CREEM_PRO_MONTHLY_PRODUCT_ID: v.optional(v.string()),
  CREEM_PRO_YEARLY_PRODUCT_ID: v.optional(v.string()),
  CUSTOM_DOMAIN_TARGET: v.optional(v.string()),
  DOMAIN: v.optional(v.string()),
  CRON_DRY_RUN: v.optional(
    v.pipe(
      v.string(),
      v.transform((value) => (value.trim() === "" ? "false" : value)),
      v.picklist(["true", "false"]),
      v.transform((value) => value === "true"),
    ),
    "false",
  ),
});

export type CronEnv = v.InferOutput<typeof cronEnvSchema>;

export const readCronEnv = (bindings: Readonly<object>): CronEnv =>
  v.parse(cronEnvSchema, bindings);
