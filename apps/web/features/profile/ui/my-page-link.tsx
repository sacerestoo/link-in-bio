"use client";

import type { ReactElement } from "react";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
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
      className="h-9.5 px-2 text-sm page-wide:h-9.5 page-wide:gap-1.5 page-wide:rounded-lg page-wide:px-2 page-wide:text-sm"
      render={
        <Link
          href={`/${encodeURIComponent(page.handle)}`}
          prefetch={false}
        />
      }
    >
      <span className="flex flex-row items-center gap-2">
        <div className="relative size-6 shrink-0">
          <Avatar
            size="sm"
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
        <span className="text-muted-foreground">My page</span>
      </span>
    </Button>
  );
}

export function MyPageLink(): ReactElement | null {
  const { data: session, isPending } = authClient.useSession();
  const {
    data: page,
    status,
    isPending: isQueryPending,
  } = useMyPage(session?.user.id ?? null);

  return (
    <PermissionGate
      allowed={isPending || (session !== null && isQueryPending)}
      whenAllowed={<Skeleton className="h-9 w-26 page-wide:rounded-lg" />}
      whenDenied={
        <PermissionGate
          allowed={!!session}
          whenAllowed={
            <PermissionGate
              allowed={status === "success"}
              whenAllowed={page && <MyPageLinkButton page={page} />}
            />
          }
          whenDenied={
            <Button
              nativeButton={false}
              variant="ghost"
              size="default"
              className="px-2.5 text-sm text-muted-foreground page-wide:gap-1.5 page-wide:px-2.5 page-wide:text-sm"
              render={
                <Link
                  href="/sign-in"
                  prefetch={false}
                />
              }
            >
              Sign in
            </Button>
          }
        />
      }
    />
  );
}
