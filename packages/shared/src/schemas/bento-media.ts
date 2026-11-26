import * as v from "valibot";
import {
  BENTO_MEDIA_CONTENT_TYPES,
  BENTO_MEDIA_MAX_SIZE,
} from "../lib/bento-media";

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
