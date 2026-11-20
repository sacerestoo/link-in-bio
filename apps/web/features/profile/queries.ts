import { api, type ApiClient } from "@/lib/api-client";
import {
  PROFILE_IMAGE_CACHE_CONTROL,
  type ProfileImageContentType,
} from "@grabbin/shared/lib/profile-image";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  pageResponseSchema,
  profileImageUploadResponseSchema,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import {
  mutationOptions,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import * as v from "valibot";

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

const checkHandleAvailability = async (
  handle: string,
  client: ApiClient = api,
): Promise<string> => {
  const validHandle = v.parse(handleSchema, handle);
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
  currentHandle: string,
  requestedHandle: string,
  client: ApiClient = api,
): Promise<string> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle: currentHandle },
    json: { handle: requestedHandle },
  });
  return requestedHandle;
};

const updatePageProfile = async (
  handle: string,
  update: PageUpdate,
  client: ApiClient = api,
): Promise<void> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: update,
  });
};

const getImageUrl = (imageKey: string | null): string | undefined => {
  if (imageKey === null || imageKey === "") return undefined;
  if (/^https?:\/\//u.test(imageKey)) return imageKey;
  const imageBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (imageBaseUrl === undefined || imageBaseUrl.length === 0) return undefined;

  const encodedKey = imageKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${imageBaseUrl.replace(/\/$/u, "")}/${encodedKey}`;
};

const uploadProfileImage = async (
  handle: string,
  file: File,
  contentType: ProfileImageContentType,
): Promise<string | undefined> => {
  const { imageKey, uploadUrl } = v.parse(
    profileImageUploadResponseSchema,
    await api.v1.pages[":handle"]["image-upload"]
      .$post({ param: { handle }, json: { contentType, size: file.size } })
      .then((response) => response.json()),
  );
  await putProfileImage(uploadUrl, file, contentType);
  await api.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey },
  });
  return getImageUrl(imageKey);
};

const removeProfileImage = async (handle: string): Promise<void> => {
  await api.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey: null },
  });
};

const getPage = async (handle: string, client: ApiClient = api) =>
  v.parse(
    pageResponseSchema,
    await client.v1.pages[":handle"]
      .$get({ param: { handle } })
      .then((response) => response.json()),
  );

export const profileQueries = {
  all: () => ["page"] as const,
  byHandle: (handle: string) => [...profileQueries.all(), handle] as const,
  detail: (handle: string, client: ApiClient = api) =>
    queryOptions({
      queryKey: profileQueries.byHandle(handle),
      queryFn: () => getPage(handle, client),
      select: ({ imageKey, ...page }) => ({
        ...page,
        imageUrl: getImageUrl(imageKey),
      }),
    }),
  checkHandle: (client: ApiClient = api) =>
    mutationOptions({
      mutationFn: (handle: string) => checkHandleAvailability(handle, client),
    }),
  changeHandle: (
    currentHandle: string,
    callbacks: Readonly<{
      onSuccess: (updatedHandle: string) => void;
      onError: (cause: unknown) => void;
    }>,
    client: ApiClient = api,
  ) =>
    mutationOptions({
      mutationKey: profileQueries.byHandle(currentHandle),
      mutationFn: (requestedHandle: string) =>
        updatePageHandle(currentHandle, requestedHandle, client),
      onSuccess: callbacks.onSuccess,
      onError: callbacks.onError,
    }),
  updateProfile: (handle: string, client: ApiClient = api) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-update"],
      mutationFn: (update: PageUpdate) =>
        updatePageProfile(handle, update, client),
    }),
  uploadImage: (handle: string) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-upload"],
      mutationFn: (input: {
        file: File;
        contentType: ProfileImageContentType;
      }) => uploadProfileImage(handle, input.file, input.contentType),
    }),
  removeImage: (handle: string) =>
    mutationOptions({
      mutationKey: [...profileQueries.byHandle(handle), "profile-image-remove"],
      mutationFn: () => removeProfileImage(handle),
    }),
};

export const usePage = (handle: string, client: ApiClient = api) =>
  useSuspenseQuery(profileQueries.detail(handle, client));
