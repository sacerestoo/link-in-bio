import { describe, expect, it } from "vite-plus/test";
import { disabledCreemPaths } from "../creem.ts";

describe("disabledCreemPaths", (): void => {
  it("disables body-trusting Creem endpoints", (): void => {
    expect(disabledCreemPaths).toContain("/creem/create-checkout");
  });
});
