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
