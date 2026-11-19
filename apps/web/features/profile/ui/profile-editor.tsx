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
  const { name, bio, saveStatus, setName, setBio } = useProfileAutosave(
    handle,
    {
      name: initialName,
      bio: initialBio,
    },
  );

  return (
    <div>
      <ProfileContent
        name={name}
        bio={bio}
        image={<ProfileImagePicker initialImageUrl={initialImageUrl} />}
        readOnly={false}
        onNameChange={setName}
        onBioChange={setBio}
      />
      <p
        role="status"
        aria-live="polite"
        className="-mt-2 mb-4 min-h-4 text-xs text-muted-foreground"
      >
        {saveStatus === "saving"
          ? "Saving…"
          : saveStatus === "unsaved"
            ? "Unsaved changes"
            : saveStatus === "error"
              ? "Save failed. Please try again."
              : "Saved"}
      </p>
    </div>
  );
}
