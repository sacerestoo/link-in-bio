import "server-only";
import { createApiClient } from "@/lib/api-client";
import { getServerBinding } from "@/lib/env";

export const createServerApiClient = async (
  requestHeaders: Pick<Headers, "get">,
  requestOrigin: string,
) => {
  const server = await getServerBinding();
  return createApiClient(requestOrigin, (input, init) => {
    const headers = new Headers(init?.headers);
    const cookie = requestHeaders.get("cookie");
    if (cookie !== null) headers.set("cookie", cookie);
    return server.fetch(new Request(input, { ...init, headers }));
  });
};
