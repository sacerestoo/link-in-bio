import { existsSync, readFileSync } from "node:fs";
import * as v from "valibot";
import { cronEnvSchema } from "../apps/cron/src/env.ts";
import { webEnvSchema } from "../apps/web/lib/env.ts";
import { readDotenvEntries } from "./dotenv.ts";

const root = new URL("../", import.meta.url);
const read = (path: string): string | undefined => {
  const url = new URL(path, root);
  return existsSync(url) ? readFileSync(url, "utf8") : undefined;
};

// DATABASE_URL is for drizzle-kit (packages/db/drizzle.config.ts), not a
// Worker setting.
const schemaNames = new Set([
  ...Object.keys(webEnvSchema.entries),
  ...Object.keys(cronEnvSchema.entries),
  "DATABASE_URL",
]);
const errors: string[] = [];

// .env.example must list exactly the settings the env schemas declare.
const exampleSource = read(".env.example");
if (exampleSource === undefined) {
  errors.push("Add .env.example with every setting name.");
} else {
  const names = new Set(
    readDotenvEntries(exampleSource, ".env.example").keys(),
  );
  const extra = [...names].filter((name) => !schemaNames.has(name));
  const missing = [...schemaNames].filter((name) => !names.has(name));
  if (extra.length > 0) {
    errors.push(
      `Not declared in apps/web/lib/env.ts or apps/cron/src/env.ts: ${extra.join(", ")}`,
    );
  }
  if (missing.length > 0) {
    errors.push(`Missing from .env.example: ${missing.join(", ")}`);
  }
}

// Validate local Worker settings with the same schemas the apps use at
// runtime. Report key names and issue kinds only, never the values.
const localFiles = [
  {
    path: "apps/web/.env.local",
    schema: webEnvSchema,
    allowedNames: schemaNames,
  },
  {
    path: "apps/cron/.dev.vars",
    schema: cronEnvSchema,
    allowedNames: new Set(Object.keys(cronEnvSchema.entries)),
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
