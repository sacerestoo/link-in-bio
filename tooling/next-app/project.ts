import type { DatabaseConfig } from "./db-schema.ts";
import type { NextAppConfig } from "./route-files.ts";
import { architecture } from "../architecture/project.ts";

export const nextAppArchitecture: NextAppConfig = {
  appDirectory: architecture.directories.app,
  appRootFiles: ["providers.tsx", "globals.css"],
  proxyFile: "apps/web/proxy.ts",
  apiDirectory: `${architecture.directories.app}/api`,
  generatedDirectories: architecture.generatedDirectories,
};

export const databaseArchitecture: DatabaseConfig = {
  databaseDirectory: architecture.directories.db,
  schemaDirectory: `${architecture.directories.db}/schema`,
  repositoriesDirectory: `${architecture.directories.db}/repositories`,
  clientFile: `${architecture.directories.db}/client.ts`,
  migrationsDirectory: `${architecture.directories.db}/migrations`,
};

/** Modules holding secrets or database access; never bundled for the client. */
export const serverOnlyModules = [
  `${architecture.directories.subscription}/creem.ts`,
  `${architecture.directories.subscription}/subscription-session.ts`,
  `${architecture.directories.email}/otp.ts`,
  "apps/web/lib/server-api-client.ts",
  "apps/server/src/lib/auth.ts",
  "apps/server/src/lib/auth/core-options.ts",
  "apps/server/src/lib/auth/email.ts",
  "apps/server/src/lib/auth/hooks.ts",
  "apps/server/src/lib/auth/options.ts",
  "apps/server/src/lib/auth/plugins.ts",
  "apps/server/src/lib/auth/providers.ts",
  "apps/server/src/lib/auth/subscription.ts",
  "apps/server/src/routes/auth.route.ts",
  "apps/server/src/routes/health.route.ts",
  `${architecture.directories.db}/client.ts`,
] as const;
