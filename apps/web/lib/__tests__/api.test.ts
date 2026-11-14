import { GET } from "@/app/api/[[...route]]/route";
import { describe, expect, it } from "vite-plus/test";

describe("API app responses", () => {
  it("serves health as JSON with timing headers", async () => {
    const response = await GET(new Request("https://grabbin.me/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("server-timing")).toContain("total");
    expect(await response.json()).toMatchObject({
      ok: true,
      service: "grabbin-web",
    });
  });

  it("redirects a trailing slash to the canonical path", async () => {
    const response = await GET(new Request("https://grabbin.me/api/health/"));

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://grabbin.me/api/health",
    );
  });
});

describe("API error handling", () => {
  it("returns RFC 7807 for missing routes", async () => {
    const response = await GET(new Request("https://grabbin.me/api/missing"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect(await response.json()).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      instance: "/api/missing",
    });
  });
});
