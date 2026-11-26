import {
  BentoMediaError,
  createBentoMediaObjectKey,
  isBentoMediaObjectKeyForPage,
} from "@grabbin/domain/bento-media";
import { and, asc, eq, gt, inArray, lte } from "drizzle-orm";
import type { Database, Executor } from "../client";
import { bentoMediaAssets } from "../schema/bento-media-assets";

const BENTO_MEDIA_UPLOAD_URL_TTL_MS = 5 * 60 * 1000;
const BENTO_MEDIA_RESERVATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

type BentoMediaAsset = typeof bentoMediaAssets.$inferSelect;

export const reserveBentoMediaUpload = (
  database: Database,
  uploadId: string,
  pageId: string,
): Promise<BentoMediaAsset> =>
  database.transaction(async (transaction) => {
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
        objectKey: createBentoMediaObjectKey(pageId, uploadId),
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

export const renewPendingBentoMediaUpload = async (
  database: Database,
  uploadId: string,
): Promise<BentoMediaAsset | undefined> => {
  const uploadUrlExpiresAt = new Date(
    Date.now() + BENTO_MEDIA_UPLOAD_URL_TTL_MS,
  );
  const cleanupAfter = new Date(
    uploadUrlExpiresAt.getTime() + BENTO_MEDIA_RESERVATION_RETENTION_MS,
  );
  const [asset] = await database
    .update(bentoMediaAssets)
    .set({ uploadUrlExpiresAt, cleanupAfter })
    .where(
      and(
        eq(bentoMediaAssets.uploadId, uploadId),
        eq(bentoMediaAssets.status, "pending"),
      ),
    )
    .returning();

  return asset;
};

export const markExpiredBentoMediaUploadsForDeletion = async (
  database: Database,
  now: Date,
): Promise<void> => {
  await database
    .update(bentoMediaAssets)
    .set({ status: "pending_delete" })
    .where(
      and(
        eq(bentoMediaAssets.status, "pending"),
        lte(bentoMediaAssets.cleanupAfter, now),
      ),
    );
};

export const listPendingDeleteBentoMediaUploads = (
  database: Database,
  cursor: string | undefined,
  limit: number,
) =>
  database
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
    .limit(limit);

export const deletePendingBentoMediaUploads = async (
  database: Database,
  uploadIds: readonly string[],
): Promise<void> => {
  if (uploadIds.length === 0) return;

  await database
    .delete(bentoMediaAssets)
    .where(
      and(
        eq(bentoMediaAssets.status, "pending_delete"),
        inArray(bentoMediaAssets.uploadId, uploadIds),
      ),
    );
};

export const syncBentoMediaAssetReferences = async (
  executor: Executor,
  pageId: string,
  previousObjectKeys: readonly string[],
  nextObjectKeys: readonly string[],
): Promise<void> => {
  const previousKeys = new Set(previousObjectKeys);
  const nextKeys = new Set(nextObjectKeys);
  const keysToKeep = [...nextKeys];

  if (keysToKeep.some((key) => !isBentoMediaObjectKeyForPage(key, pageId)))
    throw new BentoMediaError(
      "media-key-page-mismatch",
      "This image belongs to another page.",
    );

  if (keysToKeep.length > 0) {
    const assets = await executor
      .select()
      .from(bentoMediaAssets)
      .where(inArray(bentoMediaAssets.objectKey, keysToKeep))
      .for("update");
    const assetByKey = new Map(assets.map((asset) => [asset.objectKey, asset]));

    for (const objectKey of keysToKeep) {
      const asset = assetByKey.get(objectKey);
      if (asset?.status === "attached") continue;
      if (asset?.status !== "pending")
        throw new BentoMediaError(
          "media-not-uploaded",
          "The Bento media upload is no longer available.",
        );

      const [attachedAsset] = await executor
        .update(bentoMediaAssets)
        .set({ status: "attached" })
        .where(
          and(
            eq(bentoMediaAssets.objectKey, objectKey),
            eq(bentoMediaAssets.status, "pending"),
          ),
        )
        .returning({ uploadId: bentoMediaAssets.uploadId });

      if (attachedAsset === undefined)
        throw new BentoMediaError(
          "media-not-uploaded",
          "The Bento media upload is no longer available.",
        );
    }
  }

  const keysToDelete = [...previousKeys].filter((key) => !nextKeys.has(key));
  if (keysToDelete.length === 0) return;

  await executor
    .update(bentoMediaAssets)
    .set({ status: "pending_delete" })
    .where(
      and(
        inArray(bentoMediaAssets.objectKey, keysToDelete),
        eq(bentoMediaAssets.status, "attached"),
      ),
    );
};
