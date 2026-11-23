"use client";

import type { ReactElement } from "react";
import CreateYoursLink from "@/features/auth/ui/create-yours-link";
import { authClient } from "@/lib/auth-client";
import { getCropStyle } from "@grabbin/shared/lib/image-crop";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@grabbin/ui/components/avatar";
import { Button } from "@grabbin/ui/components/button";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import Link from "next/link";
import { useMyPage, type ProfilePageData } from "../queries";

function MyPageLinkButton({
  page,
}: Readonly<{ page: ProfilePageData }>): ReactElement {
  return (
    <Button
      variant="ghost"
      size="default"
      className="group h-9.5 px-2 text-sm page-wide:h-9.5 page-wide:gap-1.5 page-wide:rounded-lg page-wide:px-2 page-wide:text-sm"
      render={
        <Link
          href={`/${encodeURIComponent(page.handle)}`}
          prefetch={false}
        />
      }
    >
      <span className="flex flex-row items-center gap-2">
        <div className="relative size-5 shrink-0">
          <Avatar
            size="xs"
            outline={false}
            className="size-full overflow-hidden"
          >
            <AvatarImage
              src={page.imageSrc}
              alt="avatar"
              style={
                page.imageCrop === null
                  ? undefined
                  : getCropStyle(page.imageCrop)
              }
            />
            <AvatarFallback className="bg-muted" />
          </Avatar>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-full profile-image-outline"
          />
        </div>
        <span className="text-muted-foreground group-hover:text-primary">
          My page
        </span>
      </span>
    </Button>
  );
}

export function MyPageLink({
  hasSessionCookie,
}: Readonly<{ hasSessionCookie: boolean }>): ReactElement | null {
  const { data: session, isPending } = authClient.useSession();
  const {
    data: page,
    status,
    isPending: isQueryPending,
  } = useMyPage(session?.user.id ?? null);

  const createYoursLink = (
    <div className="hidden page-wide:block">
      <CreateYoursLink
        size="lg"
        variant="outline"
        className="rounded-lg px-4"
      />
    </div>
  );

  if (session === null && (!isPending || !hasSessionCookie))
    return createYoursLink;

  if (isPending || (session !== null && isQueryPending))
    return <Skeleton className="h-9.5 w-26 page-wide:rounded-lg" />;

  if (session === null) return createYoursLink;

  if (status !== "success" || page === undefined) return null;

  return <MyPageLinkButton page={page} />;
}
