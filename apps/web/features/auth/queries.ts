import { api, type ApiClient } from "@/lib/api-client";
import {
  queryOptions,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { DetailedError } from "hono/client";

export const getOwnPage = (client: ApiClient) =>
  client.v1.pages.me.$get().then((response) => response.json());

export const getCurrentUser = (client: ApiClient) =>
  client.v1.auth.session.$get().then((response) => response.json());

export const checkHandleAvailability = (handle: string) =>
  api.v1.pages.handles[":handle"].availability.$get({ param: { handle } });

export const updatePageHandle = async (handle: string): Promise<string> => {
  await api.v1.pages.me.$patch({ json: { handle } });
  return handle;
};

export const ownPageQueryKey = () => ["own-page"] as const;

export const getOwnPageOrNull = async (client: ApiClient) => {
  try {
    return await getOwnPage(client);
  } catch (error: unknown) {
    if (
      error instanceof DetailedError &&
      (error.statusCode === 401 || error.statusCode === 404)
    ) {
      return null;
    }
    throw error;
  }
};

export const ownPageQueryOptions = () =>
  queryOptions({
    queryKey: ownPageQueryKey(),
    queryFn: () => getOwnPageOrNull(api),
    retry: false,
  });

export const useOwnPage = (enabled: boolean) =>
  useQuery({
    ...ownPageQueryOptions(),
    enabled,
    throwOnError: (error) =>
      error instanceof DetailedError && error.statusCode >= 500,
  });

export const useSuspenseOwnPage = () => useSuspenseQuery(ownPageQueryOptions());
