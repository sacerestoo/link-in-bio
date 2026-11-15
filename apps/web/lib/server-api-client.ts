import "server-only";
import { createApiClient } from "@/lib/api-client";
import { getServerBinding } from "@/lib/env";

export const createServerApiClient = async (
  requestHeaders: Pick<Headers, "get">,
) => {
  const server = await getServerBinding();

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host === null) throw new Error("Missing request host.");

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  const requestOrigin = `${protocol}://${host}`;

  return createApiClient(requestOrigin, (input, init) => {
    const headers = new Headers(init?.headers);
    const cookie = requestHeaders.get("cookie");
    if (cookie !== null) headers.set("cookie", cookie);
    return server.fetch(new Request(input, { ...init, headers }));
  });
};
