import "server-only";
import type { Database } from "@grabbin/db";
import type {
  BentoBatchRequest,
  BentoItem,
} from "@grabbin/shared/schemas/bento-item";
import { bentoItems } from "@grabbin/db/schema/bento-items";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  applyBentoBatchPolicy,
  type BentoBatchPolicyError,
} from "../lib/bento-batch-policy";
import { BentoItemPageConflictError } from "../lib/bento-item-page-conflict-error";
import { syncBentoMediaAssetReferences } from "./bento-media-assets.service";
import { getBentoMediaObjectKey } from "./bento-media.service";

type BentoDatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type BentoSaveResult =
  | { status: "saved"; items: readonly BentoItem[] }
  | { status: "invalid"; reason: BentoBatchPolicyError };

export class BentoService {
  constructor(private readonly executor: BentoDatabaseTransaction) {}

  async save(
    pageId: string,
    persistedItems: readonly BentoItem[],
    batch: BentoBatchRequest,
  ): Promise<BentoSaveResult> {
    const policy = applyBentoBatchPolicy(persistedItems, batch);
    if (policy.status === "invalid") return policy;

    await syncBentoMediaAssetReferences(
      this.executor,
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
      const upserted = this.executor
        .$with("upserted")
        .as(this.upsert(pageId, batch.upserts));
      const deleted = this.executor
        .$with("deleted")
        .as(
          this.delete(pageId, batch.deletes).returning({ id: bentoItems.id }),
        );

      upsertedItems = await this.executor
        .with(upserted, deleted)
        .select({ id: upserted.id })
        .from(upserted);
    } else {
      if (hasUpserts) upsertedItems = await this.upsert(pageId, batch.upserts);
      if (hasDeletes) await this.delete(pageId, batch.deletes);
    }

    const upsertedItemIds = new Set(upsertedItems.map((item) => item.id));
    if (batch.upserts.some((item) => !upsertedItemIds.has(item.id)))
      throw new BentoItemPageConflictError();

    return { status: "saved", items: policy.items };
  }

  private upsert(pageId: string, items: readonly BentoItem[]) {
    return this.executor
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
  }

  private delete(pageId: string, itemIds: readonly BentoItem["id"][]) {
    return this.executor
      .delete(bentoItems)
      .where(
        and(eq(bentoItems.pageId, pageId), inArray(bentoItems.id, itemIds)),
      );
  }
}
