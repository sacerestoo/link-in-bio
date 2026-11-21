import { api, type ApiClient } from "@/lib/api-client";
import { pageResponseSchema, type Handle } from "@grabbin/shared/schemas/page";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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

const getPage = async (handle: Handle, client: ApiClient = api) =>
  v.parse(
    pageResponseSchema,
    await client.v1.pages[":handle"]
      .$get({ param: { handle } })
      .then((response) => response.json()),
  );

export const profileQueries = {
  all: () => ["page"] as const,
  byHandle: (handle: Handle) => [...profileQueries.all(), handle] as const,
  detail: (handle: Handle, client: ApiClient = api) =>
    queryOptions({
      queryKey: profileQueries.byHandle(handle),
      queryFn: () => getPage(handle, client),
      select: ({ imageKey, ...page }) => {
        const imageUrl = getProfileImageUrl(imageKey);
        const imageSrc =
          imageUrl !== undefined && imageUrl.length > 0 ? imageUrl : undefined;
        const name = page.name ?? "";
        const bio = page.bio ?? "";

        return {
          ...page,
          name,
          bio,
          imageUrl,
          imageSrc,
          hasImage: imageSrc !== undefined,
        };
      },
    }),
};

export const usePage = (handle: Handle, client: ApiClient = api) =>
  useSuspenseQuery(profileQueries.detail(handle, client));

export type ProfilePageData = NonNullable<ReturnType<typeof usePage>["data"]>;
