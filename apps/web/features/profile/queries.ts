import { api, type ApiClient } from "@/lib/api-client";
import {
  pageProfileResponseSchema,
  pageResponseSchema,
  type Handle,
  type PageProfileResponse,
  type PageResponse,
} from "@grabbin/shared/schemas/page";
import { queryOptions, useQuery } from "@tanstack/react-query";
import * as v from "valibot";

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

type PageInfoLookup =
  | { currentUser: true }
  | { handle: Handle }
  | { userId: string };

function getPageInfo(
  lookup: { handle: Handle },
  client?: ApiClient,
): Promise<PageResponse>;
function getPageInfo(
  lookup: { currentUser: true } | { userId: string },
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

const selectProfilePage = ({
  handle,
  name: savedName,
  bio: savedBio,
  imageKey,
  imageCrop,
  isOwner,
}: PageProfileResponse) => {
  const imageUrl = getProfileImageUrl(imageKey);
  const imageSrc =
    imageUrl !== undefined && imageUrl.length > 0 ? imageUrl : undefined;
  const name = savedName ?? "";
  const bio = savedBio ?? "";

  return {
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
};

export const profileQueries = {
  all: () => ["page"] as const,
  byHandle: (handle: Handle) => [...profileQueries.all(), handle] as const,
  currentPage: (client: ApiClient = api) =>
    getPageInfo({ currentUser: true }, client),
  myPage: (userId: string | null, client: ApiClient = api) =>
    queryOptions({
      queryKey: myPageQueryKey(userId),
      queryFn: () => {
        if (userId === null)
          throw new Error("Cannot fetch a page without a signed-in user.");
        return getPageInfo({ userId }, client);
      },
      enabled: userId !== null,
      retry: false,
    }),
  detail: (handle: Handle, client: ApiClient = api) =>
    queryOptions({
      queryKey: profileQueries.byHandle(handle),
      queryFn: () => getPageInfo({ handle }, client),
    }),
};

function myPageQueryKey(userId: string | null) {
  return [...profileQueries.all(), "me", userId] as const;
}

export const useMyPage = (userId: string | null, client: ApiClient = api) =>
  useQuery({
    ...profileQueries.myPage(userId, client),
    select: selectProfilePage,
  });

export const usePage = (handle: Handle, client: ApiClient = api) =>
  useQuery({
    ...profileQueries.detail(handle, client),
    select: selectProfilePage,
  });

export type ProfilePageData = NonNullable<ReturnType<typeof usePage>["data"]>;
