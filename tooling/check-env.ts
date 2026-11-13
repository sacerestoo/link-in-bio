import { existsSync, readFileSync } from "node:fs";
import * as v from "valibot";
import { cronEnvSchema } from "../apps/cron/src/env.ts";
import { webEnvSchema } from "../apps/web/server/env.ts";

type EnvEntry = { value: string };

function parseValue(rawValue: string): { valid: boolean; value: string } {
  const trimmed = rawValue.trim();
  const quote = trimmed[0];
  if (quote === "'" || quote === '"') {
    const closingQuote = trimmed.indexOf(quote, 1);
    if (closingQuote < 0) return { valid: false, value: "" };
    const trailing = trimmed.slice(closingQuote + 1).trim();
    return {
      valid: trailing === "" || trailing.startsWith("#"),
      value: trimmed.slice(1, closingQuote),
    };
  }
  return { valid: true, value: (trimmed.split("#", 1)[0] ?? "").trim() };
}

function readDotenvEntries(
  source: string,
  label: string,
): Map<string, EnvEntry> {
  const entries = new Map<string, EnvEntry>();
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/u.exec(
      trimmed,
    );
    if (!match)
      throw new Error(`${label} has an invalid entry on line ${index + 1}.`);
    const name = match[1];
    const rawValue = match[2];
    if (name === undefined || rawValue === undefined || entries.has(name)) {
      throw new Error(
        `${label} has a duplicate or invalid key on line ${index + 1}.`,
      );
    }
    const parsed = parseValue(rawValue);
    if (!parsed.valid)
      throw new Error(`${label} has an invalid value on line ${index + 1}.`);
    entries.set(name, { value: parsed.value });
  }
  return entries;
}

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
      `Not declared in apps/web/server/env.ts or apps/cron/src/env.ts: ${extra.join(", ")}`,
    );
  }
  if (missing.length > 0) {
    errors.push(`Missing from .env.example: ${missing.join(", ")}`);
  }
}

// Validate local Worker settings with the same schemas the apps use at
// runtime. Report key names and issue kinds only, never the values.
const localFiles = [
  { path: "apps/web/.dev.vars", schema: webEnvSchema },
  { path: "apps/cron/.dev.vars", schema: cronEnvSchema },
] as const;
for (const { path, schema } of localFiles) {
  const source = read(path);
  if (source === undefined) continue;
  const entries = readDotenvEntries(source, path);
  const extra = [...entries.keys()].filter(
    (name) => !Object.hasOwn(schema.entries, name),
  );
  const empty = [...entries]
    .filter(([, entry]) => entry.value.trim() === "")
    .map(([name]) => name);
  const result = v.safeParse(
    v.partial(schema),
    Object.fromEntries(
      [...entries]
        .filter(([, entry]) => entry.value.trim() !== "")
        .map(([name, entry]) => [name, entry.value]),
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
  if (empty.length > 0) {
    errors.push(
      `Empty values in ${path} (remove the line to leave a key unset): ${empty.join(", ")}`,
    );
  }
}

for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
