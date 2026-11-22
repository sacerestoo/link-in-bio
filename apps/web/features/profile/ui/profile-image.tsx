"use client";

import type { ReactElement } from "react";
import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { Skeleton } from "@grabbin/ui/components/skeleton";
import { usePage, type ProfilePageData } from "../queries";
import { ProfileImageEditor } from "./profile-image-editor";
import { ProfileImageView } from "./profile-image-view";

export function ProfileImage({
  handle,
}: Readonly<Pick<ProfilePageData, "handle">>): ReactElement {
  const { data: page } = usePage(handle);

  if (page === undefined)
    return <Skeleton className="size-28 rounded-full page-wide:size-46" />;

  return (
    <PermissionGate
      allowed={page.isOwner}
      whenAllowed={
        <ProfileImageEditor
          key={page.handle}
          page={page}
        />
      }
      whenDenied={
        <ProfileImageView
          imageSrc={page.imageSrc}
          hasImage={page.hasImage}
          crop={page.imageCrop}
        />
      }
    />
  );
}
