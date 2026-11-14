import type { AppType } from "@grabbin/server";
import { DetailedError, hc } from "hono/client";

const getErrorMessage = (data: unknown, response: Response): string => {
  if (typeof data !== "object" || data === null) {
    return `${response.status} ${response.statusText}`;
  }
  if ("detail" in data && typeof data.detail === "string") return data.detail;
  if ("title" in data && typeof data.title === "string") return data.title;
  if ("message" in data && typeof data.message === "string") {
    return data.message;
  }
  return `${response.status} ${response.statusText}`;
};

const fetchWithHttpErrors: typeof globalThis.fetch = async (
  input: Parameters<typeof globalThis.fetch>[0],
  init?: Parameters<typeof globalThis.fetch>[1],
) => {
  const response = await globalThis.fetch(input, init);

  if (!response.ok) {
    const data: unknown = await response
      .clone()
      .json()
      .catch(() => null);

    throw new DetailedError(getErrorMessage(data, response), {
      statusCode: response.status,
      detail: { data, statusText: response.statusText },
    });
  }

  return response;
};

export const api = hc<AppType>("", { fetch: fetchWithHttpErrors });
