import type {
  BentoBatchRequest,
  BentoItem,
} from "@grabbin/shared/schemas/bento-item";
import type {
  PageResponse,
  PageSaveRequest,
} from "@grabbin/shared/schemas/page";
import isEqual from "es-toolkit/compat/isEqual";

export type PageSaveDraft = Readonly<{
  name: string;
  bio: string;
  bento: readonly BentoItem[];
}>;

export const createPageSaveDraft = (page: PageResponse): PageSaveDraft => ({
  name: page.name ?? "",
  bio: page.bio ?? "",
  bento: page.bento,
});

const isNewOrChangedBentoItem = (
  originalItemById: ReadonlyMap<BentoItem["id"], BentoItem>,
  draftItem: BentoItem,
): boolean => {
  const originalItem = originalItemById.get(draftItem.id);
  return originalItem === undefined || !isEqual(originalItem, draftItem);
};

const isDeletedBentoItem = (
  draftItemIds: ReadonlySet<BentoItem["id"]>,
  originalItem: BentoItem,
): boolean => !draftItemIds.has(originalItem.id);

const createBentoBatch = (
  originalItems: readonly BentoItem[],
  draftItems: readonly BentoItem[],
): BentoBatchRequest | undefined => {
  const originalItemById = new Map(
    originalItems.map((item) => [item.id, item] as const),
  );
  const draftItemIds = new Set(draftItems.map((item) => item.id));
  const upserts = draftItems.filter((item) =>
    isNewOrChangedBentoItem(originalItemById, item),
  );
  const deletes = originalItems
    .filter((item) => isDeletedBentoItem(draftItemIds, item))
    .map((item) => item.id);

  if (upserts.length === 0 && deletes.length === 0) return undefined;
  return { upserts, deletes };
};

const createPageFieldChanges = (
  originalData: PageSaveDraft,
  draft: PageSaveDraft,
): PageSaveRequest["page"] => {
  const changes: NonNullable<PageSaveRequest["page"]> = {};

  if (originalData.name !== draft.name) changes.name = draft.name || null;
  if (originalData.bio !== draft.bio) changes.bio = draft.bio || null;

  if (changes.name === undefined && changes.bio === undefined) return undefined;
  return changes;
};

const applyBentoBatch = (
  originalItems: readonly BentoItem[],
  batch: BentoBatchRequest,
): BentoItem[] => {
  const upsertedItemById = new Map(
    batch.upserts.map((item) => [item.id, item] as const),
  );
  const deletedItemIds = new Set(batch.deletes);
  const originalItemIds = new Set(originalItems.map((item) => item.id));
  const updatedItems = originalItems
    .filter((item) => !deletedItemIds.has(item.id))
    .map((item) => upsertedItemById.get(item.id) ?? item);

  for (const item of batch.upserts) {
    if (!originalItemIds.has(item.id)) updatedItems.push(item);
  }

  return updatedItems;
};

export const applyPageSaveRequest = (
  page: PageResponse,
  request: PageSaveRequest,
): PageResponse => ({
  handle: page.handle,
  name: request.page?.name === undefined ? page.name : request.page.name,
  bio: request.page?.bio === undefined ? page.bio : request.page.bio,
  imageKey: page.imageKey,
  imageCrop: page.imageCrop,
  isOwner: page.isOwner,
  bento:
    request.bento === undefined
      ? page.bento
      : applyBentoBatch(page.bento, request.bento),
});

export const createPageSaveRequest = (
  originalData: PageSaveDraft,
  draft: PageSaveDraft,
): PageSaveRequest | null => {
  const pageChanges = createPageFieldChanges(originalData, draft);
  const bentoBatch = createBentoBatch(originalData.bento, draft.bento);

  if (pageChanges === undefined && bentoBatch === undefined) return null;

  const request: PageSaveRequest = {};
  if (pageChanges !== undefined) request.page = pageChanges;
  if (bentoBatch !== undefined) request.bento = bentoBatch;
  return request;
};
