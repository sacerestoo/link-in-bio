"use client";

import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { lazy, Suspense, type ReactElement } from "react";
import { usePage, type ProfilePageData } from "../queries";
import { ProfileImageView } from "./profile-image-view";

const ProfileImageEditor = lazy(() =>
  import("./profile-image-editor").then(
    ({ ProfileImageEditor: ProfileImageEditorComponent }) => ({
      default: ProfileImageEditorComponent,
    }),
  ),
);

export function ProfileImage({
  handle,
}: Readonly<Pick<ProfilePageData, "handle">>): ReactElement {
  const { data: page } = usePage(handle);
  const readOnlyImage = (
    <ProfileImageView
      imageSrc={page.imageSrc}
      hasImage={page.hasImage}
      crop={page.imageCrop}
    />
  );

  return (
    <PermissionGate
      allowed={page.isOwner}
      whenAllowed={
        <Suspense fallback={readOnlyImage}>
          <ProfileImageEditor
            key={handle}
            handle={handle}
            imageSrc={page.imageSrc}
            hasImage={page.hasImage}
            imageCrop={page.imageCrop}
          />
        </Suspense>
      }
      whenDenied={readOnlyImage}
    />
  );
}
