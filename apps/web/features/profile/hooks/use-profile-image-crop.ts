import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import type { Handle } from "@grabbin/shared/schemas/page";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { profileMutations } from "../mutations";

export const useProfileImageCrop = (handle: Handle) => {
  const [imageCropPreview, setImageCropPreview] = useState<ImageCrop | null>(
    null,
  );
  const cropMutation = useMutation(
    profileMutations.updateProfile(handle, {
      onImageCropPreviewClear: () => {
        setImageCropPreview(null);
      },
    }),
  );

  return {
    imageCropPreview,
    isSaving: cropMutation.isPending,
    onError: (cause: unknown) => {
      toast.add({
        title: "Profile image crop failed",
        description:
          cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
      });
    },
    onApply: (crop: ImageCrop) => {
      setImageCropPreview(crop);
      return cropMutation.mutateAsync({ imageCrop: crop });
    },
  };
};
