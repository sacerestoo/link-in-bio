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
