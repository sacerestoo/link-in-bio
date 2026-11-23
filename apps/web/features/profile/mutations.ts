import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";
import { api, type ApiClient } from "@/lib/api-client";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  profileImageUploadResponseSchema,
  type Handle,
  type PageResponse,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { mutationOptions } from "@tanstack/react-query";
import * as v from "valibot";
import { putProfileImage } from "./api";
import { getProfileImageUrl, profileQueries } from "./queries";

type UpdateProfileOptions = Readonly<{
  client?: ApiClient;
  onImageCropSaveSettled?: () => void;
}>;
type UpdateProfileContext = Readonly<{
  previousImageCrop: PageResponse["imageCrop"];
}>;

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
  updateProfile: (handle: Handle, options: UpdateProfileOptions = {}) =>
    mutationOptions<void, Error, PageUpdate, UpdateProfileContext | null>({
      mutationKey: [...profileQueries.byHandle(handle), "profile-update"],
      mutationFn: (update: PageUpdate) =>
        updatePageProfile(handle, update, options.client),
      onMutate: async (update, { client: queryClient }) => {
        if (update.imageCrop === undefined) return null;

        await queryClient.cancelQueries({
          queryKey: profileQueries.byHandle(handle),
        });
        const previousImageCrop =
          queryClient.getQueryData<PageResponse>(
            profileQueries.byHandle(handle),
          )?.imageCrop ?? null;
        queryClient.setQueryData<PageResponse>(
          profileQueries.byHandle(handle),
          (page) =>
            page ? { ...page, imageCrop: update.imageCrop ?? null } : page,
        );
        return { previousImageCrop };
      },
      onError: async (...args) => {
        const [, update, optimisticContext, { client: queryClient }] = args;
        if (update.imageCrop === undefined) return;

        if (optimisticContext !== null && optimisticContext !== undefined)
          queryClient.setQueryData<PageResponse>(
            profileQueries.byHandle(handle),
            (page) =>
              page
                ? { ...page, imageCrop: optimisticContext.previousImageCrop }
                : page,
          );

        options.onImageCropSaveSettled?.();
        await queryClient.invalidateQueries({
          queryKey: profileQueries.byHandle(handle),
        });
      },
      onSuccess: (...args) => {
        const [, update] = args;
        if (update.imageCrop === undefined) return;

        options.onImageCropSaveSettled?.();
      },
    }),
  uploadImage: (handle: Handle) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-upload"],
      mutationFn: (input: {
        file: File;
        contentType: ProfileImageContentType;
      }) => uploadProfileImage(handle, input.file, input.contentType),
      onError: async (...args) => {
        const [, , , { client }] = args;
        await client.invalidateQueries({
          queryKey: profileQueries.byHandle(handle),
        });
      },
    }),
  removeImage: (handle: Handle) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-remove"],
      mutationFn: () => removeProfileImage(handle),
    }),
};
