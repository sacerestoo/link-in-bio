import { getOwnPage } from "@/features/auth/queries";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";

function localDestination(value: string, requestUrl: URL): URL | undefined {
  try {
    const destination = new URL(value, requestUrl);
    if (!value.startsWith("/") || destination.origin !== requestUrl.origin) {
      return undefined;
    }
    return destination;
  } catch {
    return undefined;
  }
}

function redirect(destination: URL): Response {
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: destination.href,
    },
  });
}

export const GET = async (request: Request): Promise<Response> => {
  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirectTo");
  const requestedDestination =
    redirectTo === null ? undefined : localDestination(redirectTo, requestUrl);
  if (requestedDestination !== undefined) return redirect(requestedDestination);

  if (getSessionCookie(request.headers) === null) {
    return redirect(new URL("/sign-in", requestUrl));
  }

  const api = await createServerApiClient(request.headers, requestUrl.origin);
  try {
    const { handle } = await getOwnPage(api);
    return redirect(new URL(`/${encodeURIComponent(handle)}`, requestUrl));
  } catch (error: unknown) {
    if (error instanceof DetailedError && error.statusCode === 401) {
      return redirect(new URL("/sign-in", requestUrl));
    }
    throw error;
  }
};
