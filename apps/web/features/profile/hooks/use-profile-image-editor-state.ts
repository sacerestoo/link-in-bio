import { useState, type ChangeEvent } from "react";
import type { ProfilePageData } from "../queries";
import { useProfileImage } from "./use-profile-image";
import { useProfileImageCrop } from "./use-profile-image-crop";

export type ProfileImageEditorStateInput = Readonly<
  Pick<ProfilePageData, "handle" | "imageSrc" | "hasImage" | "imageCrop">
>;

export const useProfileImageEditorState = ({
  handle,
  imageSrc: pageImageSrc,
  hasImage: pageHasImage,
  imageCrop: pageCrop,
}: ProfileImageEditorStateInput) => {
  const [imageUrlOverride, setImageUrlOverride] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [isCropOpen, setIsCropOpen] = useState(false);
  const crop = useProfileImageCrop(handle);
  const src = imageUrlOverride ?? pageImageSrc;
  const hasImage =
    imageUrlOverride === null ? pageHasImage : imageUrlOverride.length > 0;
  const image = useProfileImage(handle, src, (imageUrl) => {
    setImageUrlOverride(imageUrl ?? "");
  });
  const isSaving = image.isSaving || crop.isSaving;
  const isLocalImage = src?.startsWith("blob:") === true;
  const imageCrop = isLocalImage ? null : (crop.imageCropPreview ?? pageCrop);

  return {
    image: {
      imageSrc: hasImage ? (imageUrlOverride ?? pageImageSrc) : undefined,
      crop: imageCrop,
      sourceSize,
      isSaving,
      isChangeDisabled: isSaving || isCropOpen,
      hasImage,
      canRemove: hasImage && !isCropOpen && !isSaving,
      onLoad: (imageElement: HTMLImageElement) => {
        setSourceSize({
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
        });
      },
      onRemove: image.removeImage,
      onFileChange: (event: ChangeEvent<HTMLInputElement>) => {
        void image.handleFileChange(event);
      },
    },
    cropEditor: {
      onApply: crop.onApply,
      onError: crop.onError,
      onOpenChange: setIsCropOpen,
    },
  };
};
