import type { Handle, PageResponse } from "@grabbin/shared/schemas/page";
import type { ChangeEvent } from "react";
import {
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_SIZE,
  type ProfileImageContentType,
} from "@grabbin/shared/lib/profile-image";
import { toast } from "@grabbin/ui/components/toast";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { profileMutations } from "../mutations";
import { profileQueries } from "../queries";

type ImageUploadInput = Readonly<{
  file: File;
  contentType: ProfileImageContentType;
}>;
type UploadedImage = Readonly<{
  imageKey: string;
  imageUrl: string | undefined;
}>;

const reportImageError = (title: string, cause: unknown): void => {
  toast.add({
    title,
    description: cause instanceof Error ? cause.message : "Please try again.",
    type: "error",
  });
};

const validateImageFile = (file: File): ProfileImageContentType | null => {
  if (
    !isProfileImageContentType(file.type) ||
    file.size === 0 ||
    file.size > PROFILE_IMAGE_MAX_SIZE
  ) {
    reportImageError(
      "Choose a valid image",
      new Error("Use a GIF, JPG, JPEG, or PNG image up to 5 MB."),
    );
    return null;
  }
  return file.type;
};

const updateProfileImageCache = (
  queryClient: QueryClient,
  handle: Handle,
  imageKey: string | null,
) => {
  queryClient.setQueryData<PageResponse>(
    profileQueries.byHandle(handle),
    (page) => (page ? { ...page, imageKey, imageCrop: null } : page),
  );
};

const uploadSelectedImage = async ({
  file,
  contentType,
  imageUrl,
  onImageUrlChange,
  onUpload,
  onUploadSuccess,
}: Readonly<{
  file: File;
  contentType: ProfileImageContentType;
  imageUrl: string | undefined;
  onImageUrlChange: (imageUrl?: string) => void;
  onUpload: (input: ImageUploadInput) => Promise<UploadedImage>;
  onUploadSuccess: (image: UploadedImage) => void;
}>): Promise<void> => {
  const previewUrl = URL.createObjectURL(file);
  onImageUrlChange(previewUrl);
  try {
    const uploadedImage = await onUpload({ file, contentType });
    onUploadSuccess(uploadedImage);
    onImageUrlChange(uploadedImage.imageUrl);
  } catch (cause: unknown) {
    onImageUrlChange(imageUrl);
    reportImageError("Image upload failed", cause);
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
};

const removeSelectedImage = async ({
  onRemove,
  onImageUrlChange,
}: Readonly<{
  onRemove: () => Promise<void>;
  onImageUrlChange: (imageUrl?: string) => void;
}>): Promise<void> => {
  try {
    await onRemove();
    onImageUrlChange();
  } catch (cause: unknown) {
    reportImageError("Image removal failed", cause);
  }
};

export const useProfileImageActions = (
  handle: Handle,
  imageUrl: string | undefined,
  onImageUrlChange: (imageUrl?: string) => void,
) => {
  const queryClient = useQueryClient();
  const upload = useMutation(profileMutations.uploadImage(handle));
  const remove = useMutation(profileMutations.removeImage(handle));

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;

    const contentType = validateImageFile(file);
    if (contentType === null) return;
    await uploadSelectedImage({
      file,
      contentType,
      imageUrl,
      onImageUrlChange,
      onUpload: upload.mutateAsync,
      onUploadSuccess: ({ imageKey }) => {
        updateProfileImageCache(queryClient, handle, imageKey);
      },
    });
  };

  const removeImage = () =>
    void removeSelectedImage({
      onRemove: async () => {
        await remove.mutateAsync();
        updateProfileImageCache(queryClient, handle, null);
      },
      onImageUrlChange,
    });

  return {
    isSaving: upload.isPending || remove.isPending,
    handleFileChange,
    removeImage,
  };
};
