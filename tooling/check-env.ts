import { existsSync, readFileSync } from "node:fs";
import * as v from "valibot";
import { cronEnvSchema } from "../apps/cron/src/env.ts";
import { serverEnvSchema } from "../apps/server/src/lib/env.ts";
import { webEnvSchema } from "../apps/web/lib/env.ts";
import { readDotenvEntries } from "./dotenv.ts";

const root = new URL("../", import.meta.url);
const read = (path: string): string | undefined => {
  const url = new URL(path, root);
  return existsSync(url) ? readFileSync(url, "utf8") : undefined;
};

const rootNames = new Set([
  "NEON_API_KEY",
  "NEON_PROJECT_ID",
  "NEON_DEV_BRANCH_ID",
  "NEON_RUNTIME_ROLE_PASSWORD",
  "DATABASE_URL",
]);
const errors: string[] = [];

const examples = [
  { path: ".env.example", names: rootNames },
  {
    path: "apps/web/.env.example",
    names: new Set(Object.keys(webEnvSchema.entries)),
  },
  {
    path: "apps/cron/.env.example",
    names: new Set(Object.keys(cronEnvSchema.entries)),
  },
  {
    path: "apps/server/.env.example",
    names: new Set(Object.keys(serverEnvSchema.entries)),
  },
] as const;
for (const { path, names: expectedNames } of examples) {
  const source = read(path);
  if (source === undefined) {
    errors.push(`Add ${path} with every setting name.`);
    continue;
  }
  const names = new Set(readDotenvEntries(source, path).keys());
  const extra = [...names].filter((name) => !expectedNames.has(name));
  const missing = [...expectedNames].filter((name) => !names.has(name));
  if (extra.length > 0) {
    errors.push(`Not declared for ${path}: ${extra.join(", ")}`);
  }
  if (missing.length > 0) {
    errors.push(`Missing from ${path}: ${missing.join(", ")}`);
  }
}

// Validate local Worker settings with the same schemas the apps use at
// runtime. Report key names and issue kinds only, never the values.
const localFiles = [
  {
    path: "apps/web/.env.local",
    schema: webEnvSchema,
    allowedNames: new Set(Object.keys(webEnvSchema.entries)),
  },
  {
    path: "apps/cron/.env.local",
    schema: cronEnvSchema,
    allowedNames: new Set(Object.keys(cronEnvSchema.entries)),
  },
  {
    path: "apps/server/.env.local",
    schema: serverEnvSchema,
    allowedNames: new Set(Object.keys(serverEnvSchema.entries)),
  },
] as const;
for (const { path, schema, allowedNames } of localFiles) {
  const source = read(path);
  if (source === undefined) continue;
  const entries = readDotenvEntries(source, path);
  const extra = [...entries.keys()].filter((name) => !allowedNames.has(name));
  const result = v.safeParse(
    v.partial(schema),
    Object.fromEntries(
      [...entries].map(([name, entry]) => [name, entry.value]),
    ),
  );
  if (!result.success) {
    const invalid = result.issues.map(
      (issue) => `${v.getDotPath(issue) ?? "(root)"} (${issue.type})`,
    );
    errors.push(`Invalid in ${path}: ${invalid.join(", ")}`);
  }
  if (extra.length > 0) {
    errors.push(`Not declared for ${path}: ${extra.join(", ")}`);
  }
}

for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
