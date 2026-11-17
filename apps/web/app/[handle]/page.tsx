import { getOwnPage } from "@/features/auth/queries";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { createServerApiClient } from "@/lib/server-api-client";
import { getSessionCookie } from "better-auth/cookies";
import { DetailedError } from "hono/client";
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
  let isOwnPage = false;

  if (hasSession) {
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
    <div className="min-h-svh">
      <div className="fixed inset-x-0 bottom-8 z-40 flex justify-start px-8">
        <PermissionGate
          hasPermission={isOwnPage}
          whenAllowed={<PageAccountMenu />}
          whenDenied={
            !hasSession && !isOwnPage ? <CreateYoursLink /> : undefined
          }
        />
      </div>
    </div>
  );
}
