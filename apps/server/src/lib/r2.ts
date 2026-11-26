import "server-only";
import { AwsClient } from "aws4fetch";
import type { ServerBindings } from "./env";

const LOCAL_R2_ACCESS_KEY_ID = "grabbin-local-r2";
const LOCAL_R2_SECRET_ACCESS_KEY = "grabbin-local-r2-secret";

type R2Signer = Readonly<{
  client: AwsClient;
  endpoint: string;
  bucketName: string;
}>;

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

export const signR2Request = async (
  env: ServerBindings,
  requestUrl: string,
  method: "DELETE" | "HEAD" | "PUT",
  objectKey: string,
  headers: Readonly<Record<string, string>> = {},
): Promise<string | null> => {
  const signer = createR2Signer(env, requestUrl);
  if (signer === null) return null;
  const { client, endpoint, bucketName } = signer;
  const objectPath = [bucketName, ...objectKey.split("/")]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const signedRequest = await client.sign(
    new Request(`${endpoint}/${objectPath}?X-Amz-Expires=300`, {
      method,
      headers,
    }),
    { aws: { signQuery: true, allHeaders: true } },
  );
  return signedRequest.url;
};
