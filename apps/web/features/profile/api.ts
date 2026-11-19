import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";

export const putProfileImage = async (
  uploadUrl: string,
  file: File,
  contentType: ProfileImageContentType,
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!response.ok) throw new Error("Could not upload the image. Try again.");
};
