"use client";

import { lazy, Suspense, type ReactElement } from "react";
import { usePage } from "../queries";
import { PermissionGate } from "./permission-gate";
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
}: Readonly<{ handle: string }>): ReactElement {
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
          <ProfileNameBioEditor page={page} />
        </Suspense>
      }
      whenDenied={readOnlyFields}
    />
  );
}
