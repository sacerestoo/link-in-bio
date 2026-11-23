import "server-only";
import type { ReactElement } from "react";
import CreateYoursLink from "@/features/auth/ui/create-yours-link";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { profileQueries } from "@/features/profile/queries";
import { MyPageLink } from "@/features/profile/ui/my-page-link";
import { PageCreatedConfetti } from "@/features/profile/ui/page-created-confetti";
import { Profile } from "@/features/profile/ui/profile";
import { ProfileActions } from "@/features/profile/ui/profile-actions";
import { getQueryClient } from "@/lib/query-client";
import { createServerApiClient } from "@/lib/server-api-client";
import {
  PAGE_CREATED_COOKIE_NAME,
  PAGE_CREATED_COOKIE_VALUE,
} from "@grabbin/shared/lib/page-created-event";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getSessionCookie } from "better-auth/cookies";
import dynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

const ProfileSaveIndicator = dynamic(() =>
  import("@/features/profile/ui/indicator").then(
    ({ default: IndicatorComponent }) => IndicatorComponent,
  ),
);

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

  const cookieStore = await cookies();
  const hasPageCreatedEvent =
    cookieStore.get(PAGE_CREATED_COOKIE_NAME)?.value ===
    PAGE_CREATED_COOKIE_VALUE;
  const hasSessionCookie = getSessionCookie(requestHeaders) !== null;

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-svh flex-col">
        <PermissionGate
          allowed={hasPageCreatedEvent}
          whenAllowed={<PageCreatedConfetti />}
        />
        <Profile handle={handle} />
        <div
          aria-hidden="true"
          className="min-h-0 flex-1 page-wide:hidden"
        />
        <aside className="w-full shrink-0 bg-secondary page-wide:fixed page-wide:inset-x-0 page-wide:bottom-8 page-wide:z-40 page-wide:bg-transparent">
          <div className="mx-auto flex h-17 w-full max-w-107 shrink-0 items-center justify-center gap-2 p-6 page-wide:h-9.5 page-wide:max-w-none page-wide:justify-start page-wide:p-0 page-wide:px-8">
            <PermissionGate
              allowed={page.isOwner}
              whenAllowed={<ProfileActions />}
              whenDenied={<MyPageLink hasSessionCookie={hasSessionCookie} />}
            />
            <Link
              href="/"
              className="px-2 text-sm font-medium text-muted-foreground hover:text-primary"
              prefetch={false}
            >
              Home
            </Link>
            <PermissionGate
              allowed={page.isOwner}
              whenAllowed={<ProfileSaveIndicator />}
            />
          </div>
        </aside>
        <aside className="fixed bottom-18 left-1/2 z-40 w-max -translate-x-1/2 page-wide:hidden">
          <PermissionGate
            allowed={!page.isOwner}
            whenAllowed={<CreateYoursLink />}
          />
        </aside>
      </div>
    </HydrationBoundary>
  );
}
