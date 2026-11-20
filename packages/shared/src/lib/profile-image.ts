export const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const PROFILE_IMAGE_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, immutable";
export const PROFILE_IMAGE_CONTENT_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
] as const;

export type ProfileImageContentType =
  (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

export const isProfileImageContentType = (
  contentType: string | null,
): contentType is ProfileImageContentType =>
  PROFILE_IMAGE_CONTENT_TYPES.some(
    (allowedType) => allowedType === contentType,
  );
