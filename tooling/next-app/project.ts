import type { DatabaseConfig } from "./db-schema.ts";
import type { NextAppConfig } from "./route-files.ts";
import { architecture } from "../architecture/project.ts";

export const nextAppArchitecture: NextAppConfig = {
  appDirectory: architecture.directories.app,
  appRootFiles: ["providers.tsx", "globals.css"],
  proxyFile: "apps/web/proxy.ts",
  apiDirectory: `${architecture.directories.app}/api`,
  apiRouteFile: `${architecture.directories.app}/api/[[...route]]/route.ts`,
  generatedDirectories: architecture.generatedDirectories,
};

export const databaseArchitecture: DatabaseConfig = {
  databaseDirectory: architecture.directories.db,
  schemaDirectory: `${architecture.directories.db}/schema`,
  clientFile: `${architecture.directories.db}/client.ts`,
  migrationsDirectory: `${architecture.directories.db}/migrations`,
  queriesDirectory: `${architecture.directories.db}/queries`,
};

/** Modules holding secrets or database access; never bundled for the client. */
export const serverOnlyModules = [
  `${architecture.directories.auth}/index.ts`,
  "apps/web/lib/auth.ts",
  "apps/web/controllers/auth.controller.ts",
  "apps/web/controllers/health.controller.ts",
  `${architecture.directories.db}/client.ts`,
] as const;
