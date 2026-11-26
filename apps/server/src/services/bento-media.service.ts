import "server-only";
import type { Database } from "@grabbin/db";
import {
  renewPendingBentoMediaUpload,
  reserveBentoMediaUpload,
} from "@grabbin/db/repositories/bento";
import {
  BentoError,
  BENTO_MEDIA_MAX_SIZE,
  getBentoMediaObjectKey,
  isBentoMediaContentType,
  isBentoMediaObjectKeyForPage,
  type BentoItem,
  type BentoMediaUploadRequest,
  type BentoMediaUploadResponse,
} from "@grabbin/domain/bento";
import type { ServerBindings } from "../lib/env";
import { signR2Request } from "../lib/r2";

export class BentoMediaService {
  constructor(
    private readonly database: Database,
    private readonly env: ServerBindings,
    private readonly requestUrl: string,
  ) {}

  async createUpload(
    pageId: string,
    request: BentoMediaUploadRequest,
  ): Promise<BentoMediaUploadResponse> {
    const asset = await reserveBentoMediaUpload(
      this.database,
      request.uploadId,
      pageId,
    );
    if (!isBentoMediaObjectKeyForPage(asset.objectKey, pageId))
      throw new BentoError(
        "media-upload-page-conflict",
        "This media upload ID belongs to another page.",
      );
    if (asset.status === "pending_delete")
      throw new BentoError(
        "media-upload-expired",
        "This media upload has expired. Choose the file again.",
      );

    const inspection = await this.inspectObject(asset.objectKey);
    if (inspection === "uploaded")
      return { status: "uploaded", objectKey: asset.objectKey };
    if (asset.status !== "pending")
      throw new BentoError(
        "saved-media-missing",
        "The saved image is missing from storage.",
      );

    const renewedAsset = await renewPendingBentoMediaUpload(
      this.database,
      request.uploadId,
    );
    if (renewedAsset === undefined)
      throw new BentoError(
        "media-upload-expired",
        "This media upload has expired. Choose the file again.",
      );

    const uploadUrl = await signR2Request(
      this.env,
      this.requestUrl,
      "PUT",
      renewedAsset.objectKey,
      {
        "Content-Type": request.contentType,
        "If-None-Match": "*",
      },
    );
    if (uploadUrl === null)
      throw new BentoError(
        "media-upload-unavailable",
        "Image uploads are unavailable.",
      );

    return {
      status: "pending",
      objectKey: renewedAsset.objectKey,
      uploadUrl,
    };
  }

  async assertBatchMediaUploaded(
    pageId: string,
    items: readonly BentoItem[],
  ): Promise<void> {
    const mediaKeys = new Set<string>();
    for (const item of items) {
      if (item.type !== "media") continue;
      const objectKey = getBentoMediaObjectKey(item);
      if (
        objectKey === undefined ||
        !isBentoMediaObjectKeyForPage(objectKey, pageId)
      )
        throw new BentoError(
          "media-upload-required",
          "Upload an image before saving this Bento item.",
        );
      mediaKeys.add(objectKey);
    }

    for (const objectKey of mediaKeys) {
      const inspection = await this.inspectObject(objectKey);
      if (inspection === "missing")
        throw new BentoError(
          "media-upload-required",
          "Upload the image before saving this Bento item.",
        );
    }
  }

  private async inspectObject(
    objectKey: string,
  ): Promise<"uploaded" | "missing"> {
    const headUrl = await signR2Request(
      this.env,
      this.requestUrl,
      "HEAD",
      objectKey,
    );
    if (headUrl === null)
      throw new BentoError(
        "media-upload-unavailable",
        "Image uploads are unavailable.",
      );

    let response: Response;
    try {
      response = await fetch(headUrl, { method: "HEAD" });
    } catch {
      throw new BentoError(
        "media-confirmation-failed",
        "Could not confirm the media upload. Try again.",
      );
    }

    if (response.status === 404) return "missing";
    if (!response.ok)
      throw new BentoError(
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
      throw new BentoError(
        "invalid-media-file",
        "Choose a GIF, JPG, PNG, MP4, WebM, or MOV file up to 5 MB.",
      );

    return "uploaded";
  }
}
