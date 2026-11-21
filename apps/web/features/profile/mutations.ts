import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";
import { api, type ApiClient } from "@/lib/api-client";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  profileImageUploadResponseSchema,
  type Handle,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { mutationOptions } from "@tanstack/react-query";
import * as v from "valibot";
import { putProfileImage } from "./api";
import { getProfileImageUrl, profileQueries } from "./queries";

const checkHandleAvailability = async (
  rawHandle: string,
  client: ApiClient = api,
): Promise<Handle> => {
  const validHandle = v.parse(handleSchema, rawHandle);
  const { available } = v.parse(
    v.object({ available: v.boolean() }),
    await client.v1.pages.handle
      .$post({ json: { handle: validHandle } })
      .then((response) => response.json()),
  );
  if (!available) throw new Error(HANDLE_UNAVAILABLE_MESSAGE);
  return validHandle;
};

const updatePageHandle = async (
  currentHandle: Handle,
  requestedHandle: Handle,
  client: ApiClient = api,
): Promise<Handle> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle: currentHandle },
    json: { handle: requestedHandle },
  });
  return requestedHandle;
};

const updatePageProfile = async (
  handle: Handle,
  update: PageUpdate,
  client: ApiClient = api,
): Promise<void> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: update,
  });
};

const uploadProfileImage = async (
  handle: Handle,
  file: File,
  contentType: ProfileImageContentType,
): Promise<{ imageKey: string; imageUrl: string | undefined }> => {
  const { imageKey, uploadUrl } = v.parse(
    profileImageUploadResponseSchema,
    await api.v1.pages[":handle"]["image-upload"]
      .$post({ param: { handle }, json: { contentType, size: file.size } })
      .then((response) => response.json()),
  );
  await putProfileImage(uploadUrl, file, contentType);
  await api.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey, imageCrop: null },
  });
  return { imageKey, imageUrl: getProfileImageUrl(imageKey) };
};

const removeProfileImage = async (handle: Handle): Promise<void> => {
  await api.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey: null, imageCrop: null },
  });
};

export const profileMutations = {
  checkHandle: (client: ApiClient = api) =>
    mutationOptions({
      mutationFn: (rawHandle: string) =>
        checkHandleAvailability(rawHandle, client),
    }),
  changeHandle: (
    currentHandle: Handle,
    callbacks: Readonly<{
      onSuccess: (updatedHandle: Handle) => void;
      onError: (cause: unknown) => void;
    }>,
    client: ApiClient = api,
  ) =>
    mutationOptions({
      mutationKey: profileQueries.byHandle(currentHandle),
      mutationFn: (requestedHandle: Handle) =>
        updatePageHandle(currentHandle, requestedHandle, client),
      onSuccess: callbacks.onSuccess,
      onError: callbacks.onError,
    }),
  updateProfile: (handle: Handle, client: ApiClient = api) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-update"],
      mutationFn: (update: PageUpdate) =>
        updatePageProfile(handle, update, client),
    }),
  uploadImage: (handle: Handle) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-upload"],
      mutationFn: (input: {
        file: File;
        contentType: ProfileImageContentType;
      }) => uploadProfileImage(handle, input.file, input.contentType),
    }),
  removeImage: (handle: Handle) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-remove"],
      mutationFn: () => removeProfileImage(handle),
    }),
};
