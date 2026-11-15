import "server-only";
import type { ApiClient } from "@/lib/api-client";

export const getOwnPage = (api: ApiClient) =>
  api.v1.pages.me.$get().then((response) => response.json());
