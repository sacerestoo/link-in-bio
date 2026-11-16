import { getOwnPage } from "@/features/auth/queries";
import { PageAccountMenu } from "@/features/auth/ui/page-account-menu";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
import { headers } from "next/headers";

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const requestHeaders = await headers();
  let isOwnPage = false;

  if (getSessionCookie(requestHeaders) !== null) {
    try {
      const api = await createServerApiClient(requestHeaders);
      isOwnPage = (await getOwnPage(api)).handle === handle;
    } catch (error: unknown) {
      if (
        !(
          error instanceof DetailedError &&
          (error.statusCode === 401 || error.statusCode === 404)
        )
      ) {
        throw error;
      }
    }
  }

  return (
    <div className="min-h-svh">{isOwnPage ? <PageAccountMenu /> : null}</div>
  );
}
