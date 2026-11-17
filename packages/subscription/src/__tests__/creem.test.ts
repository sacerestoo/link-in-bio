import { describe, expect, it, vi } from "vite-plus/test";
import { disabledCreemPaths, isAllowedCreemProductId } from "../creem.ts";

vi.mock("server-only", () => ({}));

describe("disabledCreemPaths", (): void => {
  it("disables body-trusting Creem endpoints", (): void => {
    expect(disabledCreemPaths).toContain("/creem/cancel-subscription");
    expect(disabledCreemPaths).toContain("/creem/retrieve-subscription");
    expect(disabledCreemPaths).toContain("/creem/search-transactions");
    expect(disabledCreemPaths).not.toContain("/creem/create-checkout");
    expect(disabledCreemPaths).not.toContain("/creem/create-portal");
  });

  it("accepts only configured product IDs", (): void => {
    expect(isAllowedCreemProductId("prod_monthly", ["prod_monthly"])).toBe(
      true,
    );
    expect(isAllowedCreemProductId("prod_other", ["prod_monthly"])).toBe(false);
    expect(isAllowedCreemProductId(null, ["prod_monthly"])).toBe(false);
    expect(isAllowedCreemProductId("prod_monthly")).toBe(false);
  });
});
