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

// Placeholder contract shared by the web app and its API.
export const handleSchema = v.pipe(
  v.string("Enter a page handle."),
  v.trim(),
  v.minLength(3, "Handle must be at least 3 characters."),
  v.maxLength(30, "Handle must be 30 characters or fewer."),
  v.regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u,
    "Use lowercase letters and numbers, with hyphens or underscores only between groups.",
  ),
  v.check((handle) => !reservedHandles.has(handle), "That handle is reserved."),
);

export const availableHandleSchema = (available: boolean) =>
  v.pipe(
    handleSchema,
    v.check(() => available, "That handle is already taken. Try another one."),
  );

export type Handle = v.InferOutput<typeof handleSchema>;
