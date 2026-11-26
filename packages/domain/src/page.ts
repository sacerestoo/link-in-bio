import {
  bentoBatchRequestSchema,
  bentoItemResponseSchema,
} from "@grabbin/shared/schemas/bento-item";
import * as v from "valibot";

const reservedHandles = new Set([
  "admin",
  "api",
  "auth",
  "billing",
  "changelog",
  "check",
  "create",
  "demo",
  "explore",
  "favicon",
  "health",
  "llms",
  "log-in",
  "login",
  "manifest",
  "new",
  "pages",
  "privacy",
  "robots",
  "setting",
  "settings",
  "sign-in",
  "sitemap",
  "terms",
  "update",
]);

const isReservedHandle = (handle: string): boolean =>
  reservedHandles.has(handle);

export const PAGE_NAME_MAX_LENGTH = 50;
export const PAGE_BIO_MAX_LENGTH = 150;
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

export const imageCropSchema = v.pipe(
  v.object({
    x: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    y: v.pipe(v.number(), v.minValue(0), v.maxValue(100)),
    width: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
    height: v.pipe(v.number(), v.minValue(0.1), v.maxValue(100)),
  }),
  v.check(
    (crop) => crop.x + crop.width <= 100 && crop.y + crop.height <= 100,
    "Crop must stay within the image bounds.",
  ),
);

export type ImageCrop = v.InferOutput<typeof imageCropSchema>;

export const handleSchema = v.pipe(
  v.string("Enter a page handle."),
  v.trim(),
  v.minLength(3, "Handle must be at least 3 characters."),
  v.maxLength(30, "Handle must be 30 characters or fewer."),
  v.regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u,
    "Use lowercase letters and numbers, with hyphens or underscores only between groups.",
  ),
  v.check((handle) => !isReservedHandle(handle), "You can't use that handle."),
);

export const HANDLE_UNAVAILABLE_MESSAGE =
  "That handle is already taken. Try another one.";

export const availableHandleSchema = (available: boolean) =>
  v.pipe(
    handleSchema,
    v.check(() => available, HANDLE_UNAVAILABLE_MESSAGE),
  );

export const pageSchema = v.object({
  handle: handleSchema,
  name: v.nullable(
    v.pipe(
      v.string(),
      v.maxLength(
        PAGE_NAME_MAX_LENGTH,
        `Name must be ${PAGE_NAME_MAX_LENGTH} characters or fewer.`,
      ),
    ),
  ),
  bio: v.nullable(
    v.pipe(
      v.string(),
      v.maxLength(
        PAGE_BIO_MAX_LENGTH,
        `Bio must be ${PAGE_BIO_MAX_LENGTH} characters or fewer.`,
      ),
    ),
  ),
  imageKey: v.nullable(v.string()),
  imageCrop: v.nullable(imageCropSchema),
});

export const pageUpdateSchema = v.pipe(
  v.partial(
    v.pick(pageSchema, ["handle", "name", "bio", "imageKey", "imageCrop"]),
  ),
  v.check(
    (update) => Object.values(update).some((value) => value !== undefined),
    "Provide at least one page field to update.",
  ),
);

export const profileImageUploadSchema = v.object({
  contentType: v.picklist(PROFILE_IMAGE_CONTENT_TYPES),
  size: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, "Choose a non-empty image."),
    v.maxValue(
      PROFILE_IMAGE_MAX_SIZE,
      "Profile images must be 5 MB or smaller.",
    ),
  ),
});

export const profileImageUploadResponseSchema = v.object({
  imageKey: v.string(),
  uploadUrl: v.pipe(v.string(), v.url()),
});

export const pageResponseSchema = v.object({
  ...pageSchema.entries,
  isOwner: v.boolean(),
  bento: v.array(bentoItemResponseSchema),
});

export const pageProfileResponseSchema = v.object({
  ...pageSchema.entries,
  isOwner: v.boolean(),
});

export const pageSaveRequestSchema = v.pipe(
  v.strictObject({
    page: v.optional(pageUpdateSchema),
    bento: v.optional(bentoBatchRequestSchema),
  }),
  v.check(
    (save) => save.page !== undefined || save.bento !== undefined,
    "Provide page or Bento changes to save.",
  ),
);

export type Handle = v.InferOutput<typeof handleSchema>;
export type PageUpdate = v.InferOutput<typeof pageUpdateSchema>;
export type PageResponse = v.InferOutput<typeof pageResponseSchema>;
export type PageProfileResponse = v.InferOutput<
  typeof pageProfileResponseSchema
>;
export type PageSaveRequest = v.InferOutput<typeof pageSaveRequestSchema>;

export const shouldResetImageCrop = (update: PageUpdate): boolean =>
  update.imageKey !== undefined && update.imageCrop === undefined;
