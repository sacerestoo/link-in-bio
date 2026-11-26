import "server-only";
import {
  BENTO_MEDIA_MAX_SIZE,
  BentoMediaError,
  isBentoMediaContentType,
} from "@grabbin/domain/bento-media";
import type { ServerBindings } from "./env";
import { signR2Request } from "./r2";

export const inspectBentoMediaObject = async (
  env: ServerBindings,
  requestUrl: string,
  objectKey: string,
): Promise<"uploaded" | "missing"> => {
  const headUrl = await signR2Request(env, requestUrl, "HEAD", objectKey);
  if (headUrl === null)
    throw new BentoMediaError(
      "media-upload-unavailable",
      "Image uploads are unavailable.",
    );

  let response: Response;
  try {
    response = await fetch(headUrl, { method: "HEAD" });
  } catch {
    throw new BentoMediaError(
      "media-confirmation-failed",
      "Could not confirm the media upload. Try again.",
    );
  }

  if (response.status === 404) return "missing";
  if (!response.ok)
    throw new BentoMediaError(
      "media-confirmation-failed",
      "Could not confirm the media upload. Try again.",
    );

  const contentLength = Number(response.headers.get("content-length"));
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (
    !isBentoMediaContentType(contentType ?? null) ||
    !Number.isInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > BENTO_MEDIA_MAX_SIZE
  )
    throw new BentoMediaError(
      "invalid-media-file",
      "Choose a GIF, JPG, PNG, MP4, WebM, or MOV file up to 5 MB.",
    );

  return "uploaded";
};
