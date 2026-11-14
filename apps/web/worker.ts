import { sentryPrivacyOptions } from "@grabbin/shared/observability";
import * as Sentry from "@sentry/cloudflare";
import handler from "vinext/server/app-router-entry";

const appWorker = {
  async fetch(request: Request, env: Env, context: ExecutionContext) {
    const response = await handler.fetch(request, env, context);
    const headers = new Headers(response.headers);
    headers.set("x-worker-version", env.CF_VERSION_METADATA.id);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    ...sentryPrivacyOptions,
  }),
  appWorker,
);
