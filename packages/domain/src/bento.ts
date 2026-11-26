import { isJSONObject } from "es-toolkit/predicate";
import * as v from "valibot";
import {
  BENTO_BLOCK_TYPES,
  bentoLayoutEntrySchema,
  bentoLayoutSchema,
} from "./bento-layout";

type BentoJsonValue =
  | string
  | number
  | boolean
  | null
  | BentoJsonValue[]
  | { [key: string]: BentoJsonValue };

type BentoJsonObject = Record<string, BentoJsonValue>;

// Valibot expects a boolean check; don't leak isJSONObject's any-based type guard.
const isBentoJsonObject = (value: unknown): boolean => isJSONObject(value);

export const bentoItemIdSchema = v.pipe(v.string(), v.uuid());

export const bentoItemDataSchema = v.custom<BentoJsonObject>(
  isBentoJsonObject,
  "Data must be a JSON object.",
);

export const bentoItemStyleSchema = v.custom<BentoJsonObject>(
  isBentoJsonObject,
  "Style must be a JSON object.",
);

const bentoItemFields = {
  id: bentoItemIdSchema,
  data: bentoItemDataSchema,
  style: bentoItemStyleSchema,
  layouts: bentoLayoutEntrySchema.entries.layouts,
};

export const bentoItemSchema = v.strictObject({
  ...bentoItemFields,
  type: v.picklist(BENTO_BLOCK_TYPES),
});

export const bentoItemResponseSchema = bentoItemSchema;

export const bentoBatchRequestSchema = v.pipe(
  v.strictObject({
    upserts: v.array(bentoItemSchema),
    deletes: v.array(bentoItemIdSchema),
  }),
  v.check(
    (batch) => v.safeParse(bentoLayoutSchema, batch.upserts).success,
    "Upserted items must have valid, non-overlapping layouts.",
  ),
);

export type BentoItem = v.InferOutput<typeof bentoItemSchema>;
export type BentoItemResponse = BentoItem;
export type BentoBatchRequest = v.InferOutput<typeof bentoBatchRequestSchema>;

export type BentoBatchPolicyError =
  | "duplicate-upsert-id"
  | "duplicate-delete-id"
  | "upsert-delete-overlap"
  | "item-type-change"
  | "invalid-final-layout";

export type BentoBatchPolicyResult =
  | { status: "valid"; items: readonly BentoItem[] }
  | { status: "invalid"; reason: BentoBatchPolicyError };

const hasUniqueItemIds = (ids: readonly BentoItem["id"][]): boolean =>
  new Set(ids).size === ids.length;

export const applyBentoBatchPolicy = (
  persistedItems: readonly BentoItem[],
  batch: BentoBatchRequest,
): BentoBatchPolicyResult => {
  if (!hasUniqueItemIds(batch.upserts.map((item) => item.id)))
    return { status: "invalid", reason: "duplicate-upsert-id" };

  if (!hasUniqueItemIds(batch.deletes))
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

export type BentoViolation = "item-page-conflict";

export class BentoError extends Error {
  constructor(
    readonly violation: BentoViolation,
    message: string,
  ) {
    super(message);
    this.name = "BentoError";
  }
}
