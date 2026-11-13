import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vite-plus/test";
import { profile } from "../src/schema/profile.ts";

describe("profile schema", (): void => {
  it("maps to the profile table", (): void => {
    expect(getTableName(profile)).toBe("profile");
  });
});
