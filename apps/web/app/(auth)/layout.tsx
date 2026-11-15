import type { ReactNode } from "react";
import { getOwnPage } from "@/features/auth/queries";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const AuthLayout = async ({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> => {
  const requestHeaders = await headers();
  if (getSessionCookie(requestHeaders) === null) return children;

  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (host === null) throw new Error("Missing request host.");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const api = await createServerApiClient(
    requestHeaders,
    `${protocol}://${host}`,
  );
  try {
    const { handle } = await getOwnPage(api);
    redirect(`/redirect?redirectTo=${encodeURIComponent(`/${handle}`)}`);
  } catch (error: unknown) {
    if (!(error instanceof DetailedError && error.statusCode === 401)) {
      throw error;
    }
  }
  return children;
};

export default AuthLayout;
