import { isJSONObject } from "es-toolkit/predicate";
import * as v from "valibot";
import { BENTO_BLOCK_TYPES, bentoLayoutEntrySchema } from "./bento-layout";

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

export const bentoItemDataSchema = v.custom<BentoJsonObject>(
  isBentoJsonObject,
  "Data must be a JSON object.",
);

export const bentoItemStyleSchema = v.custom<BentoJsonObject>(
  isBentoJsonObject,
  "Style must be a JSON object.",
);

const bentoItemFields = {
  id: v.pipe(v.string(), v.uuid()),
  data: bentoItemDataSchema,
  style: bentoItemStyleSchema,
  layouts: bentoLayoutEntrySchema.entries.layouts,
};

export const bentoItemSchema = v.strictObject({
  ...bentoItemFields,
  type: v.picklist(BENTO_BLOCK_TYPES),
});

export const unknownBentoItemSchema = v.pipe(
  v.strictObject({
    ...bentoItemFields,
    type: v.pipe(v.string(), v.minLength(1)),
  }),
  v.check(
    (item) => !(BENTO_BLOCK_TYPES as readonly string[]).includes(item.type),
    "Unknown item types are only supported in saved responses.",
  ),
);

export const bentoItemResponseSchema = v.union([
  bentoItemSchema,
  unknownBentoItemSchema,
]);

export type BentoItem = v.InferOutput<typeof bentoItemSchema>;
export type UnknownBentoItem = v.InferOutput<typeof unknownBentoItemSchema>;
export type BentoItemResponse = v.InferOutput<typeof bentoItemResponseSchema>;
