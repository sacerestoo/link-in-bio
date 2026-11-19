import type { ReactNode } from "react";
import { authQueries } from "@/features/auth/queries";
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

  const serverApi = await createServerApiClient(requestHeaders);

  try {
    const { handle } = await authQueries.currentPage(serverApi);
    redirect(`/${encodeURIComponent(handle)}`, "replace");
  } catch (error: unknown) {
    if (!(error instanceof DetailedError && error.statusCode === 401)) {
      throw error;
    }
  }
  return children;
};

export default AuthLayout;
