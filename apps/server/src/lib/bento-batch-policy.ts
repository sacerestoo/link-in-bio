import "server-only";
import type {
  BentoBatchRequest,
  BentoItem,
} from "@grabbin/shared/schemas/bento-item";
import { bentoLayoutSchema } from "@grabbin/shared/schemas/bento-layout";
import * as v from "valibot";

type BentoBatchPolicyError =
  | "duplicate-upsert-id"
  | "duplicate-delete-id"
  | "upsert-delete-overlap"
  | "item-type-change"
  | "invalid-final-layout";

export type BentoBatchPolicyResult =
  | { status: "valid"; items: readonly BentoItem[] }
  | { status: "invalid"; reason: BentoBatchPolicyError };

const hasUniqueIds = (ids: readonly BentoItem["id"][]): boolean =>
  new Set(ids).size === ids.length;

export const applyBentoBatchPolicy = (
  persistedItems: readonly BentoItem[],
  batch: BentoBatchRequest,
): BentoBatchPolicyResult => {
  if (!hasUniqueIds(batch.upserts.map((item) => item.id)))
    return { status: "invalid", reason: "duplicate-upsert-id" };

  if (!hasUniqueIds(batch.deletes))
    return { status: "invalid", reason: "duplicate-delete-id" };

  const deletedItemIds = new Set(batch.deletes);
  if (batch.upserts.some((item) => deletedItemIds.has(item.id)))
    return { status: "invalid", reason: "upsert-delete-overlap" };

  const persistedItemById = new Map(
    persistedItems.map((item) => [item.id, item] as const),
  );
  if (
    batch.upserts.some((item) => {
      const persistedItem = persistedItemById.get(item.id);
      return persistedItem !== undefined && persistedItem.type !== item.type;
    })
  )
    return { status: "invalid", reason: "item-type-change" };

  const upsertedItemById = new Map(
    batch.upserts.map((item) => [item.id, item] as const),
  );
  const finalItems = [
    ...persistedItems
      .filter((item) => !deletedItemIds.has(item.id))
      .map((item) => upsertedItemById.get(item.id) ?? item),
    ...batch.upserts.filter((item) => !persistedItemById.has(item.id)),
  ];
  const finalLayout = v.safeParse(
    bentoLayoutSchema,
    finalItems.map(({ id, type, layouts }) => ({ id, type, layouts })),
  );

  return finalLayout.success
    ? { status: "valid", items: finalItems }
    : { status: "invalid", reason: "invalid-final-layout" };
};
