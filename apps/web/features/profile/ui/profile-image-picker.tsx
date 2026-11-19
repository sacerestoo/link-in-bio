"use client";

import { Button } from "@grabbin/ui/components/button";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
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
      className="absolute top-0 right-0 z-30 inline-flex items-center justify-center rounded-full opacity-0 shadow-large transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 hover:bg-secondary! focus-visible:scale-100 focus-visible:opacity-100 page-wide:top-2 page-wide:right-2"
    >
      <Trash
        className="size-5"
        aria-hidden="true"
      />
    </Button>
  );
}

export function ProfileImagePicker({
  initialImageUrl,
}: Readonly<{ initialImageUrl?: string }>): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const { imageUrl, handleFileChange, removeImage } =
    useImagePreview(initialImageUrl);

  return (
    <div className="group/image relative isolate size-28 self-start page-wide:size-46">
      <button
        type="button"
        aria-label="Change profile image"
        className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97]"
        onClick={() => inputRef.current?.click()}
      >
        <ProfileImage imageUrl={imageUrl} />
        {imageUrl !== undefined && imageUrl.length > 0 ? (
          <span className="pointer-events-none absolute inset-0 rounded-full bg-black/25 opacity-0 transition-opacity duration-150 ease-out group-hover/image:opacity-100" />
        ) : null}
      </button>
      {imageUrl !== undefined && imageUrl.length > 0 ? (
        <RemoveProfileImageButton onClick={removeImage} />
      ) : null}
      <input
        ref={inputRef}
        id="page-profile-image"
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  );
}

function useImagePreview(initialImageUrl?: string) {
  const previewUrlRef = useRef<string | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  useEffect(
    () => () => {
      if (previewUrlRef.current !== undefined)
        URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;

    if (previewUrlRef.current !== undefined)
      URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setImageUrl(previewUrl);
  }

  function removeImage() {
    if (previewUrlRef.current !== undefined)
      URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = undefined;
    setImageUrl(undefined);
  }

  return { imageUrl, handleFileChange, removeImage };
}
