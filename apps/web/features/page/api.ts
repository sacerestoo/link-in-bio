import {
  PROFILE_IMAGE_CACHE_CONTROL,
  type ProfileImageContentType,
} from "@grabbin/domain/page";

export const putProfileImage = async (
  uploadUrl: string,
  file: File,
  contentType: ProfileImageContentType,
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Cache-Control": PROFILE_IMAGE_CACHE_CONTROL,
    },
    body: file,
  });
  if (!response.ok) throw new Error("Could not upload the image. Try again.");
};
