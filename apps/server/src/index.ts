import { sentryPrivacyOptions } from "@grabbin/shared/observability";
import * as Sentry from "@sentry/cloudflare";
import app from "./app";

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    ...sentryPrivacyOptions,
  }),
  app,
);
