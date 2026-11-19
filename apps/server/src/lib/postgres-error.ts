import "server-only";

export const isPostgresUniqueViolation = (
  error: unknown,
  constraint: string,
): boolean =>
  error instanceof Error &&
  "code" in error &&
  error.code === "23505" &&
  "constraint" in error &&
  error.constraint === constraint;
