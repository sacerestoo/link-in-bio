import type { ImageDimensions } from "@grabbin/shared/lib/image-crop";
import { useState, type ChangeEvent } from "react";
import type { ProfilePageData } from "../queries";
import { useProfileImageActions } from "./use-profile-image-actions";
import { useProfileImageCrop } from "./use-profile-image-crop";

export const useProfileImageEditor = (page: ProfilePageData) => {
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [sourceSize, setSourceSize] = useState<ImageDimensions>({
    width: 0,
    height: 0,
  });
  const crop = useProfileImageCrop(page.handle);
  const image = useProfileImageActions(page.handle, page.imageSrc);
  const imageCrop = image.isPreviewing
    ? null
    : (crop.imageCropPreview ?? page.imageCrop);
  const isSaving = image.isSaving || crop.isSaving;

  return {
    view: {
      imageSrc: image.imageSrc,
      hasImage: image.hasImage,
      crop: imageCrop,
      onLoad: (imageElement: HTMLImageElement) => {
        setSourceSize({
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
        });
      },
    },
    controls: {
      sourceSize,
      isSaving,
      isChangeDisabled: isSaving || isCropOpen,
      canRemove: image.hasImage && !isCropOpen && !isSaving,
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
