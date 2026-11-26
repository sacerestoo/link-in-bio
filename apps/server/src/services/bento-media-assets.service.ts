import "server-only";
import type { Database } from "@grabbin/db";
import { bentoMediaAssets } from "@grabbin/db/schema/bento-media-assets";
import { eq } from "drizzle-orm";

const BENTO_MEDIA_UPLOAD_URL_TTL_MS = 5 * 60 * 1000;
const BENTO_MEDIA_RESERVATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type BentoMediaAsset = typeof bentoMediaAssets.$inferSelect;

export class BentoMediaAssetsService {
  constructor(private readonly database: Database) {}

  reserveUpload(uploadId: string): Promise<BentoMediaAsset> {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const uploadUrlExpiresAt = new Date(
        now.getTime() + BENTO_MEDIA_UPLOAD_URL_TTL_MS,
      );
      const cleanupAfter = new Date(
        uploadUrlExpiresAt.getTime() + BENTO_MEDIA_RESERVATION_RETENTION_MS,
      );
      const [createdAsset] = await transaction
        .insert(bentoMediaAssets)
        .values({
          uploadId,
          objectKey: `bento-media/${uploadId}`,
          uploadUrlExpiresAt,
          cleanupAfter,
        })
        .onConflictDoNothing({ target: bentoMediaAssets.uploadId })
        .returning();

      if (createdAsset !== undefined) return createdAsset;

      const [existingAsset] = await transaction
        .select()
        .from(bentoMediaAssets)
        .where(eq(bentoMediaAssets.uploadId, uploadId))
        .limit(1)
        .for("update");

      if (existingAsset === undefined)
        throw new Error("Bento media reservation disappeared during creation.");

      return existingAsset;
    });
  }
}
