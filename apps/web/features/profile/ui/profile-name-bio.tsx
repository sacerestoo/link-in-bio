"use client";

import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { lazy, Suspense, type ReactElement } from "react";
import { usePage, type ProfilePageData } from "../queries";
import { ProfileFields } from "./profile-fields";

const ProfileNameBioEditor = lazy(() =>
  import("./profile-name-bio-editor").then(
    ({ ProfileNameBioEditor: ProfileNameBioEditorComponent }) => ({
      default: ProfileNameBioEditorComponent,
    }),
  ),
);

export function ProfileNameBio({
  handle,
}: Readonly<Pick<ProfilePageData, "handle">>): ReactElement {
  const { data: page } = usePage(handle);
  if (page === undefined)
    return (
      <ProfileFields
        name=""
        bio=""
        readOnly
      />
    );

  const readOnlyFields = (
    <ProfileFields
      name={page.name}
      bio={page.bio}
      readOnly
    />
  );

  return (
    <PermissionGate
      allowed={page.isOwner}
      whenAllowed={
        <Suspense fallback={readOnlyFields}>
          <ProfileNameBioEditor
            handle={handle}
            name={page.name}
            bio={page.bio}
          />
        </Suspense>
      }
      whenDenied={readOnlyFields}
    />
  );
}
