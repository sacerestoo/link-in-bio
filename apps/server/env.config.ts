import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as v from "valibot";
import { readDotenvEntries, type EnvEntry } from "../../tooling/dotenv";
import { serverEnvSchema } from "./src/lib/env";

export function loadLocalEnv(): void {
  const localEnvPath = join(import.meta.dirname, ".env.local");
  const localEnv = existsSync(localEnvPath)
    ? readDotenvEntries(readFileSync(localEnvPath, "utf8"), localEnvPath)
    : new Map<string, EnvEntry>();
  const result = v.safeParse(
    serverEnvSchema,
    Object.fromEntries([...localEnv].map(([name, { value }]) => [name, value])),
  );
  if (!result.success) {
    const invalid = result.issues.map(
      (issue) => `${v.getDotPath(issue) ?? "(root)"} (${issue.type})`,
    );
    throw new Error(
      `Invalid settings in apps/server/.env.local: ${invalid.join(", ")}`,
    );
  }
  for (const [name, { value }] of localEnv) process.env[name] ??= value;
}
