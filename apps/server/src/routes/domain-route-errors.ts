import { PageError, type PageViolation } from "@grabbin/db/repositories/page";
import { BentoError, type BentoViolation } from "@grabbin/domain/bento";
import { HTTPException } from "hono/http-exception";

const pageErrorStatus: Record<PageViolation, 400 | 404 | 409> = {
  "not-found": 404,
  "invalid-handle": 400,
  "handle-unavailable": 400,
  "handle-conflict": 409,
  "invalid-bento-batch": 400,
  "image-required": 400,
};

const bentoErrorStatus: Record<BentoViolation, 400 | 409 | 410 | 503> = {
  "item-page-conflict": 409,
  "media-upload-page-conflict": 409,
  "media-key-page-mismatch": 400,
  "media-upload-expired": 410,
  "saved-media-missing": 409,
  "media-upload-unavailable": 503,
  "media-confirmation-failed": 503,
  "invalid-media-file": 400,
  "media-upload-required": 400,
  "media-not-uploaded": 400,
};

export const withDomainErrors = async <T>(
  onAction: () => Promise<T>,
): Promise<T> => {
  try {
    return await onAction();
  } catch (error) {
    if (error instanceof PageError)
      throw new HTTPException(pageErrorStatus[error.violation], {
        message: error.message,
      });
    if (error instanceof BentoError)
      throw new HTTPException(bentoErrorStatus[error.violation], {
        message: error.message,
      });
    throw error;
  }
};
