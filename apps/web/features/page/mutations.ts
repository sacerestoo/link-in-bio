import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";
import { api, type ApiClient } from "@/lib/api-client";
import {
  profileImageUploadResponseSchema,
  pageResponseSchema,
  type Handle,
  type PageResponse,
  type PageSaveRequest,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { mutationOptions } from "@tanstack/react-query";
import * as v from "valibot";
import { putProfileImage } from "./api";
import { applyPageSaveRequest } from "./batch";
import { getProfileImageUrl, pageQueries } from "./queries";

type UpdatePageOptions = Readonly<{
  client?: ApiClient;
  onImageCropSaveSettled?: () => void;
}>;
type UpdateProfileContext = Readonly<{
  previousImageCrop: PageResponse["imageCrop"];
}>;
export type PageSaveVariables = Readonly<{
  handle: Handle;
  save: PageSaveRequest;
  waitForMediaUploads: () => Promise<void>;
}>;
type PageSaveContext = Readonly<{
  previousPage: PageResponse | undefined;
}>;

export const pageMutationKeys = {
  savePage: (handle: Handle) =>
    [...pageQueries.byHandle(handle), "save"] as const,
  uploadImage: (handle: Handle) =>
    [...pageQueries.byHandle(handle), "profile-image-upload"] as const,
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

const removeProfileImage = async (
  handle: Handle,
  client: ApiClient = api,
): Promise<void> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey: null, imageCrop: null },
  });
};

const savePage = async (
  handle: Handle,
  save: PageSaveRequest,
  client: ApiClient = api,
): Promise<PageResponse> => {
  const response = await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: save,
  });
  return v.parse(pageResponseSchema, await response.json());
};

export const pageMutations = {
  savePage: (handle: Handle) =>
    mutationOptions<PageResponse, Error, PageSaveVariables, PageSaveContext>({
      mutationKey: pageMutationKeys.savePage(handle),
      mutationFn: async ({ handle: saveHandle, save, waitForMediaUploads }) => {
        await waitForMediaUploads();
        return savePage(saveHandle, save);
      },
      onMutate: async ({ handle: saveHandle, save }, { client }) => {
        await client.cancelQueries({
          queryKey: pageQueries.byHandle(saveHandle),
        });
        const previousPage = client.getQueryData<PageResponse>(
          pageQueries.byHandle(saveHandle),
        );
        if (previousPage !== undefined)
          client.setQueryData(
            pageQueries.byHandle(saveHandle),
            applyPageSaveRequest(previousPage, save),
          );
        return { previousPage };
      },
      onError: (...args) => {
        const [, variables, context, { client }] = args;
        if (context?.previousPage !== undefined)
          client.setQueryData(
            pageQueries.byHandle(variables.handle),
            context.previousPage,
          );
      },
      onSuccess: (...args) => {
        const [page, variables, , { client }] = args;
        client.setQueryData(pageQueries.byHandle(variables.handle), page);
      },
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
      mutationKey: pageQueries.byHandle(currentHandle),
      mutationFn: (requestedHandle: Handle) =>
        updatePageHandle(currentHandle, requestedHandle, client),
      onSuccess: callbacks.onSuccess,
      onError: callbacks.onError,
    }),
  updateProfile: (handle: Handle, options: UpdatePageOptions = {}) =>
    mutationOptions<void, Error, PageUpdate, UpdateProfileContext | null>({
      mutationKey: [...pageQueries.byHandle(handle), "profile-update"],
      mutationFn: (update: PageUpdate) =>
        updatePageProfile(handle, update, options.client),
      onMutate: async (update, { client: queryClient }) => {
        if (update.imageCrop === undefined) return null;

        await queryClient.cancelQueries({
          queryKey: pageQueries.byHandle(handle),
        });
        const previousImageCrop =
          queryClient.getQueryData<PageResponse>(pageQueries.byHandle(handle))
            ?.imageCrop ?? null;
        queryClient.setQueryData<PageResponse>(
          pageQueries.byHandle(handle),
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
            pageQueries.byHandle(handle),
            (page) =>
              page
                ? { ...page, imageCrop: optimisticContext.previousImageCrop }
                : page,
          );

        options.onImageCropSaveSettled?.();
        await queryClient.invalidateQueries({
          queryKey: pageQueries.byHandle(handle),
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
      mutationKey: pageMutationKeys.uploadImage(handle),
      mutationFn: (input: {
        file: File;
        contentType: ProfileImageContentType;
      }) => uploadProfileImage(handle, input.file, input.contentType),
      onError: async (...args) => {
        const [, , , { client }] = args;
        await client.invalidateQueries({
          queryKey: pageQueries.byHandle(handle),
        });
      },
    }),
  removeImage: (handle: Handle) =>
    mutationOptions({
      mutationKey: [...pageQueries.byHandle(handle), "profile-image-remove"],
      mutationFn: () => removeProfileImage(handle),
    }),
};
