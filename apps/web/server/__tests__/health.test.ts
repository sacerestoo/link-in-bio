import { describe, expect, it } from "vite-plus/test";
import { health } from "../routes/health.ts";

describe("GET /api/health", (): void => {
  it("reports the web service as healthy", async (): Promise<void> => {
    const response = await health.request("/");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      service: "grabbin-web",
    });
  });
});
