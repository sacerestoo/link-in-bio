"use client";

import type { ReactElement } from "react";
import { useProfileAutosave } from "../hooks/use-profile-autosave";
import { ProfileContent } from "./profile-content";
import { ProfileImagePicker } from "./profile-image-picker";

export function ProfileEditor({
  handle,
  initialName,
  initialBio,
}: Readonly<{
  handle: string;
  initialName: string;
  initialBio: string;
}>): ReactElement {
  const { name, bio, setName, setBio } = useProfileAutosave(handle, {
    name: initialName,
    bio: initialBio,
  });

  return (
    <ProfileContent
      name={name}
      bio={bio}
      image={<ProfileImagePicker handle={handle} />}
      readOnly={false}
      onNameChange={setName}
      onBioChange={setBio}
    />
  );
}
