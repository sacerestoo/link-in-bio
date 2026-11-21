import type { ImageCrop } from "@grabbin/shared/schemas/image-crop";
import type {
  Handle,
  PageResponse,
  PageUpdate,
} from "@grabbin/shared/schemas/page";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { profileMutations } from "../mutations";
import { profileQueries } from "../queries";

const persistProfileCrop = async ({
  crop,
  handle,
  queryClient,
  onImageCropPreviewChange,
  onUpdate,
}: Readonly<{
  crop: ImageCrop;
  handle: Handle;
  queryClient: ReturnType<typeof useQueryClient>;
  onImageCropPreviewChange: (crop: ImageCrop | null) => void;
  onUpdate: (update: PageUpdate) => Promise<void>;
}>): Promise<void> => {
  onImageCropPreviewChange(crop);
  const cancelPageFetch = queryClient.cancelQueries({
    queryKey: profileQueries.byHandle(handle),
  });
  const previousCrop = queryClient.getQueryData<PageResponse>(
    profileQueries.byHandle(handle),
  )?.imageCrop;
  queryClient.setQueryData<PageResponse>(
    profileQueries.byHandle(handle),
    (page) => (page ? { ...page, imageCrop: crop } : page),
  );
  try {
    await cancelPageFetch;
    await onUpdate({ imageCrop: crop });
  } catch (cause: unknown) {
    queryClient.setQueryData<PageResponse>(
      profileQueries.byHandle(handle),
      (page) => (page ? { ...page, imageCrop: previousCrop ?? null } : page),
    );
    onImageCropPreviewChange(previousCrop ?? null);
    throw cause;
  }
  onImageCropPreviewChange(null);
};

export const useProfileImageCrop = (handle: Handle) => {
  const [imageCropPreview, setImageCropPreview] = useState<ImageCrop | null>(
    null,
  );
  const queryClient = useQueryClient();
  const cropMutation = useMutation(profileMutations.updateProfile(handle));

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
    onApply: (crop: ImageCrop) =>
      persistProfileCrop({
        crop,
        handle,
        queryClient,
        onImageCropPreviewChange: setImageCropPreview,
        onUpdate: cropMutation.mutateAsync,
      }),
  };
};
