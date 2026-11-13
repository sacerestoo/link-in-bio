import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readSchemaRegistry, type SchemaRegistry } from "./schema-registry.ts";

/**
 * Drizzle layout: every pgTable/pgEnum lives in db/schema/<domain>.ts (the
 * pg-core import restriction is enforced by oxlint), and db/client.ts
 * registers each domain so relational queries and adapters see every table.
 */
export type DatabaseConfig = Readonly<{
  databaseDirectory: string;
  schemaDirectory: string;
  clientFile: string;
  migrationsDirectory: string;
  /** Domain query modules that server actions and route handlers call. */
  queriesDirectory: string;
}>;

const domainFile = /^[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/u;

function checkDatabaseRoot(config: DatabaseConfig): (root: string) => string[] {
  const allowed = new Set(
    [
      config.clientFile,
      config.schemaDirectory,
      config.migrationsDirectory,
      config.queriesDirectory,
    ].map((path) => path.slice(config.databaseDirectory.length + 1)),
  );
  return (root) =>
    readdirSync(join(root, config.databaseDirectory))
      .filter((name) => !allowed.has(name))
      .map(
        (name) =>
          `Move ${config.databaseDirectory}/${name}: ${config.databaseDirectory}/ only holds ${[...allowed].join(", ")}.`,
      );
}

function checkSchemaFiles(root: string, config: DatabaseConfig): string[] {
  const schemaRoot = join(root, config.schemaDirectory);
  if (!existsSync(schemaRoot)) {
    return [`Create ${config.schemaDirectory}/<domain>.ts for Drizzle tables.`];
  }
  const entries = readdirSync(schemaRoot, { withFileTypes: true });
  const errors = entries
    .filter(
      (entry) =>
        entry.isDirectory() ||
        !domainFile.test(entry.name) ||
        entry.name === "index.ts",
    )
    .map(
      (entry) =>
        `Rename ${config.schemaDirectory}/${entry.name}: schema modules are flat kebab-case <domain>.ts files without an index barrel.`,
    );
  const clientPath = join(root, config.clientFile);
  if (!existsSync(clientPath)) return errors;
  const relativeSchema = config.schemaDirectory.slice(
    config.databaseDirectory.length + 1,
  );
  const registry = readSchemaRegistry(
    readFileSync(clientPath, "utf8"),
    `./${relativeSchema}/`,
  );
  const domains = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        domainFile.test(entry.name) &&
        entry.name !== "index.ts",
    )
    .map((entry) => entry.name.slice(0, -".ts".length));
  return [
    ...errors,
    ...checkRegistry(registry, domains, config, relativeSchema),
  ];
}

function checkRegistry(
  registry: SchemaRegistry,
  domains: readonly string[],
  config: DatabaseConfig,
  relativeSchema: string,
): string[] {
  const client = config.clientFile;
  if (domains.length > 0 && !registry.hasSchemaExport) {
    return [
      `Export \`const schema = { ...<domain>Schema }\` from ${client} so Drizzle sees every ${config.schemaDirectory} table.`,
    ];
  }
  const errors: string[] = [];
  if (domains.length > 0 && !registry.passedToDrizzle) {
    errors.push(
      `Pass \`{ schema }\` to drizzle() in ${client} so relational queries see every table.`,
    );
  }
  for (const domain of domains) {
    const locals = registry.importsByDomain.get(domain) ?? [];
    if (locals.length === 0) {
      errors.push(
        `Register ${config.schemaDirectory}/${domain}.ts in ${client}: import * as <name> from "./${relativeSchema}/${domain}" and spread it into schema.`,
      );
    } else if (!locals.some((name) => registry.spreadNames.has(name))) {
      errors.push(
        `Register ${config.schemaDirectory}/${domain}.ts in ${client}: spread ${locals.join(" or ")} into the exported schema object.`,
      );
    }
  }
  return errors;
}

export function checkDatabaseShape(
  root: string,
  config: DatabaseConfig,
): string[] {
  if (!existsSync(join(root, config.databaseDirectory))) return [];
  return [
    ...checkDatabaseRoot(config)(root),
    ...checkSchemaFiles(root, config),
  ];
}
