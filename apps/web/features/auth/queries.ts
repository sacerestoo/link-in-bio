import { api, type ApiClient } from "@/lib/api-client";
import { pageResponseSchema } from "@grabbin/shared/schemas/page";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import * as v from "valibot";

export const getPage = async (handle: string, client: ApiClient = api) =>
  v.parse(
    pageResponseSchema,
    await client.v1.pages[":handle"]
      .$get({ param: { handle } })
      .then((response) => response.json()),
  );

export const getCurrentUser = (client: ApiClient) =>
  client.v1.auth.session.$get().then((response) => response.json());

export const checkHandleAvailability = (handle: string) =>
  api.v1.pages.handles[":handle"].availability.$get({ param: { handle } });

export const updatePageHandle = async (
  currentHandle: string,
  requestedHandle: string,
): Promise<string> => {
  await api.v1.pages[":handle"].$patch({
    param: { handle: currentHandle },
    json: { handle: requestedHandle },
  });
  return requestedHandle;
};

export const pageQueryKey = (handle: string) => ["page", handle] as const;
export const pageQueryOptions = (handle: string) =>
  queryOptions({
    queryKey: pageQueryKey(handle),
    queryFn: () => getPage(handle),
  });

export const usePage = (handle: string) =>
  useSuspenseQuery(pageQueryOptions(handle));
