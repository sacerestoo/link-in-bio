import * as v from "valibot";
import { describe, expect, it } from "vite-plus/test";
import { usernameSchema } from "../schemas/profile.ts";

describe("usernameSchema", (): void => {
  it("accepts a lowercase handle", (): void => {
    expect(v.parse(usernameSchema, " grabbin_me ")).toBe("grabbin_me");
  });

  it("rejects a short handle", (): void => {
    expect(v.safeParse(usernameSchema, "ab").success).toBe(false);
  });
});
