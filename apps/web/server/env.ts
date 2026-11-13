import "server-only";
import * as v from "valibot";

// Every Worker setting the web app reads. Values come from wrangler.jsonc
// vars, `wrangler secret put`, or .dev.vars locally; .env.example lists the
// names. Read settings only through readWebEnv().
export const webEnvSchema = v.object({
  BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
  BETTER_AUTH_SECRET: v.optional(v.pipe(v.string(), v.minLength(32))),
  CREEM_API_KEY: v.optional(v.string()),
  CREEM_WEBHOOK_SECRET: v.optional(v.string()),
  CREEM_TEST_MODE: v.optional(
    v.pipe(
      v.picklist(["true", "false"]),
      v.transform((value) => value === "true"),
    ),
    "true",
  ),
});

export type WebEnv = v.InferOutput<typeof webEnvSchema>;

export const readWebEnv = (bindings: Readonly<object>): WebEnv =>
  v.parse(webEnvSchema, bindings);
