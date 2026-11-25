import type { ProfileImageContentType } from "@grabbin/shared/lib/profile-image";
import { api, type ApiClient } from "@/lib/api-client";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  profileImageUploadResponseSchema,
  pageProfileResponseSchema,
  pageResponseSchema,
  type Handle,
  type PageProfileResponse,
  type PageResponse,
  type PageUpdate,
} from "@grabbin/shared/schemas/page";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";
import { putProfileImage } from "./api";

export const getProfileImageUrl = (
  imageKey: string | null,
): string | undefined => {
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

export const checkHandle = async (
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

export const updatePageHandle = async (
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

export const updatePageProfile = async (
  handle: Handle,
  update: PageUpdate,
  client: ApiClient = api,
): Promise<void> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: update,
  });
};

export const uploadProfileImage = async (
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

export const removeProfileImage = async (
  handle: Handle,
  client: ApiClient = api,
): Promise<void> => {
  await client.v1.pages[":handle"].$patch({
    param: { handle },
    json: { imageKey: null, imageCrop: null },
  });
};

type PageInfoLookup = { currentUser: true } | { handle: Handle };

function getPageInfo(
  lookup: { handle: Handle },
  client?: ApiClient,
): Promise<PageResponse>;
function getPageInfo(
  lookup: { currentUser: true },
  client?: ApiClient,
): Promise<PageProfileResponse>;
async function getPageInfo(
  lookup: PageInfoLookup,
  client: ApiClient = api,
): Promise<PageResponse | PageProfileResponse> {
  const response =
    "handle" in lookup
      ? await client.v1.pages[":handle"].$get({
          param: { handle: lookup.handle },
        })
      : await client.v1.pages.me.$get();

  const schema =
    "handle" in lookup ? pageResponseSchema : pageProfileResponseSchema;
  return v.parse(schema, await response.json());
}

type SelectedProfileFields = Readonly<{
  name: string;
  bio: string;
  imageUrl: string | undefined;
  imageSrc: string | undefined;
  hasImage: boolean;
}>;

function selectProfileFields<T extends PageProfileResponse>(
  page: T,
): T & SelectedProfileFields {
  const {
    handle,
    name: savedName,
    bio: savedBio,
    imageKey,
    imageCrop,
    isOwner,
  } = page;
  const imageUrl = getProfileImageUrl(imageKey);
  const imageSrc =
    imageUrl !== undefined && imageUrl.length > 0 ? imageUrl : undefined;
  const name = savedName ?? "";
  const bio = savedBio ?? "";

  return {
    ...page,
    handle,
    name,
    bio,
    imageKey,
    imageCrop,
    isOwner,
    imageUrl,
    imageSrc,
    hasImage: imageSrc !== undefined,
  };
}

export const pageQueries = {
  all: () => ["page"] as const,
  byHandle: (handle: Handle) => [...pageQueries.all(), handle] as const,
  myPage: (userId: string | null, client: ApiClient = api) =>
    queryOptions({
      queryKey: [...pageQueries.all(), "me", userId],
      queryFn: () => getPageInfo({ currentUser: true }, client),
      retry: false,
    }),
  detail: (handle: Handle, client: ApiClient = api) =>
    queryOptions({
      queryKey: pageQueries.byHandle(handle),
      queryFn: () => getPageInfo({ handle }, client),
    }),
};

export const useMyPage = (userId: string | null, client: ApiClient = api) =>
  useQuery({
    ...pageQueries.myPage(userId, client),
    enabled: userId !== null,
    select: selectProfileFields,
  });

export type MyPageData = NonNullable<ReturnType<typeof useMyPage>["data"]>;

export const usePage = (handle: Handle, client: ApiClient = api) =>
  useQuery({
    ...pageQueries.detail(handle, client),
    select: selectProfileFields,
  });

export type ProfilePageData = NonNullable<ReturnType<typeof usePage>["data"]>;
