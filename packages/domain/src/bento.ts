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

export const BENTO_MEDIA_CONTENT_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const BENTO_MEDIA_MAX_SIZE = 5 * 1024 * 1024;

export type BentoMediaContentType = (typeof BENTO_MEDIA_CONTENT_TYPES)[number];

export const isBentoMediaContentType = (
  contentType: string | null,
): contentType is BentoMediaContentType =>
  BENTO_MEDIA_CONTENT_TYPES.some((allowedType) => allowedType === contentType);

const BENTO_MEDIA_UPLOAD_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const createBentoMediaObjectKey = (
  pageId: string,
  uploadId: string,
): string => `bento-media/${encodeURIComponent(pageId)}/${uploadId}`;

export const isBentoMediaObjectKeyForPage = (
  objectKey: string,
  pageId: string,
): boolean => {
  const prefix = `bento-media/${encodeURIComponent(pageId)}/`;
  return (
    objectKey.startsWith(prefix) &&
    BENTO_MEDIA_UPLOAD_ID_PATTERN.test(objectKey.slice(prefix.length))
  );
};

export const getBentoMediaObjectKey = (item: BentoItem): string | undefined => {
  if (item.type !== "media") return undefined;
  const objectKey = item.data.objectKey;
  return typeof objectKey === "string" ? objectKey : undefined;
};

export const bentoMediaUploadRequestSchema = v.strictObject({
  uploadId: v.pipe(v.string(), v.uuid()),
  contentType: v.picklist(BENTO_MEDIA_CONTENT_TYPES),
  size: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, "Choose a non-empty media file."),
    v.maxValue(
      BENTO_MEDIA_MAX_SIZE,
      "Bento media files must be 5 MB or smaller.",
    ),
  ),
});

export const bentoMediaUploadResponseSchema = v.union([
  v.strictObject({
    status: v.literal("uploaded"),
    objectKey: v.string(),
  }),
  v.strictObject({
    status: v.literal("pending"),
    objectKey: v.string(),
    uploadUrl: v.pipe(v.string(), v.url()),
  }),
]);

export type BentoMediaUploadRequest = v.InferOutput<
  typeof bentoMediaUploadRequestSchema
>;
export type BentoMediaUploadResponse = v.InferOutput<
  typeof bentoMediaUploadResponseSchema
>;

export type BentoViolation =
  | "item-page-conflict"
  | "media-upload-page-conflict"
  | "media-key-page-mismatch"
  | "media-upload-expired"
  | "saved-media-missing"
  | "media-upload-unavailable"
  | "media-confirmation-failed"
  | "invalid-media-file"
  | "media-upload-required"
  | "media-not-uploaded";

export class BentoError extends Error {
  constructor(
    readonly violation: BentoViolation,
    message: string,
  ) {
    super(message);
    this.name = "BentoError";
  }
}
