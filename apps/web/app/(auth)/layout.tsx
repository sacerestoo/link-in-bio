import type { ReactNode } from "react";
import { pageQueries } from "@/features/page/queries";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const AuthLayout = async ({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactNode> => {
  const requestHeaders = await headers();
  if (getSessionCookie(requestHeaders) === null) return children;

  const serverApi = await createServerApiClient(requestHeaders);

  const page = await getQueryClient().query(pageQueries.myPage(serverApi));
  if (page !== null) {
    const { handle } = page;
    redirect(`/${encodeURIComponent(handle)}`, "replace");
  }
  return children;
};

export default AuthLayout;
