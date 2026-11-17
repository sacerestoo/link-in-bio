import { QueryHydrationBoundary } from "@/features/app-shell/ui/query-hydration-boundary";
import { getOwnPageOrNull, ownPageQueryKey } from "@/features/auth/queries";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import { dehydrate } from "@tanstack/react-query";
import { getSessionCookie } from "better-auth/cookies";
import dynamic from "next/dynamic";
import { headers } from "next/headers";

const PageAccountMenu = dynamic(() =>
  import("@/features/auth/ui/page-account-menu").then(
    ({ PageAccountMenu: PageAccountMenuComponent }) => PageAccountMenuComponent,
  ),
);

const CreateYoursLink = dynamic(
  () => import("@/features/auth/ui/create-yours-link"),
);

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const requestHeaders = await headers();
  const hasSession = getSessionCookie(requestHeaders) !== null;
  const queryClient = getQueryClient();

  if (hasSession) {
    const api = await createServerApiClient(requestHeaders);
    queryClient.setQueryData(ownPageQueryKey(), await getOwnPageOrNull(api));
  }

  return (
    <QueryHydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-svh">
        <div className="fixed inset-x-0 bottom-8 z-40 flex justify-start px-8">
          <PermissionGate
            handle={handle}
            hasSession={hasSession}
            whenAllowed={<PageAccountMenu />}
            whenDenied={hasSession ? undefined : <CreateYoursLink />}
          />
        </div>
      </div>
    </QueryHydrationBoundary>
  );
}
