import "server-only";
import type { Database, Executor } from "@grabbin/db";
import { bentoMediaAssets } from "@grabbin/db/schema/bento-media-assets";
import { and, eq, inArray } from "drizzle-orm";
import { BentoMediaError } from "../lib/bento-media-error";
import {
  createBentoMediaObjectKey,
  isBentoMediaObjectKeyForPage,
} from "../lib/bento-media-object-key";

const BENTO_MEDIA_UPLOAD_URL_TTL_MS = 5 * 60 * 1000;
const BENTO_MEDIA_RESERVATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type BentoMediaAsset = typeof bentoMediaAssets.$inferSelect;
export class BentoMediaAssetsService {
  constructor(private readonly database: Database) {}

  reserveUpload(uploadId: string, pageId: string): Promise<BentoMediaAsset> {
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
  }

  async renewPendingUpload(
    uploadId: string,
  ): Promise<BentoMediaAsset | undefined> {
    const uploadUrlExpiresAt = new Date(
      Date.now() + BENTO_MEDIA_UPLOAD_URL_TTL_MS,
    );
    const cleanupAfter = new Date(
      uploadUrlExpiresAt.getTime() + BENTO_MEDIA_RESERVATION_RETENTION_MS,
    );
    const [asset] = await this.database
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
  }
}

export const syncBentoMediaAssetReferences = async (
  transaction: Executor,
  pageId: string,
  previousObjectKeys: readonly string[],
  nextObjectKeys: readonly string[],
): Promise<void> => {
  const previousKeys = new Set(previousObjectKeys);
  const nextKeys = new Set(nextObjectKeys);
  const keysToKeep = [...nextKeys];

  if (keysToKeep.some((key) => !isBentoMediaObjectKeyForPage(key, pageId)))
    throw new BentoMediaError("This image belongs to another page.", 400);

  if (keysToKeep.length > 0) {
    const assets = await transaction
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
          "The Bento media upload is no longer available.",
          400,
        );

      const [attachedAsset] = await transaction
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
          "The Bento media upload is no longer available.",
          400,
        );
    }
  }

  const keysToDelete = [...previousKeys].filter((key) => !nextKeys.has(key));
  if (keysToDelete.length === 0) return;

  await transaction
    .update(bentoMediaAssets)
    .set({ status: "pending_delete" })
    .where(
      and(
        inArray(bentoMediaAssets.objectKey, keysToDelete),
        eq(bentoMediaAssets.status, "attached"),
      ),
    );
};
