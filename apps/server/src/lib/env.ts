import * as v from "valibot";

const optionalSetting = v.optional(
  v.pipe(
    v.string(),
    v.transform((value) => (value.trim() === "" ? undefined : value)),
  ),
);

export const serverEnvSchema = v.object({
  BETTER_AUTH_URL: v.pipe(v.string(), v.url()),
  BETTER_AUTH_SECRET: v.pipe(v.string(), v.minLength(32)),
  GOOGLE_CLIENT_ID: optionalSetting,
  GOOGLE_CLIENT_SECRET: optionalSetting,
  LINE_CLIENT_ID: optionalSetting,
  LINE_CLIENT_SECRET: optionalSetting,
  TWITTER_CLIENT_ID: optionalSetting,
  TWITTER_CLIENT_SECRET: optionalSetting,
  SENTRY_DSN: optionalSetting,
  CREEM_API_KEY: optionalSetting,
  CREEM_WEBHOOK_SECRET: optionalSetting,
  CREEM_TEST_MODE: v.optional(
    v.pipe(
      v.string(),
      v.transform((value) => (value.trim() === "" ? "true" : value)),
      v.picklist(["true", "false"]),
      v.transform((value) => value === "true"),
    ),
    "true",
  ),
});

export type ServerEnv = v.InferOutput<typeof serverEnvSchema>;

export type ServerBindings = {
  HYPERDRIVE: Hyperdrive;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  LINE_CLIENT_ID?: string;
  LINE_CLIENT_SECRET?: string;
  TWITTER_CLIENT_ID?: string;
  TWITTER_CLIENT_SECRET?: string;
  SENTRY_DSN?: string;
  CREEM_API_KEY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  CREEM_TEST_MODE?: string;
};

export const readServerEnv = (bindings: Readonly<object>): ServerEnv =>
  v.parse(serverEnvSchema, bindings);
