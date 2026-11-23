import type { Handle, PageResponse } from "@grabbin/shared/schemas/page";
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
import { useEffect, useState, type ChangeEvent } from "react";
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

const preloadProfileImage = async (imageUrl: string): Promise<void> => {
  const image = new window.Image();
  image.src = imageUrl;
  await image.decode();
};

const uploadImageWithLocalPreview = async ({
  file,
  contentType,
  onLocalPreviewUrlChange,
  onUpload,
  onUploadSuccess,
}: Readonly<{
  file: File;
  contentType: ProfileImageContentType;
  onLocalPreviewUrlChange: (imageUrl: string | null) => void;
  onUpload: (input: ImageUploadInput) => Promise<UploadedImage>;
  onUploadSuccess: (image: UploadedImage) => void;
}>): Promise<void> => {
  let localPreviewUrl: string;
  try {
    localPreviewUrl = URL.createObjectURL(file);
  } catch (cause: unknown) {
    reportImageError("Image preview failed", cause);
    return;
  }
  onLocalPreviewUrlChange(localPreviewUrl);

  let uploadedImage: UploadedImage;
  try {
    uploadedImage = await onUpload({ file, contentType });
  } catch (cause: unknown) {
    onLocalPreviewUrlChange(null);
    reportImageError("Image upload failed", cause);
    return;
  }

  try {
    onUploadSuccess(uploadedImage);
    if (uploadedImage.imageUrl === undefined) {
      reportImageError(
        "Image uploaded but the preview could not load",
        new Error("No public image URL is configured."),
      );
      return;
    }

    await preloadProfileImage(uploadedImage.imageUrl);
  } catch (cause: unknown) {
    reportImageError("Image uploaded but the preview could not load", cause);
  } finally {
    onLocalPreviewUrlChange(null);
  }
};

const removeImageAndClearLocalPreview = async ({
  onRemove,
  onLocalPreviewUrlChange,
}: Readonly<{
  onRemove: () => Promise<void>;
  onLocalPreviewUrlChange: (imageUrl: string | null) => void;
}>): Promise<void> => {
  try {
    await onRemove();
    onLocalPreviewUrlChange(null);
  } catch (cause: unknown) {
    reportImageError("Image removal failed", cause);
  }
};

export const useProfileImageActions = (
  handle: Handle,
  persistedImageSrc: string | undefined,
) => {
  const [isReplacingImage, setIsReplacingImage] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const upload = useMutation(profileMutations.uploadImage(handle));
  const remove = useMutation(profileMutations.removeImage(handle));

  useEffect(
    () => () => {
      if (localPreviewUrl !== null) URL.revokeObjectURL(localPreviewUrl);
    },
    [localPreviewUrl],
  );

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;

    const contentType = validateImageFile(file);
    if (contentType === null) return;
    setIsReplacingImage(true);
    try {
      await uploadImageWithLocalPreview({
        file,
        contentType,
        onLocalPreviewUrlChange: setLocalPreviewUrl,
        onUpload: upload.mutateAsync,
        onUploadSuccess: ({ imageKey }) => {
          updateProfileImageCache(queryClient, handle, imageKey);
        },
      });
    } finally {
      setIsReplacingImage(false);
    }
  };

  const onRemove = () =>
    void removeImageAndClearLocalPreview({
      onRemove: async () => {
        await remove.mutateAsync();
        updateProfileImageCache(queryClient, handle, null);
      },
      onLocalPreviewUrlChange: setLocalPreviewUrl,
    });

  return {
    imageSrc: localPreviewUrl ?? persistedImageSrc,
    hasImage: localPreviewUrl !== null || persistedImageSrc !== undefined,
    isReplacingImage,
    isSaving: upload.isPending || isReplacingImage || remove.isPending,
    onFileChange,
    onRemove,
  };
};
