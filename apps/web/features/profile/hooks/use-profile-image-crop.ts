import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import type { Handle } from "@grabbin/shared/schemas/page";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { profileMutations } from "../mutations";

const isSameCrop = (
  currentCrop: ImageCrop | null,
  nextCrop: ImageCrop,
): boolean =>
  currentCrop !== null &&
  currentCrop.x === nextCrop.x &&
  currentCrop.y === nextCrop.y &&
  currentCrop.width === nextCrop.width &&
  currentCrop.height === nextCrop.height;

export const useProfileImageCrop = (
  handle: Handle,
  currentCrop: ImageCrop | null,
) => {
  const [pendingImageCrop, setPendingImageCrop] = useState<ImageCrop | null>(
    null,
  );
  const saveCropMutation = useMutation(
    profileMutations.updateProfile(handle, {
      onImageCropSaveSettled: () => {
        setPendingImageCrop(null);
      },
    }),
  );

  return {
    pendingImageCrop,
    isSavingCrop: saveCropMutation.isPending,
    onCropSaveError: (cause: unknown) => {
      toast.add({
        title: "Profile image crop failed",
        description:
          cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
      });
    },
    onApplyCrop: (imageCrop: ImageCrop) => {
      if (isSameCrop(currentCrop, imageCrop)) return Promise.resolve();

      setPendingImageCrop(imageCrop);
      return saveCropMutation.mutateAsync({ imageCrop });
    },
  };
};
