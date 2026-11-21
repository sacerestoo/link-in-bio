"use client";

import type { ReactElement } from "react";
import type { ProfilePageData } from "../queries";
import { useProfileAutosave } from "../hooks/use-profile-autosave";
import { ProfileFields } from "./profile-fields";

type ProfileNameBioEditorProps = Readonly<
  Pick<ProfilePageData, "handle" | "name" | "bio">
>;

export function ProfileNameBioEditor({
  handle,
  name,
  bio,
}: ProfileNameBioEditorProps): ReactElement {
  const draft = useProfileAutosave(handle, {
    name,
    bio,
  });

  return (
    <ProfileFields
      name={draft.name}
      bio={draft.bio}
      readOnly={false}
      onNameChange={draft.setName}
      onBioChange={draft.setBio}
    />
  );
}
