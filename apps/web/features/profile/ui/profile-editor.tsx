"use client";

import type { ReactElement } from "react";
import Loading from "@grabbin/ui/components/loading";
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
  const { name, bio, isSaving, setName, setBio } = useProfileAutosave(handle, {
    name: initialName,
    bio: initialBio,
  });

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
      {isSaving ? (
        <p
          role="status"
          aria-live="polite"
          className="-mt-2 mb-4 flex min-h-4 items-center gap-2 text-xs text-muted-foreground"
        >
          <Loading
            aria-hidden="true"
            className="size-4"
          />
          <span>Saving</span>
        </p>
      ) : null}
    </div>
  );
}
