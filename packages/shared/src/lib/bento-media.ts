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
