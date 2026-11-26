import { PageError, type PageViolation } from "@grabbin/db/repositories/page";
import { HTTPException } from "hono/http-exception";

const pageErrorStatus: Record<PageViolation, 400 | 404 | 409> = {
  "not-found": 404,
  "invalid-handle": 400,
  "handle-unavailable": 400,
  "handle-conflict": 409,
  "invalid-bento-batch": 400,
  "image-required": 400,
};

export const withPageErrors = async <T>(
  onAction: () => Promise<T>,
): Promise<T> => {
  try {
    return await onAction();
  } catch (error) {
    if (error instanceof PageError)
      throw new HTTPException(pageErrorStatus[error.violation], {
        message: error.message,
      });
    throw error;
  }
};
