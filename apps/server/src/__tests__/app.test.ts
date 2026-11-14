import { describe, expect, it } from "vite-plus/test";
import app from "../app";

describe("server API routes", () => {
  it("serves health under the current API version", async () => {
    const response = await app.request("/v1/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      service: "grabbin-server",
    });
  });

  it("does not keep the old API prefix", async () => {
    const response = await app.request("/api/health");

    expect(response.status).toBe(404);
  });
});
