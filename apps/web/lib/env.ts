import * as v from "valibot";

const optionalSetting = v.optional(
  v.pipe(
    v.string(),
    v.transform((value) => (value.trim() === "" ? undefined : value)),
  ),
);

export const webEnvSchema = v.object({
  NEXT_PUBLIC_DOMAIN: optionalSetting,
  DOMAIN: optionalSetting,
  NEXT_PUBLIC_R2_PUBLIC_URL: optionalSetting,
  R2_PUBLIC_URL: optionalSetting,
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: optionalSetting,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: optionalSetting,
  NEXT_PUBLIC_SENTRY_DSN: optionalSetting,
  SENTRY_DSN: optionalSetting,
  SENTRY_AUTH_TOKEN: optionalSetting,
  SENTRY_WEB_ORG: optionalSetting,
  SENTRY_WEB_PROJECT: optionalSetting,
  CREEM_SUCCESS_URL: optionalSetting,
  NEXT_PUBLIC_CREEM_PRO_MONTHLY_PRODUCT_ID: optionalSetting,
  NEXT_PUBLIC_CREEM_PRO_YEARLY_PRODUCT_ID: optionalSetting,
  RESEND_API_KEY: optionalSetting,
  RESEND_FROM_EMAIL: optionalSetting,
  RESEND_OTP_TEMPLATE_ID: optionalSetting,
  RESEND_ACCOUNT_DELETION_TEMPLATE_ID: optionalSetting,
  GOOGLE_CLIENT_ID: optionalSetting,
  GOOGLE_CLIENT_SECRET: optionalSetting,
  YOUTUBE_API_KEY: optionalSetting,
  CHZZK_CLIENT_ID: optionalSetting,
  CHZZK_CLIENT_SECRET: optionalSetting,
  TWITTER_CLIENT_ID: optionalSetting,
  TWITTER_CLIENT_SECRET: optionalSetting,
  TWITCH_CLIENT_ID: optionalSetting,
  TWITCH_CLIENT_SECRET: optionalSetting,
  TWITCH_USER_ACCESS_TOKEN: optionalSetting,
  CALENDLY_CLIENT_ID: optionalSetting,
  CALENDLY_CLIENT_SECRET: optionalSetting,
  GITHUB_TOKEN: optionalSetting,
  PRODUCT_HUNT_TOKEN: optionalSetting,
  INSTAGRAM_SESSION_ID: optionalSetting,
  CLOUDFLARE_SAAS_ZONE_ID: optionalSetting,
  CLOUDFLARE_SAAS_API_TOKEN: optionalSetting,
  CUSTOM_DOMAIN_TARGET: optionalSetting,
  GA_MEASUREMENT_ID: optionalSetting,
  GA_MEASUREMENT_PROTOCOL_API_SECRET: optionalSetting,
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

export type WebEnv = v.InferOutput<typeof webEnvSchema>;

export const readWebEnv = (bindings: Readonly<object>): WebEnv =>
  v.parse(webEnvSchema, bindings);
