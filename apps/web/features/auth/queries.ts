import { api, type ApiClient } from "@/lib/api-client";
import {
  HANDLE_UNAVAILABLE_MESSAGE,
  handleSchema,
  type Handle,
} from "@grabbin/shared/schemas/page";
import * as v from "valibot";

export const checkHandle = async (
  rawHandle: string,
  client: ApiClient = api,
): Promise<Handle> => {
  const handle = v.parse(handleSchema, rawHandle);
  const { available } = v.parse(
    v.object({ available: v.boolean() }),
    await client.v1.pages.handle
      .$post({ json: { handle } })
      .then((response) => response.json()),
  );
  if (!available) throw new Error(HANDLE_UNAVAILABLE_MESSAGE);
  return handle;
};

export const authQueries = {
  currentUser: (client: ApiClient = api) =>
    client.v1.auth.session.$get().then((response) => response.json()),
};
