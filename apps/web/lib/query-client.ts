import {
  defaultShouldDehydrateQuery,
  environmentManager,
  QueryClient,
} from "@tanstack/react-query";
import { cache } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000 },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
        shouldRedactErrors: () => false,
      },
    },
  });
}

const getServerQueryClient = cache(makeQueryClient);
let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (environmentManager.isServer()) return getServerQueryClient();
  return (browserQueryClient ??= makeQueryClient());
};
