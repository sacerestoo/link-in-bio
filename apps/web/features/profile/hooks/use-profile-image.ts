import type { ChangeEvent } from "react";
import {
  isProfileImageContentType,
  PROFILE_IMAGE_MAX_SIZE,
  type ProfileImageContentType,
} from "@grabbin/shared/lib/profile-image";
import { toast } from "@grabbin/ui/components/toast";
import { useMutation } from "@tanstack/react-query";
import { profileQueries } from "../queries";

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

export const useProfileImage = (
  handle: string,
  imageUrl: string | undefined,
  onImageUrlChange: (imageUrl?: string) => void,
) => {
  const upload = useMutation(profileQueries.uploadImage(handle));
  const remove = useMutation(profileQueries.removeImage(handle));
  const isSaving = upload.isPending || remove.isPending;

  const uploadSelectedImage = async (
    file: File,
    contentType: ProfileImageContentType,
  ) => {
    const previewUrl = URL.createObjectURL(file);
    onImageUrlChange(previewUrl);
    try {
      onImageUrlChange(await upload.mutateAsync({ file, contentType }));
    } catch (cause: unknown) {
      onImageUrlChange(imageUrl);
      reportImageError("Image upload failed", cause);
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const removeSelectedImage = async () => {
    try {
      await remove.mutateAsync();
      onImageUrlChange();
    } catch (cause: unknown) {
      reportImageError("Image removal failed", cause);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file === undefined) return;

    const contentType = validateImageFile(file);
    if (contentType !== null) await uploadSelectedImage(file, contentType);
  };

  const removeImage = () => void removeSelectedImage();

  return { isSaving, handleFileChange, removeImage };
};
