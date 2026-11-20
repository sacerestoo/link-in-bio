"use client";

import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { lazy, Suspense, useState, type ReactElement } from "react";
import { useProfileAutosave } from "../hooks/use-profile-autosave";
import { usePage } from "../queries";
import { ProfileContent, ProfileFields } from "./profile-content";
import { ProfileImage } from "./profile-image";

const ProfileImagePicker = lazy(() =>
  import("./profile-image-picker").then(
    ({ ProfileImagePicker: ProfileImagePickerComponent }) => ({
      default: ProfileImagePickerComponent,
    }),
  ),
);

function ProfileImageSurface({
  handle,
  imageUrl,
  isOwner,
  onImageUrlChange,
}: Readonly<{
  handle: string;
  imageUrl: string | undefined;
  isOwner: boolean;
  onImageUrlChange: (imageUrl?: string) => void;
}>): ReactElement {
  return (
    <div className="group/image relative isolate size-28 self-start transition-[transform,scale] duration-200 ease-in-out has-[.profile-image-change-button:active]:scale-[0.97] page-wide:size-46">
      <div className="absolute inset-0 overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground">
        <ProfileImage src={imageUrl} />
      </div>

      <PermissionGate
        allowed={isOwner}
        whenAllowed={
          <Suspense fallback={null}>
            <ProfileImagePicker
              key={handle}
              handle={handle}
              imageUrl={imageUrl}
              onImageUrlChange={onImageUrlChange}
            />
          </Suspense>
        }
      />
    </div>
  );
}

function ProfilePageFields({
  handle,
  name,
  bio,
  isOwner,
}: Readonly<{
  handle: string;
  name: string;
  bio: string;
  isOwner: boolean;
}>): ReactElement {
  const draft = useProfileAutosave(handle, { name, bio });

  return (
    <ProfileFields
      name={draft.name}
      bio={draft.bio}
      readOnly={!isOwner}
      onNameChange={isOwner ? draft.setName : undefined}
      onBioChange={isOwner ? draft.setBio : undefined}
    />
  );
}

export function Profile({
  handle,
}: Readonly<{ handle: string }>): ReactElement {
  const { data: page } = usePage(handle);

  return (
    <ProfileView
      key={handle}
      handle={handle}
      name={page.name ?? ""}
      bio={page.bio ?? ""}
      imageUrl={page.imageUrl}
      isOwner={page.isOwner}
    />
  );
}

function ProfileView({
  handle,
  name,
  bio,
  imageUrl: pageImageUrl,
  isOwner,
}: Readonly<{
  handle: string;
  name: string;
  bio: string;
  imageUrl: string | undefined;
  isOwner: boolean;
}>): ReactElement {
  const [imageOverride, setImageOverride] = useState<string | null>(null);
  const imageUrl = imageOverride ?? pageImageUrl;
  const handleImageUrlChange = (nextImageUrl?: string) => {
    setImageOverride(nextImageUrl ?? "");
  };

  return (
    <div className="isolate flex min-h-svh w-full flex-col items-center page-wide:flex-row page-wide:items-start page-wide:justify-around page-wide:overflow-visible">
      <main className="mx-auto flex w-full max-w-107 shrink-0 flex-col items-center justify-start overflow-visible bg-background p-6 px-6 pt-12 page-wide:sticky page-wide:top-0 page-wide:mx-0 page-wide:min-h-dvh page-wide:w-2xl page-wide:max-w-none page-wide:min-w-0 page-wide:shrink page-wide:items-start page-wide:justify-between page-wide:gap-8 page-wide:self-start page-wide:px-16 page-wide:pt-16">
        <div className="w-full min-w-0">
          <ProfileContent
            image={
              <ProfileImageSurface
                handle={handle}
                imageUrl={imageUrl}
                isOwner={isOwner}
                onImageUrlChange={handleImageUrlChange}
              />
            }
          >
            <ProfilePageFields
              handle={handle}
              name={name}
              bio={bio}
              isOwner={isOwner}
            />
          </ProfileContent>
        </div>
      </main>
      <div
        aria-hidden="true"
        className="hidden page-wide:block page-wide:w-4xl page-wide:shrink-0"
      />
    </div>
  );
}
