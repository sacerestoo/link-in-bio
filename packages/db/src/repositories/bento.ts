import {
  applyBentoBatchPolicy,
  BentoError,
  type BentoBatchPolicyResult,
  type BentoBatchRequest,
  type BentoItem,
} from "@grabbin/domain/bento";
import { getBentoMediaObjectKey } from "@grabbin/domain/bento-media";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Executor } from "../client";
import { bentoItems } from "../schema/bento-items";
import { syncBentoMediaAssetReferences } from "./bento-media";

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
