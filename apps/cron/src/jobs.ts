import type { Database } from "@grabbin/db";
import {
  deletePendingBentoMediaUploads,
  listPendingDeleteBentoMediaUploads,
  markExpiredBentoMediaUploadsForDeletion,
} from "@grabbin/db/repositories/bento-media";

const R2_DELETE_BATCH_SIZE = 1000;

export type JobResult = Readonly<{
  job: string;
  ok: boolean;
  usedDatabase: boolean;
}>;

export const runWeeklyJobs = async (
  database: Database | undefined,
  bucket: R2Bucket,
): Promise<readonly JobResult[]> => {
  if (database === undefined)
    return [
      { job: "weekly-bento-media-cleanup", ok: true, usedDatabase: false },
    ];

  await markExpiredBentoMediaUploadsForDeletion(database, new Date());

  let cursor: string | undefined;
  let firstFailure: unknown;
  let hasFailure = false;

  while (true) {
    const batch = await listPendingDeleteBentoMediaUploads(
      database,
      cursor,
      R2_DELETE_BATCH_SIZE,
    );
    if (batch.length === 0) break;

    const lastAsset = batch.at(-1);
    if (lastAsset === undefined) break;
    cursor = lastAsset.uploadId;

    try {
      await bucket.delete(batch.map(({ objectKey }) => objectKey));
      await deletePendingBentoMediaUploads(
        database,
        batch.map(({ uploadId }) => uploadId),
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
