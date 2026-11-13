import { describe, expect, it } from "vite-plus/test";
import { runDailyJobs } from "../jobs.ts";

describe("runDailyJobs", (): void => {
  it("runs the placeholder job without a database", async (): Promise<void> => {
    await expect(runDailyJobs()).resolves.toEqual([
      { job: "daily-noop", ok: true, usedDatabase: false },
    ]);
  });
});
