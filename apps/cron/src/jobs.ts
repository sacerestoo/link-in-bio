import type { Database } from "@grabbin/db";

export type JobResult = Readonly<{
  job: string;
  ok: boolean;
  usedDatabase: boolean;
}>;

/** Placeholder daily job. Receives the database so real jobs can query it. */
export const runDailyJobs = async (
  database?: Database,
): Promise<readonly JobResult[]> => {
  await Promise.resolve();
  return [
    { job: "daily-noop", ok: true, usedDatabase: database !== undefined },
  ];
};
