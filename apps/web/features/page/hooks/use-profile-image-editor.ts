import type { ImageDimensions } from "@grabbin/domain/image-crop";
import { useState, type ChangeEvent } from "react";
import type { ProfilePageData } from "../queries";
import { useProfileImageActions } from "./use-profile-image-actions";
import { useProfileImageCrop } from "./use-profile-image-crop";

export const useProfileImageEditor = (page: ProfilePageData) => {
  const [isCropEditorOpen, setIsCropEditorOpen] = useState(false);
  const [sourceImageDimensions, setSourceImageDimensions] =
    useState<ImageDimensions>({
      width: 0,
      height: 0,
    });

  const cropSave = useProfileImageCrop(page.handle, page.imageCrop);
  const image = useProfileImageActions(page.handle, page.imageSrc);

  const displayedImageCrop = (() => {
    switch (image.isReplacingImage) {
      case true:
        // The incoming image must not inherit the previous image's crop.
        return null;
      case false:
        if (cropSave.pendingImageCrop !== null)
          return cropSave.pendingImageCrop;
        return page.imageCrop;
      default:
        return page.imageCrop;
    }
  })();

  const isSaving = image.isSaving || cropSave.isSavingCrop;

  return {
    view: {
      imageSrc: image.imageSrc,
      hasImage: image.hasImage,
      crop: displayedImageCrop,
      isCropEditorOpen,
      onImageLoad: (imageElement: HTMLImageElement) => {
        setSourceImageDimensions({
          width: imageElement.naturalWidth,
          height: imageElement.naturalHeight,
        });
      },
    },
    controls: {
      sourceImageDimensions,
      isSaving,
      isImageChangeDisabled: isSaving || isCropEditorOpen,
      canRemoveImage: image.hasImage && !isCropEditorOpen && !isSaving,
      onRemove: image.onRemove,
      onFileChange: (event: ChangeEvent<HTMLInputElement>) => {
        void image.onFileChange(event);
      },
    },
    cropEditor: {
      onApply: cropSave.onApplyCrop,
      onError: cropSave.onCropSaveError,
      onOpenChange: setIsCropEditorOpen,
    },
  };
};
