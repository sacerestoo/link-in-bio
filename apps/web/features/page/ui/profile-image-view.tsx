import type { ReactElement, ReactNode } from "react";
import { getCropStyle } from "@grabbin/shared/lib/image-crop";
import { cn } from "@grabbin/ui/lib/utils";
import Image from "next/image";
import type { ProfilePageData } from "../queries";
import { PermissionGate } from "./permission-gate";

type ProfileImageViewProps = Readonly<
  Pick<ProfilePageData, "imageSrc" | "hasImage"> & {
    crop: ProfilePageData["imageCrop"];
    isCropEditorOpen?: boolean;
    onLoad?: (image: HTMLImageElement) => void;
    editorControls?: ReactNode;
  }
>;

export function ProfileImageView({
  imageSrc,
  hasImage,
  crop,
  isCropEditorOpen = false,
  onLoad,
  editorControls,
}: ProfileImageViewProps): ReactElement {
  return (
    <div
      className={cn(
        "group/image relative isolate size-28 self-start transition-[transform,scale] duration-200 ease-in-out has-[.profile-image-change-button:active]:scale-[0.97] page-wide:size-46",
        isCropEditorOpen ? "z-50" : "",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-full bg-brand-light-gray text-sm font-medium text-muted-foreground profile-image-outline",
        )}
      >
        <PermissionGate
          allowed={hasImage}
          whenAllowed={
            <div
              className={crop ? "absolute" : "absolute inset-0"}
              style={crop ? getCropStyle(crop) : undefined}
            >
              <Image
                fill
                src={imageSrc ?? ""}
                alt=""
                loading="eager"
                fetchPriority="high"
                unoptimized
                className="size-full rounded-full object-cover profile-image-outline"
                onLoad={(event) => onLoad?.(event.currentTarget)}
              />
            </div>
          }
        />
      </div>

      {editorControls}
    </div>
  );
}
