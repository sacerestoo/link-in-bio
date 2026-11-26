import type { PageUpdate } from "@grabbin/shared/schemas/page";
import {
  PROFILE_IMAGE_CACHE_CONTROL,
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_SIZE,
  type ProfileImageContentType,
} from "@grabbin/shared/lib/profile-image";
import { HTTPException } from "hono/http-exception";
import type { ServerBindings } from "./env";
import { signR2Request } from "./r2";

export const isProfileImageKeyOwnedByUser = (
  userId: string,
  imageKey: string | null | undefined,
): imageKey is string =>
  typeof imageKey === "string" &&
  imageKey.startsWith(`profile-images/${userId}/`);

export const shouldResetImageCrop = (update: PageUpdate): boolean =>
  update.imageKey !== undefined && update.imageCrop === undefined;

export const createProfileImageUpload = async (
  env: ServerBindings,
  requestUrl: string,
  userId: string,
  contentType: ProfileImageContentType,
): Promise<{ imageKey: string; uploadUrl: string } | null> => {
  const extension =
    contentType === "image/gif"
      ? "gif"
      : contentType === "image/png"
        ? "png"
        : "jpg";
  const imageKey = `profile-images/${userId}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = await signR2Request(env, requestUrl, "PUT", imageKey, {
    "Content-Type": contentType,
    "Cache-Control": PROFILE_IMAGE_CACHE_CONTROL,
  });
  if (uploadUrl === null) return null;
  return { imageKey, uploadUrl };
};

export const deleteProfileImageObject = async (
  env: ServerBindings,
  requestUrl: string,
  imageKey: string,
): Promise<void> => {
  const deleteUrl = await signR2Request(env, requestUrl, "DELETE", imageKey);
  if (deleteUrl === null) throw new Error("Image uploads are unavailable");
  const response = await fetch(deleteUrl, { method: "DELETE" });
  if (!response.ok)
    throw new Error(`R2 image deletion failed with status ${response.status}`);
};

export const validateProfileImageObject = async (
  env: ServerBindings,
  requestUrl: string,
  userId: string,
  imageKey: string,
): Promise<
  "valid" | "invalidKey" | "unavailable" | "uploadMissing" | "invalidImage"
> => {
  if (!isProfileImageKeyOwnedByUser(userId, imageKey)) return "invalidKey";

  const headUrl = await signR2Request(env, requestUrl, "HEAD", imageKey);
  if (headUrl === null) return "unavailable";
  const response = await fetch(headUrl, { method: "HEAD" });
  if (!response.ok) return "uploadMissing";

  const contentLength = Number(response.headers.get("content-length"));
  if (
    !isProfileImageContentType(response.headers.get("content-type")) ||
    !Number.isInteger(contentLength) ||
    contentLength < 1 ||
    contentLength > PROFILE_IMAGE_MAX_SIZE
  ) {
    try {
      await deleteProfileImageObject(env, requestUrl, imageKey);
    } catch (error: unknown) {
      console.error("Could not remove invalid profile image", error);
    }
    return "invalidImage";
  }

  return "valid";
};

export const ensureProfileImageIsValid = async (
  env: ServerBindings,
  requestUrl: string,
  userId: string,
  imageKey: string,
): Promise<void> => {
  const result = await validateProfileImageObject(
    env,
    requestUrl,
    userId,
    imageKey,
  );
  if (result === "valid") return;

  const errors = {
    invalidKey: { status: 400, message: "Invalid profile image" },
    uploadMissing: {
      status: 400,
      message: "Upload the image before saving it",
    },
    invalidImage: {
      status: 413,
      message: "Choose a GIF, JPG, JPEG, or PNG image up to 5 MB.",
    },
    unavailable: {
      status: 503,
      message: "Image uploads are unavailable",
    },
  } as const;
  const error = errors[result];
  throw new HTTPException(error.status, { message: error.message });
};
