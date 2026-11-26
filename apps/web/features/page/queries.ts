import { api, type ApiClient } from "@/lib/api-client";
import {
  pageProfileResponseSchema,
  pageResponseSchema,
  type Handle,
  type PageProfileResponse,
  type PageResponse,
} from "@grabbin/domain/page";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { DetailedError } from "hono/client";
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
  byMe: () => [...pageQueries.all(), "me"] as const,
  myPage: (client: ApiClient = api) =>
    queryOptions({
      queryKey: pageQueries.byMe(),
      queryFn: async () => {
        try {
          return await getPageInfo({ currentUser: true }, client);
        } catch (error: unknown) {
          if (error instanceof DetailedError && error.statusCode === 401)
            return null;
          throw error;
        }
      },
      retry: false,
    }),
  detail: (handle: Handle, client: ApiClient = api) =>
    queryOptions({
      queryKey: pageQueries.byHandle(handle),
      queryFn: () => getPageInfo({ handle }, client),
    }),
};

export const useMyPage = (client: ApiClient = api) =>
  useQuery({
    ...pageQueries.myPage(client),
    select: (page) => (page === null ? null : selectProfileFields(page)),
  });

export type MyPageData = NonNullable<ReturnType<typeof useMyPage>["data"]>;

export const usePage = (handle: Handle, client: ApiClient = api) =>
  useQuery({
    ...pageQueries.detail(handle, client),
    select: selectProfileFields,
  });

export type ProfilePageData = NonNullable<ReturnType<typeof usePage>["data"]>;
