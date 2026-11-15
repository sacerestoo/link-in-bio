import * as v from "valibot";

// Placeholder contract shared by the web app and its API.
export const usernameSchema = v.pipe(
  v.string("Enter a page handle."),
  v.trim(),
  v.minLength(3, "Handle must be at least 3 characters."),
  v.maxLength(30, "Handle must be 30 characters or fewer."),
  v.regex(
    /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u,
    "Use lowercase letters and numbers, with hyphens or underscores only between groups.",
  ),
);

export const availableUsernameSchema = (available: boolean) =>
  v.pipe(
    usernameSchema,
    v.check(() => available, "That handle is already taken. Try another one."),
  );

export type Username = v.InferOutput<typeof usernameSchema>;
