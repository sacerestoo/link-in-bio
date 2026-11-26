import "server-only";
import type { ReactElement } from "react";
import { pageQueries } from "@/features/page/queries";
import CreateYoursLink from "@/features/page/ui/create-yours-link";
import { PageCreatedConfetti } from "@/features/page/ui/page-created-confetti";
import { PermissionGate } from "@/features/page/ui/permission-gate";
import { Profile } from "@/features/page/ui/profile";
import ProfileFooter from "@/features/page/ui/profile-footer";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import {
  PAGE_CREATED_COOKIE_NAME,
  PAGE_CREATED_COOKIE_VALUE,
} from "@grabbin/shared/event";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getSessionCookie } from "better-auth/cookies";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function HandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<ReactElement> {
  const { handle } = await params;
  const requestHeaders = await headers();
  const queryClient = getQueryClient();
  const serverApi = await createServerApiClient(requestHeaders);

  const page = await queryClient
    .query(pageQueries.detail(handle, serverApi))
    .catch((error: unknown) => {
      if (
        error instanceof Error &&
        "statusCode" in error &&
        (error.statusCode === 400 || error.statusCode === 404)
      )
        notFound();
      throw error;
    });

  const cookieStore = await cookies();
  const hasPageCreatedEvent =
    cookieStore.get(PAGE_CREATED_COOKIE_NAME)?.value ===
    PAGE_CREATED_COOKIE_VALUE;
  const hasSessionCookie = getSessionCookie(requestHeaders) !== null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-svh flex-col">
        <Profile handle={handle} />
        <div
          aria-hidden="true"
          className="min-h-0 flex-1 page-wide:hidden"
        />
        <ProfileFooter
          hasSession={hasSessionCookie}
          isOwner={page.isOwner}
        />
        <aside className="fixed bottom-18 left-1/2 z-40 w-max -translate-x-1/2 page-wide:hidden">
          <PermissionGate
            allowed={!page.isOwner}
            whenAllowed={<CreateYoursLink />}
          />
        </aside>

        <PermissionGate
          allowed={hasPageCreatedEvent}
          whenAllowed={<PageCreatedConfetti />}
        />
      </div>
    </HydrationBoundary>
  );
}
