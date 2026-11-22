"use client";

import { PermissionGate } from "@/features/auth/ui/permission-gate";
import { Button } from "@grabbin/ui/components/button";
import { ImageCropEditor } from "@grabbin/ui/components/image-crop-editor";
import CircleFadingArrowUp from "lucide-react/icons/circle-fading-arrow-up";
import { useRef, type ReactElement } from "react";
import type { ProfilePageData } from "../queries";
import { useProfileImageEditor } from "../hooks/use-profile-image-editor";
import { ProfileImageView } from "./profile-image-view";
import { Trash } from "./trash";

export function ProfileImageEditor({
  page,
}: Readonly<{ page: ProfilePageData }>): ReactElement {
  const { view, controls, cropEditor } = useProfileImageEditor(page);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <ProfileImageView
      {...view}
      editorControls={
        <div className="pointer-events-none absolute inset-0">
          <Button
            type="button"
            static
            variant="ghost"
            size="icon"
            aria-label="Change profile image"
            aria-busy={controls.isSaving}
            className="profile-image-change-button pointer-events-auto absolute inset-0 flex size-full items-center justify-center overflow-visible rounded-full bg-transparent text-sm font-medium text-muted-foreground hover:bg-muted/10"
            onClick={() => inputRef.current?.click()}
            disabled={controls.isChangeDisabled}
          >
            <PermissionGate
              allowed={!view.hasImage}
              whenAllowed={
                <CircleFadingArrowUp className="size-7 xl:size-10" />
              }
            />
          </Button>
          <PermissionGate
            allowed={controls.canRemove}
            whenAllowed={
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Remove profile image"
                onClick={controls.onRemove}
                className="pointer-events-auto absolute top-0 right-0 z-30 inline-flex size-9 items-center justify-center rounded-full opacity-0 shadow-large transition-[opacity,transform,scale,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/image:scale-100 group-hover/image:opacity-100 hover:bg-secondary! focus-visible:scale-100 focus-visible:opacity-100 page-wide:top-2 page-wide:right-2 xl:size-10"
              >
                <Trash
                  className="size-5"
                  aria-hidden="true"
                />
              </Button>
            }
          />
          <input
            ref={inputRef}
            id="page-profile-image"
            type="file"
            accept="image/gif,image/jpeg,image/png"
            aria-hidden="true"
            tabIndex={-1}
            className="pointer-events-auto sr-only"
            disabled={controls.isSaving}
            onChange={controls.onFileChange}
          />
          <ImageCropEditor
            src={view.hasImage ? view.imageSrc : undefined}
            crop={view.crop}
            sourceSize={controls.sourceSize}
            isSaving={controls.isSaving}
            onApply={cropEditor.onApply}
            onError={cropEditor.onError}
            onOpenChange={cropEditor.onOpenChange}
          />
        </div>
      }
    />
  );
}
