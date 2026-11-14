import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as v from "valibot";
import { readDotenvEntries, type EnvEntry } from "../../tooling/dotenv";
import { webEnvSchema } from "./lib/env";

export function loadLocalEnv(): void {
  const localEnvPath = fileURLToPath(new URL(".env.local", import.meta.url));
  const devVars = existsSync(localEnvPath)
    ? readDotenvEntries(readFileSync(localEnvPath, "utf8"), localEnvPath)
    : new Map<string, EnvEntry>();
  const result = v.safeParse(
    webEnvSchema,
    Object.fromEntries([...devVars].map(([name, { value }]) => [name, value])),
  );
  if (!result.success) {
    const missingOrInvalid = result.issues.map(
      (issue) => `${v.getDotPath(issue) ?? "(root)"} (${issue.type})`,
    );
    throw new Error(
      `Missing or invalid settings in apps/web/.env.local: ${missingOrInvalid.join(", ")}`,
    );
  }
  for (const [name, { value }] of devVars) process.env[name] ??= value;
}
