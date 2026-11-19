import * as v from "valibot";

export const PAGE_NAME_MAX_LENGTH = 50;
export const PAGE_BIO_MAX_LENGTH = 150;

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
  v.check(
    (handle) => !reservedHandles.has(handle),
    "You can't use that handle.",
  ),
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
});

export const pageUpdateSchema = v.pipe(
  v.partial(v.pick(pageSchema, ["handle", "name", "bio"])),
  v.check(
    (update) => Object.values(update).some((value) => value !== undefined),
    "Provide at least one page field to update.",
  ),
);

export const pageResponseSchema = v.object({
  ...pageSchema.entries,
  isOwner: v.boolean(),
});

export type Handle = v.InferOutput<typeof handleSchema>;
export type PageUpdate = v.InferOutput<typeof pageUpdateSchema>;
export type PageResponse = v.InferOutput<typeof pageResponseSchema>;
