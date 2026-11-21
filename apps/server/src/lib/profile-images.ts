import type { PageUpdate } from "@grabbin/shared/schemas/page";
import {
  PROFILE_IMAGE_CACHE_CONTROL,
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_SIZE,
  type ProfileImageContentType,
} from "@grabbin/shared/lib/profile-image";
import { AwsClient } from "aws4fetch";
import { HTTPException } from "hono/http-exception";
import type { ServerBindings } from "./env";

const LOCAL_R2_ACCESS_KEY_ID = "grabbin-local-r2";
const LOCAL_R2_SECRET_ACCESS_KEY = "grabbin-local-r2-secret";
const R2_UPLOAD_URL_TTL_SECONDS = 300;
type R2Signer = Readonly<{
  client: AwsClient;
  endpoint: string;
  bucketName: string;
}>;

export const isProfileImageKeyOwnedByUser = (
  userId: string,
  imageKey: string | null | undefined,
): imageKey is string =>
  typeof imageKey === "string" &&
  imageKey.startsWith(`profile-images/${userId}/`);

export const shouldResetImageCrop = (update: PageUpdate): boolean =>
  update.imageKey !== undefined && update.imageCrop === undefined;

const createR2Signer = (
  env: ServerBindings,
  requestUrl: string,
): R2Signer | null => {
  const requestUrlObject = new URL(requestUrl);
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(
    requestUrlObject.hostname,
  );
  const accountId = env.R2_ACCOUNT_ID;
  const accessKeyId = isLocal ? LOCAL_R2_ACCESS_KEY_ID : env.R2_ACCESS_KEY_ID;
  const secretAccessKey = isLocal
    ? LOCAL_R2_SECRET_ACCESS_KEY
    : env.R2_SECRET_ACCESS_KEY;

  if (env.R2_BUCKET_NAME === undefined || env.R2_BUCKET_NAME.length === 0)
    return null;
  if (
    !isLocal &&
    (accountId === undefined ||
      accountId.length === 0 ||
      accessKeyId === undefined ||
      accessKeyId.length === 0 ||
      secretAccessKey === undefined ||
      secretAccessKey.length === 0)
  )
    return null;

  return {
    client: new AwsClient({
      service: "s3",
      region: "auto",
      accessKeyId: accessKeyId ?? "",
      secretAccessKey: secretAccessKey ?? "",
    }),
    endpoint: isLocal
      ? `${requestUrlObject.origin}/cdn-cgi/local/r2/s3`
      : `https://${accountId}.r2.cloudflarestorage.com`,
    bucketName: env.R2_BUCKET_NAME,
  };
};

const signR2Request = async (
  env: ServerBindings,
  requestUrl: string,
  method: "DELETE" | "HEAD" | "PUT",
  imageKey: string,
  contentType?: string,
  cacheControl?: string,
): Promise<string | null> => {
  const signer = createR2Signer(env, requestUrl);
  if (signer === null) return null;
  const { client, endpoint, bucketName } = signer;
  const objectPath = [bucketName, ...imageKey.split("/")]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const signedRequest = await client.sign(
    new Request(
      `${endpoint}/${objectPath}?X-Amz-Expires=${R2_UPLOAD_URL_TTL_SECONDS}`,
      {
        method,
        headers: {
          ...(contentType === undefined ? {} : { "Content-Type": contentType }),
          ...(cacheControl === undefined
            ? {}
            : { "Cache-Control": cacheControl }),
        },
      },
    ),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signedRequest.url;
};

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
  const uploadUrl = await signR2Request(
    env,
    requestUrl,
    "PUT",
    imageKey,
    contentType,
    PROFILE_IMAGE_CACHE_CONTROL,
  );
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
