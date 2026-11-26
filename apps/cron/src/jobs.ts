import type { Database } from "@grabbin/db";
import { bentoMediaAssets } from "@grabbin/db/schema/bento-media-assets";
import { and, asc, eq, gt, inArray, lte } from "drizzle-orm";

const R2_DELETE_BATCH_SIZE = 1000;

export const WEEKLY_MEDIA_CLEANUP_CRON = "0 7 * * SUN";

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

export const runWeeklyJobs = async (
  database: Database | undefined,
  bucket: R2Bucket,
): Promise<readonly JobResult[]> => {
  if (database === undefined)
    return [
      { job: "weekly-bento-media-cleanup", ok: true, usedDatabase: false },
    ];

  await database
    .update(bentoMediaAssets)
    .set({ status: "pending_delete" })
    .where(
      and(
        eq(bentoMediaAssets.status, "pending"),
        lte(bentoMediaAssets.cleanupAfter, new Date()),
      ),
    );

  let cursor: string | undefined;
  let firstFailure: unknown;
  let hasFailure = false;

  while (true) {
    const batch = await database
      .select({
        uploadId: bentoMediaAssets.uploadId,
        objectKey: bentoMediaAssets.objectKey,
      })
      .from(bentoMediaAssets)
      .where(
        cursor === undefined
          ? eq(bentoMediaAssets.status, "pending_delete")
          : and(
              eq(bentoMediaAssets.status, "pending_delete"),
              gt(bentoMediaAssets.uploadId, cursor),
            ),
      )
      .orderBy(asc(bentoMediaAssets.uploadId))
      .limit(R2_DELETE_BATCH_SIZE);
    if (batch.length === 0) break;

    const lastAsset = batch.at(-1);
    if (lastAsset === undefined) break;
    cursor = lastAsset.uploadId;

    try {
      await bucket.delete(batch.map(({ objectKey }) => objectKey));
      await database.delete(bentoMediaAssets).where(
        and(
          eq(bentoMediaAssets.status, "pending_delete"),
          inArray(
            bentoMediaAssets.uploadId,
            batch.map(({ uploadId }) => uploadId),
          ),
        ),
      );
    } catch (error) {
      if (!hasFailure) firstFailure = error;
      hasFailure = true;
    }
  }

  if (hasFailure)
    throw new Error("Weekly Bento media cleanup failed.", {
      cause: firstFailure,
    });

  return [{ job: "weekly-bento-media-cleanup", ok: true, usedDatabase: true }];
};
