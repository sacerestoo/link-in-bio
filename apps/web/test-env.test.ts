import { describe, expect, it } from "vite-plus/test";
import { createTestEnv } from "./test-env.ts";

describe("createTestEnv", (): void => {
  it("provides empty, read-only Worker bindings in test mode", (): void => {
    const bindings = createTestEnv("test");

    expect(bindings).toEqual({});
    expect(Object.isFrozen(bindings)).toBe(true);
  });

  it("refuses Worker test bindings in production mode", (): void => {
    expect(() => createTestEnv("production")).toThrow(
      "Worker test bindings are only available in test mode.",
    );
  });
});
