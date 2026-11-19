import { api, type ApiClient } from "@/lib/api-client";
import { pageResponseSchema } from "@grabbin/shared/schemas/page";
import {
  mutationOptions,
  queryOptions,
  useSuspenseQuery,
} from "@tanstack/react-query";
import * as v from "valibot";

const checkHandleAvailability = (handle: string, client: ApiClient = api) =>
  client.v1.pages.handle.$post({
    json: { handle },
  });

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
      select: (page) => ({
        ...page,
        imageUrl:
          page.imageKey !== null &&
          page.imageKey !== "" &&
          (page.imageKey.startsWith("https://") ||
            page.imageKey.startsWith("http://"))
            ? page.imageKey
            : undefined,
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
};

export const usePage = (handle: string, client: ApiClient = api) =>
  useSuspenseQuery(profileQueries.detail(handle, client));
