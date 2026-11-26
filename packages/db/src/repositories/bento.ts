import {
  applyBentoBatchPolicy,
  createBentoMediaObjectKey,
  getBentoMediaObjectKey,
  isBentoMediaObjectKeyForPage,
  BentoError,
  type BentoBatchPolicyResult,
  type BentoBatchRequest,
  type BentoItem,
} from "@grabbin/domain/bento";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database, Executor } from "../client";
import { bentoItems } from "../schema/bento-items";
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

export const listBentoItems = (
  executor: Executor,
  pageId: string,
): Promise<BentoItem[]> =>
  executor
    .select({
      id: bentoItems.id,
      type: bentoItems.type,
      data: bentoItems.data,
      style: bentoItems.style,
      layouts: bentoItems.layouts,
    })
    .from(bentoItems)
    .where(eq(bentoItems.pageId, pageId))
    .orderBy(asc(bentoItems.createdAt), asc(bentoItems.id));

export const saveBentoBatch = async (
  executor: Executor,
  pageId: string,
  batch: BentoBatchRequest,
): Promise<BentoBatchPolicyResult> => {
  const persistedItems = await listBentoItems(executor, pageId);
  const policy = applyBentoBatchPolicy(persistedItems, batch);
  if (policy.status === "invalid") return policy;

  await syncBentoMediaAssetReferences(
    executor,
    pageId,
    persistedItems.flatMap((item) => {
      const objectKey = getBentoMediaObjectKey(item);
      return objectKey === undefined ? [] : [objectKey];
    }),
    policy.items.flatMap((item) => {
      const objectKey = getBentoMediaObjectKey(item);
      return objectKey === undefined ? [] : [objectKey];
    }),
  );

  const hasUpserts = batch.upserts.length > 0;
  const hasDeletes = batch.deletes.length > 0;
  let upsertedItems: Pick<BentoItem, "id">[] = [];

  if (hasUpserts && hasDeletes) {
    // The policy rejects overlapping IDs, so each CTE changes different rows.
    const upserted = executor
      .$with("upserted")
      .as(upsert(executor, pageId, batch.upserts));
    const deleted = executor.$with("deleted").as(
      deleteItems(executor, pageId, batch.deletes).returning({
        id: bentoItems.id,
      }),
    );

    upsertedItems = await executor
      .with(upserted, deleted)
      .select({ id: upserted.id })
      .from(upserted);
  } else {
    if (hasUpserts)
      upsertedItems = await upsert(executor, pageId, batch.upserts);
    if (hasDeletes) await deleteItems(executor, pageId, batch.deletes);
  }

  const upsertedItemIds = new Set(upsertedItems.map((item) => item.id));
  if (batch.upserts.some((item) => !upsertedItemIds.has(item.id)))
    throw new BentoError(
      "item-page-conflict",
      "A Bento item belongs to another page.",
    );

  return policy;
};

const upsert = (
  executor: Executor,
  pageId: string,
  items: readonly BentoItem[],
) =>
  executor
    .insert(bentoItems)
    .values(items.map((item) => ({ ...item, pageId })))
    .onConflictDoUpdate({
      target: bentoItems.id,
      set: {
        type: sql`excluded.type`,
        data: sql`excluded.data`,
        style: sql`excluded.style`,
        layouts: sql`excluded.layouts`,
        updatedAt: sql`now()`,
      },
      setWhere: eq(bentoItems.pageId, pageId),
    })
    .returning({ id: bentoItems.id });

const deleteItems = (
  executor: Executor,
  pageId: string,
  itemIds: readonly BentoItem["id"][],
) =>
  executor
    .delete(bentoItems)
    .where(and(eq(bentoItems.pageId, pageId), inArray(bentoItems.id, itemIds)));

const syncBentoMediaAssetReferences = async (
  executor: Executor,
  pageId: string,
  previousObjectKeys: readonly string[],
  nextObjectKeys: readonly string[],
): Promise<void> => {
  const previousKeys = new Set(previousObjectKeys);
  const nextKeys = new Set(nextObjectKeys);
  const keysToKeep = [...nextKeys];

  if (keysToKeep.some((key) => !isBentoMediaObjectKeyForPage(key, pageId)))
    throw new BentoError(
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
        throw new BentoError(
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
        throw new BentoError(
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
