import { describe, expect, it } from "vite-plus/test";
import { dependencyCruiserExitCode } from "../dependency-cruiser.ts";

describe("dependencyCruiserExitCode", (): void => {
  it("fails custom boundary findings even when the graph tool exits successfully", (): void => {
    expect(dependencyCruiserExitCode(0, 1)).toBe(1);
  });

  it("keeps a successful empty graph successful", (): void => {
    expect(dependencyCruiserExitCode(0, 0)).toBe(0);
  });

  it("preserves a failing graph tool status", (): void => {
    expect(dependencyCruiserExitCode(2, 0)).toBe(2);
  });
});
