import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";
import { handleSchema } from "../src/page.ts";

describe("handleSchema", (): void => {
  it("accepts a lowercase handle", (): void => {
    expect(v.parse(handleSchema, " grabbin_me ")).toBe("grabbin_me");
  });

  it("rejects a short handle", (): void => {
    expect(v.safeParse(handleSchema, "ab").success).toBe(false);
  });
});
