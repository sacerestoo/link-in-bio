import { API_VERSION } from "@grabbin/shared/api-version";
import { sentryPrivacyOptions } from "@grabbin/shared/observability";
import * as Sentry from "@sentry/cloudflare";
import app from "./app";

const worker = {
  fetch: (
    request: Request,
    env: Parameters<typeof app.fetch>[1],
    ctx: Parameters<typeof app.fetch>[2],
  ) => {
    const url = new URL(request.url);
    if (url.pathname === "/api/auth/creem/webhook") {
      url.pathname = `/${API_VERSION}/auth/creem/webhook`;
      return app.fetch(new Request(url, request), env, ctx);
    }
    return app.fetch(request, env, ctx);
  },
};

export default Sentry.withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    ...sentryPrivacyOptions,
  }),
  worker,
);
