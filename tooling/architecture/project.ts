import type { ArchitectureConfig } from "./types.ts";

const configExtensions = [".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"];

// Source roots of each workspace package. Lint globs, dependency-cruiser
// layers and the shape checks all read these paths.
const directories = {
  app: "apps/web/app",
  controllers: "apps/server/src/controllers",
  server: "apps/server/src",
  features: "apps/web/features",
  lib: "apps/web/lib",
  services: "apps/server/src/services",
  cron: "apps/cron/src",
  db: "packages/db/src",
  auth: "packages/auth/src",
  ui: "packages/ui/src",
  shared: "packages/shared/src",
} as const;

export const architecture = {
  directories,
  applicationDirectoryKeys: [
    "app",
    "controllers",
    "server",
    "features",
    "lib",
    "services",
    "cron",
    "db",
    "auth",
    "ui",
    "shared",
  ],
  webDirectoryKeys: ["app", "features", "ui"],
  // packages/db, pg and drizzle-orm are the database layer.
  databaseModulePathPatterns: [
    "packages/db/",
    "node_modules/(?:pg|drizzle-orm)/",
  ],
  // Only the server Worker and cron may import the database layer.
  // packages/db may import itself and its drivers.
  databaseImporterPathPatterns: [
    "apps/server/src/",
    "apps/cron/src/",
    "packages/db/",
    "node_modules/",
  ],
  sourceExtensions: [".ts", ".tsx"],
  additionalRootDirectories: [
    ".vite-hooks",
    ".github",
    ".vscode",
    ".zed",
    "docs",
    "tooling",
  ],
  generatedDirectories: [
    ".cloudflare",
    ".git",
    ".next",
    ".vinext",
    ".wrangler",
    "dist",
    "node_modules",
  ],
  featureSubdirectories: ["__tests__", "ui"],
  featureUi: {
    directory: "ui",
    extensions: [".tsx"],
  },
  singletonFiles: [
    {
      name: "Vite config",
      expectedPaths: [
        "vite.config.ts",
        "apps/web/vite.config.ts",
        "apps/server/vite.config.ts",
        "apps/cron/vite.config.ts",
      ],
      prefix: "vite.config.",
      extensions: configExtensions,
    },
    {
      name: "Next config",
      expectedPaths: ["apps/web/next.config.ts"],
      prefix: "next.config.",
      extensions: configExtensions,
    },
    {
      name: "Wrangler config",
      expectedPaths: [
        "apps/web/wrangler.jsonc",
        "apps/server/wrangler.jsonc",
        "apps/cron/wrangler.jsonc",
      ],
      prefix: "wrangler.",
      extensions: [".json", ".jsonc", ".toml"],
    },
    {
      name: "Drizzle config",
      expectedPaths: ["packages/db/drizzle.config.ts"],
      prefix: "drizzle.config.",
      extensions: configExtensions,
    },
  ],
  packageManifest: "package.json",
  workspaces: {
    patterns: ["apps/*", "packages/*"],
    packages: [
      "apps/web",
      "apps/server",
      "apps/cron",
      "packages/auth",
      "packages/db",
      "packages/ui",
      "packages/shared",
    ],
  },
  cssDirectory: "packages/ui/src/styles",
  allowedCssFiles: ["apps/web/app/globals.css"],
  dependencyCruiserConfig: ".dependency-cruiser.ts",
  typeScriptConfig: "tsconfig.json",
} satisfies ArchitectureConfig<typeof directories>;
