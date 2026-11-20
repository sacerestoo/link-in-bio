"use client";

import { Button } from "@grabbin/ui/components/button";
import CircleFadingArrowUp from "lucide-react/icons/circle-fading-arrow-up";
import { useRef, type ReactElement } from "react";
import { useProfileImage } from "../hooks/use-profile-image";
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
      className="pointer-events-auto absolute top-0 right-0 z-30 inline-flex size-9 items-center justify-center rounded-full opacity-0 shadow-large transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 hover:bg-secondary! focus-visible:scale-100 focus-visible:opacity-100 page-wide:top-2 page-wide:right-2 xl:size-10"
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
  imageUrl,
  onImageUrlChange,
}: Readonly<{
  handle: string;
  imageUrl: string | undefined;
  onImageUrlChange: (imageUrl?: string) => void;
}>): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isSaving, handleFileChange, removeImage } = useProfileImage(
    handle,
    imageUrl,
    onImageUrlChange,
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute inset-0 overflow-hidden rounded-full">
        <Button
          type="button"
          static
          variant="ghost"
          size="icon"
          aria-label="Change profile image"
          className="profile-image-change-button absolute inset-0 flex size-full items-center justify-center bg-transparent text-sm font-medium text-muted-foreground hover:bg-muted/10"
          onClick={() => inputRef.current?.click()}
          disabled={isSaving}
        >
          {imageUrl === undefined || imageUrl.length === 0 ? (
            <CircleFadingArrowUp className="size-7 xl:size-10" />
          ) : null}
        </Button>
      </div>
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
        className="pointer-events-auto sr-only"
        onChange={(event) => void handleFileChange(event)}
      />
    </div>
  );
}
