"use client";

import type { PageResponse } from "@grabbin/shared/schemas/page";
import type { ReactElement } from "react";
import { usePageAutosave } from "../hooks/use-page-autosave";
import { ProfileFields } from "./profile-fields";

type ProfileNameBioEditorProps = Readonly<{ page: PageResponse }>;

export function ProfileNameBioEditor({
  page,
}: ProfileNameBioEditorProps): ReactElement {
  const draft = usePageAutosave(page.handle, page);

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
