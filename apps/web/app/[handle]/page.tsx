import CreateYoursLink from "@/features/auth/ui/create-yours-link";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { profileQueries } from "@/features/profile/queries";
import { Profile } from "@/features/profile/ui/profile";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const MyPageLink = dynamic(() =>
  import("@/features/profile/ui/my-page-link").then(
    ({ MyPageLink: MyPageLinkComponent }) => MyPageLinkComponent,
  ),
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
      <div className="flex min-h-svh flex-col">
        <Profile handle={handle} />
        <div
          aria-hidden="true"
          className="min-h-0 flex-1 page-wide:hidden"
        />
        <aside className="mx-auto flex w-full max-w-107 shrink-0 justify-center bg-background p-6 page-wide:fixed page-wide:inset-x-0 page-wide:bottom-8 page-wide:z-40 page-wide:max-w-none page-wide:justify-start page-wide:bg-transparent page-wide:p-0 page-wide:px-8">
          <PermissionGate
            allowed={page.isOwner}
            denied={!page.isOwner}
            whenAllowed={<ProfileActions />}
            whenDenied={<MyPageLink />}
          />
        </aside>

        <aside className="fixed bottom-18 left-1/2 z-40 w-max -translate-x-1/2 page-wide:bottom-8">
          <PermissionGate
            allowed={page.isOwner}
            denied={!page.isOwner}
            whenDenied={<CreateYoursLink />}
          />
        </aside>
      </div>
    </HydrationBoundary>
  );
}
