"use client";

import type { ReactElement } from "react";
import { useProfileAutosave } from "../hooks/use-profile-autosave";
import { ProfileContent } from "./profile-content";
import { ProfileImagePicker } from "./profile-image-picker";

export function ProfileEditor({
  handle,
  initialName,
  initialBio,
  initialImageUrl,
}: Readonly<{
  handle: string;
  initialName: string;
  initialBio: string;
  initialImageUrl?: string;
}>): ReactElement {
  const { name, bio, setName, setBio } = useProfileAutosave(handle, {
    name: initialName,
    bio: initialBio,
  });

  return (
    <ProfileContent
      name={name}
      bio={bio}
      image={<ProfileImagePicker initialImageUrl={initialImageUrl} />}
      readOnly={false}
      onNameChange={setName}
      onBioChange={setBio}
    />
  );
}
