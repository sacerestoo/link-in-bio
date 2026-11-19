import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { profileQueries } from "@/features/profile/queries";
import { Profile } from "@/features/profile/ui/profile";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getSessionCookie } from "better-auth/cookies";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const CreateYoursLink = dynamic(
  () => import("@/features/auth/ui/create-yours-link"),
);

const ProfileActions = dynamic(() =>
  import("@/features/profile/ui/profile-actions").then(
    ({ ProfileActions: ProfileActionsComponent }) => ProfileActionsComponent,
  ),
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
  const serverApi = await createServerApiClient(requestHeaders);

  const page = await queryClient
    .query(profileQueries.detail(handle, serverApi))
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        "statusCode" in error &&
        (error.statusCode === 400 || error.statusCode === 404)
      )
        notFound();
      throw error;
    });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-svh">
        <Profile
          key={page.handle}
          handle={handle}
        />
        <div className="fixed inset-x-0 bottom-8 z-40 flex justify-start px-8">
          <PermissionGate
            allowed={page.isOwner && hasSession}
            denied={!page.isOwner || !hasSession}
            whenAllowed={<ProfileActions />}
            whenDenied={<CreateYoursLink />}
          />
        </div>
      </div>
    </HydrationBoundary>
  );
}
