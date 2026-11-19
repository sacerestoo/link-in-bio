"use client";

import { Button } from "@grabbin/ui/components/button";
import CircleFadingArrowUp from "lucide-react/icons/circle-fading-arrow-up";
import { useRef, type ReactElement } from "react";
import { useProfileImage } from "../hooks/use-profile-image";
import { usePage } from "../queries";
import { ProfileImage } from "./profile-image";
import { Trash } from "./trash";

function RemoveProfileImageButton({
  onClick,
}: Readonly<{ onClick: () => void }>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label="Remove profile image"
      onClick={onClick}
      className="absolute top-0 right-0 z-30 inline-flex size-9 items-center justify-center rounded-full opacity-0 shadow-large transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 hover:bg-secondary! focus-visible:scale-100 focus-visible:opacity-100 page-wide:top-2 page-wide:right-2 xl:size-10"
    >
      <Trash
        className="size-5"
        aria-hidden="true"
      />
    </Button>
  );
}

export function ProfileImagePicker({
  handle,
}: Readonly<{ handle: string }>): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: page } = usePage(handle);
  const { imageUrl, isSaving, handleFileChange, removeImage } = useProfileImage(
    handle,
    page,
  );

  return (
    <div className="group/image relative isolate size-28 self-start page-wide:size-46">
      <button
        type="button"
        aria-label="Change profile image"
        className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97]"
        onClick={() => inputRef.current?.click()}
        disabled={isSaving}
      >
        <ProfileImage src={imageUrl} />
        <CircleFadingArrowUp className="size-7 xl:size-10" />
      </button>
      {imageUrl !== undefined && imageUrl.length > 0 && !isSaving ? (
        <RemoveProfileImageButton onClick={removeImage} />
      ) : null}
      <input
        ref={inputRef}
        id="page-profile-image"
        type="file"
        accept="image/gif,image/jpeg,image/png"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => void handleFileChange(event)}
      />
    </div>
  );
}
