import * as v from "valibot";
import type { BentoItem } from "./bento";

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

export type BentoMediaViolation =
  | "media-upload-page-conflict"
  | "media-key-page-mismatch"
  | "media-upload-expired"
  | "saved-media-missing"
  | "media-upload-unavailable"
  | "media-confirmation-failed"
  | "invalid-media-file"
  | "media-upload-required"
  | "media-not-uploaded";

export class BentoMediaError extends Error {
  constructor(
    readonly violation: BentoMediaViolation,
    message: string,
  ) {
    super(message);
    this.name = "BentoMediaError";
  }
}
