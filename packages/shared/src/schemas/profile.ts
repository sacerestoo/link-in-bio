import * as v from "valibot";

// Placeholder contract shared by the web app and its API.
export const usernameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(3),
  v.maxLength(30),
  v.regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u),
);

export type Username = v.InferOutput<typeof usernameSchema>;
