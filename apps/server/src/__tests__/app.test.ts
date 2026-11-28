import { describe, expect, it } from "vite-plus/test";
import app from "../app";

describe("server API routes", () => {
  it("serves health under the current API version", async () => {
    const response = await app.request("/v1/health");
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true });

    if (typeof body !== "object" || body === null || !("time" in body)) {
      throw new Error("Health response must include a timestamp");
    }

    expect(typeof body.time).toBe("string");
  });

  it("does not keep the old API prefix", async () => {
    const response = await app.request("/api/health");

    expect(response.status).toBe(404);
  });
});
