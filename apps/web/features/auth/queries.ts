import { api, type ApiClient } from "@/lib/api-client";

export const authQueries = {
  currentUser: (client: ApiClient = api) =>
    client.v1.auth.session.$get().then((response) => response.json()),
};
