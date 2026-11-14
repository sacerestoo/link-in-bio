import { api } from "@/lib/api-client";
import { DetailedError } from "hono/client";
import { describe, expect, it } from "vite-plus/test";

describe("API client", () => {
  it("throws a DetailedError for a problem response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve(
        new Response(JSON.stringify({ title: "Not Found", status: 404 }), {
          status: 404,
          headers: { "Content-Type": "application/problem+json" },
        }),
      );

    try {
      await expect(api.v1.health.$get()).rejects.toBeInstanceOf(DetailedError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
