"use client";

import { Button } from "@grabbin/ui/components/button";
import CircleFadingArrowUp from "lucide-react/icons/circle-fading-arrow-up";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { Trash } from "./trash";

function ProfileImageContent({ imageUrl }: Readonly<{ imageUrl?: string }>) {
  return (
    <span className="absolute inset-0 flex size-full items-center justify-center overflow-hidden rounded-full">
      {imageUrl !== undefined && imageUrl.length > 0 ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          className="rounded-full object-cover"
        />
      ) : (
        <CircleFadingArrowUp
          className="size-6 page-wide:size-9"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
      {imageUrl !== undefined && imageUrl.length > 0 ? (
        <span
          aria-hidden="true"
          className="outline-depth pointer-events-none absolute inset-0 z-10 rounded-full"
        />
      ) : null}
    </span>
  );
}

function ProfileImageButton({
  imageUrl,
  readOnly,
  onClick,
}: Readonly<{
  imageUrl?: string;
  readOnly: boolean;
  onClick: () => void;
}>): ReactElement {
  const imageContent = <ProfileImageContent imageUrl={imageUrl} />;
  return readOnly ? (
    <div
      aria-hidden="true"
      className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground"
    >
      {imageContent}
    </div>
  ) : (
    <button
      type="button"
      aria-label="Change profile image"
      className="relative flex size-full items-center justify-center overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground transition-[transform,scale,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-muted active:scale-[0.97]"
      onClick={onClick}
    >
      {imageContent}
      {imageUrl !== undefined && imageUrl.length > 0 ? (
        <span className="pointer-events-none absolute inset-0 rounded-full bg-black/25 opacity-0 transition-opacity duration-150 ease-out group-hover/image:opacity-100" />
      ) : null}
    </button>
  );
}

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
  readOnly = false,
}: Readonly<{ initialImageUrl?: string; readOnly?: boolean }>): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const { imageUrl, handleFileChange, removeImage } =
    useImagePreview(initialImageUrl);
  const displayedImageUrl = readOnly ? initialImageUrl : imageUrl;

  return (
    <div className="group/image relative isolate size-28 self-start page-wide:size-46">
      <ProfileImageButton
        imageUrl={displayedImageUrl}
        readOnly={readOnly}
        onClick={() => inputRef.current?.click()}
      />
      {readOnly || imageUrl === undefined || imageUrl.length === 0 ? null : (
        <RemoveProfileImageButton onClick={removeImage} />
      )}
      {readOnly ? null : (
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
      )}
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
