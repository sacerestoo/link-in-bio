import { describe, expect, it } from "vite-plus/test";
import { cn } from "../lib/utils.ts";

describe("cn", (): void => {
  it("merges conflicting Tailwind classes", (): void => {
    expect(cn("px-2", undefined, "px-4")).toBe("px-4");
  });
});
