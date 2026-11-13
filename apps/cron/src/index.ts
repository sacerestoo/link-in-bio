import { createDatabase } from "@grabbin/db";
import { readCronEnv } from "./env";
import { runDailyJobs } from "./jobs";

export default {
  async scheduled(controller, env): Promise<void> {
    const settings = readCronEnv(env);
    // CRON_DRY_RUN=true skips the database, e.g. for a local test run.
    const database = settings.CRON_DRY_RUN
      ? undefined
      : createDatabase(env.HYPERDRIVE.connectionString);
    const results = await runDailyJobs(database);
    console.warn(
      `cron ${controller.cron} finished: ${JSON.stringify(results)}`,
    );
  },
} satisfies ExportedHandler<Env>;
