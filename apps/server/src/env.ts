import type { Hyperdrive } from "@cloudflare/workers-types";
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
  RESEND_API_KEY: optionalSetting,
  RESEND_FROM_EMAIL: optionalSetting,
  SENTRY_DSN: optionalSetting,
  CREEM_API_KEY: optionalSetting,
  CREEM_WEBHOOK_SECRET: optionalSetting,
  CREEM_PRO_MONTHLY_PRODUCT_ID: optionalSetting,
  CREEM_PRO_YEARLY_PRODUCT_ID: optionalSetting,
  R2_ACCOUNT_ID: optionalSetting,
  R2_ACCESS_KEY_ID: optionalSetting,
  R2_SECRET_ACCESS_KEY: optionalSetting,
  R2_BUCKET_NAME: optionalSetting,
  SCRAPPER_API_URL: v.optional(v.pipe(v.string(), v.url())),
  SCRAPPER_API_TOKEN: optionalSetting,
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
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SENTRY_DSN?: string;
  CREEM_API_KEY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  CREEM_PRO_MONTHLY_PRODUCT_ID?: string;
  CREEM_PRO_YEARLY_PRODUCT_ID?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  SCRAPPER_API_URL?: string;
  SCRAPPER_API_TOKEN?: string;
  CREEM_TEST_MODE?: string;
};

export const readServerEnv = (bindings: Readonly<object>): ServerEnv =>
  v.parse(serverEnvSchema, bindings);

export const isServerDevelopment = (): boolean => import.meta.env.DEV;
