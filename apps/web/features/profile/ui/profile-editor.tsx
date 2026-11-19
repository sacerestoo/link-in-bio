"use client";

import { useState, type ReactElement } from "react";
import { ProfileContent } from "./profile-content";
import { ProfileImagePicker } from "./profile-image-picker";

export function ProfileEditor({
  initialName,
  initialBio,
  initialImageUrl,
}: Readonly<{
  initialName: string;
  initialBio: string;
  initialImageUrl?: string;
}>): ReactElement {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);

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
