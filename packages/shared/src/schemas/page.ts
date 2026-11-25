import * as v from "valibot";
import { isReservedHandle } from "../lib/handle";
import {
  PROFILE_IMAGE_CONTENT_TYPES,
  PROFILE_IMAGE_MAX_SIZE,
} from "../lib/profile-image";
import { bentoBatchRequestSchema, bentoItemResponseSchema } from "./bento-item";
import { imageCropSchema } from "./image-crop";

export const PAGE_NAME_MAX_LENGTH = 50;
export const PAGE_BIO_MAX_LENGTH = 150;

// Page contracts shared by the web app and its API.
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

const pageProfileSchema = v.pipe(
  v.strictObject({
    name: v.optional(pageSchema.entries.name),
    bio: v.optional(pageSchema.entries.bio),
  }),
  v.check(
    (page) => page.name !== undefined || page.bio !== undefined,
    "Provide at least one page field to save.",
  ),
);

export const pageSaveRequestSchema = v.pipe(
  v.strictObject({
    page: v.optional(pageProfileSchema),
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
