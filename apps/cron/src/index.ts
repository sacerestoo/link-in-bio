import { createDatabase } from "@grabbin/db";
import { sentryPrivacyOptions } from "@grabbin/shared/observability";
import * as Sentry from "@sentry/cloudflare";
import { createLogger } from "evlog";
import { readCronEnv } from "./env";
import { runDailyJobs } from "./jobs";

declare global {
  interface Env {
    SENTRY_DSN: string;
  }
}

export default Sentry.withSentry(
  (env: Env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    ...sentryPrivacyOptions,
  }),
  {
    async scheduled(controller, env): Promise<void> {
      const settings = readCronEnv(env);
      // CRON_DRY_RUN=true skips the database, e.g. for a local test run.
      const database = settings.CRON_DRY_RUN
        ? undefined
        : createDatabase(env.HYPERDRIVE.connectionString);
      const log = createLogger({
        service: "grabbin-cron",
        cron: controller.cron,
        versionId: env.CF_VERSION_METADATA.id,
      });
      try {
        const results = await runDailyJobs(database);
        log.emit({ ok: true, results });
      } catch (error) {
        log.error(error instanceof Error ? error : String(error));
        log.emit({ ok: false });
        throw error;
      }
    },
  } satisfies ExportedHandler<Env>,
);
