import "server-only";
import type { Database } from "@grabbin/db";
import type { BentoItem } from "@grabbin/shared/schemas/bento-item";
import type {
  BentoMediaUploadRequest,
  BentoMediaUploadResponse,
} from "@grabbin/shared/schemas/bento-media";
import {
  BENTO_MEDIA_MAX_SIZE,
  isBentoMediaContentType,
} from "@grabbin/shared/lib/bento-media";
import type { ServerBindings } from "../lib/env";
import { BentoMediaError } from "../lib/bento-media-error";
import { isBentoMediaObjectKeyForPage } from "../lib/bento-media-object-key";
import { signR2Request } from "../lib/r2";
import { BentoMediaAssetsService } from "./bento-media-assets.service";

export const getBentoMediaObjectKey = (item: BentoItem): string | undefined => {
  if (item.type !== "media") return undefined;
  const objectKey = item.data.objectKey;
  return typeof objectKey === "string" ? objectKey : undefined;
};

export class BentoMediaService {
  private readonly assets: BentoMediaAssetsService;

  constructor(
    private readonly database: Database,
    private readonly env: ServerBindings,
    private readonly requestUrl: string,
  ) {
    this.assets = new BentoMediaAssetsService(database);
  }

  async createUpload(
    pageId: string,
    request: BentoMediaUploadRequest,
  ): Promise<BentoMediaUploadResponse> {
    const asset = await this.assets.reserveUpload(request.uploadId, pageId);
    if (!isBentoMediaObjectKeyForPage(asset.objectKey, pageId))
      throw new BentoMediaError(
        "This media upload ID belongs to another page.",
        409,
      );
    if (asset.status === "pending_delete")
      throw new BentoMediaError(
        "This media upload has expired. Choose the file again.",
        410,
      );

    const inspection = await this.inspectObject(asset.objectKey);
    if (inspection === "uploaded")
      return { status: "uploaded", objectKey: asset.objectKey };
    if (asset.status !== "pending")
      throw new BentoMediaError(
        "The saved image is missing from storage.",
        409,
      );

    const renewedAsset = await this.assets.renewPendingUpload(request.uploadId);
    if (renewedAsset === undefined)
      throw new BentoMediaError(
        "This media upload has expired. Choose the file again.",
        410,
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
      throw new BentoMediaError("Image uploads are unavailable.", 503);

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
        throw new BentoMediaError(
          "Upload an image before saving this Bento item.",
          400,
        );
      mediaKeys.add(objectKey);
    }

    for (const objectKey of mediaKeys) {
      const inspection = await this.inspectObject(objectKey);
      if (inspection === "missing")
        throw new BentoMediaError(
          "Upload the image before saving this Bento item.",
          400,
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
      throw new BentoMediaError("Image uploads are unavailable.", 503);

    let response: Response;
    try {
      response = await fetch(headUrl, { method: "HEAD" });
    } catch {
      throw new BentoMediaError(
        "Could not confirm the media upload. Try again.",
        503,
      );
    }

    if (response.status === 404) return "missing";
    if (!response.ok)
      throw new BentoMediaError(
        "Could not confirm the media upload. Try again.",
        503,
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
        "Choose a GIF, JPG, PNG, MP4, WebM, or MOV file up to 5 MB.",
        400,
      );

    return "uploaded";
  }
}
