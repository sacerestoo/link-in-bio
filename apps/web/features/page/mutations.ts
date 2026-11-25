import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";
import { api, type ApiClient } from "@/lib/api-client";
import {
  type Handle,
  type PageResponse,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { mutationOptions } from "@tanstack/react-query";
import {
  pageQueries,
  removeProfileImage,
  updatePageHandle,
  updatePageProfile,
  uploadProfileImage,
} from "./queries";

type UpdatePageOptions = Readonly<{
  client?: ApiClient;
  onImageCropSaveSettled?: () => void;
}>;
type UpdateProfileContext = Readonly<{
  previousImageCrop: PageResponse["imageCrop"];
}>;

export const pageMutations = {
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
      mutationKey: [...pageQueries.byHandle(handle), "profile-image-upload"],
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
