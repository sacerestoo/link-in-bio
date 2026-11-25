import type {
  BentoBatchRequest,
  BentoItem,
} from "@grabbin/shared/schemas/bento-item";
import isEqual from "es-toolkit/compat/isEqual";

export const createBentoSaveBatch = (
  persistedItems: readonly BentoItem[],
  draftItems: readonly BentoItem[],
): BentoBatchRequest => {
  const persistedItemById = new Map(
    persistedItems.map(
      (persistedItem) => [persistedItem.id, persistedItem] as const,
    ),
  );
  const draftItemIds = new Set(draftItems.map((draftItem) => draftItem.id));

  return {
    upserts: draftItems.filter((draftItem) => {
      const persistedItem = persistedItemById.get(draftItem.id);
      return persistedItem === undefined || !isEqual(persistedItem, draftItem);
    }),
    deletes: persistedItems
      .filter((persistedItem) => !draftItemIds.has(persistedItem.id))
      .map((persistedItem) => persistedItem.id),
  };
};
