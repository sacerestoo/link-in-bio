import type { Handle } from "@grabbin/domain/page";
import { bentoMediaUploadResponseContract } from "@/features/bento/contracts";
import { api, type ApiClient } from "@/lib/api-client";
import { readJson } from "@/shared/lib/contract";
import {
  BENTO_MEDIA_MAX_SIZE,
  isBentoMediaContentType,
  type BentoMediaContentType,
  type BentoMediaUploadResponse,
} from "@grabbin/domain/bento-media";

export type BentoMediaUploadTask = Readonly<{
  objectKey: string;
  completion: Promise<void>;
}>;

const requestBentoMediaUpload = async (
  handle: Handle,
  file: File,
  uploadId: string,
  contentType: BentoMediaContentType,
  client: ApiClient,
): Promise<BentoMediaUploadResponse> => {
  const response = await client.v1.pages[":handle"]["bento-media-upload"].$post(
    {
      param: { handle },
      json: { uploadId, contentType, size: file.size },
    },
  );
  return readJson(bentoMediaUploadResponseContract, response);
};

const putBentoMediaFile = async (
  uploadUrl: string,
  file: File,
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
      "If-None-Match": "*",
    },
    body: file,
  });
  if (!response.ok) throw new Error("Could not upload the image. Try again.");
};

const uploadWithRecovery = async (
  handle: Handle,
  file: File,
  uploadId: string,
  firstUpload: Extract<BentoMediaUploadResponse, { status: "pending" }>,
  contentType: BentoMediaContentType,
  client: ApiClient,
): Promise<void> => {
  try {
    await putBentoMediaFile(firstUpload.uploadUrl, file);
  } catch {
    const confirmedUpload = await requestBentoMediaUpload(
      handle,
      file,
      uploadId,
      contentType,
      client,
    );
    if (confirmedUpload.status === "uploaded") return;

    try {
      await putBentoMediaFile(confirmedUpload.uploadUrl, file);
    } catch {
      const finalConfirmation = await requestBentoMediaUpload(
        handle,
        file,
        uploadId,
        contentType,
        client,
      );
      if (finalConfirmation.status === "uploaded") return;
      throw new Error("Could not confirm the media upload. Try again.");
    }
  }
};

export const startBentoMediaUpload = async (
  handle: Handle,
  file: File,
  uploadId: string,
  client: ApiClient = api,
): Promise<BentoMediaUploadTask> => {
  const contentType = file.type;
  if (!isBentoMediaContentType(contentType))
    throw new Error("Choose a GIF, JPG, PNG, MP4, WebM, or MOV file.");
  if (file.size === 0 || file.size > BENTO_MEDIA_MAX_SIZE)
    throw new Error("Bento media files must be 5 MB or smaller.");

  const upload = await requestBentoMediaUpload(
    handle,
    file,
    uploadId,
    contentType,
    client,
  );
  const completion =
    upload.status === "uploaded"
      ? Promise.resolve()
      : uploadWithRecovery(handle, file, uploadId, upload, contentType, client);
  void completion.catch(() => {});

  return { objectKey: upload.objectKey, completion };
};
