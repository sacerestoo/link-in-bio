import {
  applicationDirectories,
  architecture,
  architectureDirectories,
} from "./tooling/architecture/paths.ts";

function escapePattern(path: string): string {
  return path.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

const directory = (key: keyof typeof architectureDirectories): string =>
  escapePattern(architectureDirectories[key]);

const appPath = directory("app");
const controllerPath = directory("controllers");
const featurePath = directory("features");
const servicePath = directory("services");
const cronPath = directory("cron");
const databasePath = directory("db");
const authPath = directory("auth");
const uiPath = directory("ui");
const sharedPath = directory("shared");
const testPath = "/(tests?|__tests__)/|\\.(test|spec)\\.";
const databaseModulePath = `^(?:${architecture.databaseModulePathPatterns.join("|")})`;
const databaseImporterPath = `^(?:${architecture.databaseImporterPathPatterns.join("|")})`;
const sharedForbiddenPath = `^(?:${applicationDirectories
  .filter((path) => path !== architectureDirectories.shared)
  .map((path) => escapePattern(path))
  .join("|")})/`;

export default {
  forbidden: [
    {
      name: "database-modules-only-from-configured-boundary",
      comment:
        "packages/db, pg and drizzle-orm may only be imported by apps/server/src/** and apps/cron/src/**.",
      severity: "error",
      from: { pathNot: databaseImporterPath },
      to: { path: databaseModulePath },
    },
    {
      name: "workspace-imports-must-resolve",
      comment:
        "A @grabbin/* import must resolve: declare the workspace dependency in package.json. An unresolved import would hide it from every layer rule.",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, path: "^@grabbin/" },
    },
    {
      name: "ui-not-to-database",
      comment: "packages/ui must never import packages/db (even type-only).",
      severity: "error",
      from: { path: `^${uiPath}/` },
      to: { path: `^(?:${databasePath}/|packages/db/)` },
    },
    {
      name: "packages-not-to-apps",
      comment: "Workspace packages must not depend on apps/.",
      severity: "error",
      from: { path: "^packages/" },
      to: { path: "^apps/" },
    },
    {
      name: "apps-not-to-other-apps",
      comment:
        "Apps must not import one another, except web may import the server app type.",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: {
        path: "^apps/",
        pathNot: "^apps/$1/",
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "ui-only-to-shared",
      comment:
        "packages/ui renders on the client; it may use packages/shared but not db, auth, or app code.",
      severity: "error",
      from: { path: `^${uiPath}/` },
      to: {
        path: `^(?:${databasePath}|${authPath}|${cronPath})/`,
      },
    },
    {
      name: "auth-not-to-web-code",
      comment:
        "packages/auth takes its database adapter from the caller; it must not import db, ui, or app code.",
      severity: "error",
      from: { path: `^${authPath}/` },
      to: { path: `^(?:${databasePath}|${uiPath}|apps)/` },
    },
    {
      name: "features-not-to-features",
      comment: "Features must not depend on other features.",
      severity: "error",
      from: { path: `^${featurePath}/([^/]+)/` },
      to: {
        path: `^${featurePath}/`,
        pathNot: `^${featurePath}/$1/`,
      },
    },
    {
      name: "shared-not-to-app-code",
      comment:
        "packages/shared is the lowest layer: types and validation only, no other workspace code.",
      severity: "error",
      from: { path: `^${sharedPath}/` },
      to: { path: sharedForbiddenPath },
    },
    {
      name: "database-not-to-web-code",
      comment:
        "packages/db is a low layer: schema and client must not import apps, ui, or auth.",
      severity: "error",
      from: { path: `^${databasePath}/` },
      to: { path: `^(?:apps|${uiPath}|${authPath})/` },
    },
    {
      name: "app-only-from-app",
      comment:
        "apps/web/app holds route entrypoints; nothing outside it may import them.",
      severity: "error",
      from: { pathNot: `^${appPath}/` },
      to: { path: `^${appPath}/` },
    },
    {
      name: "feature-ui-not-to-data-modules",
      comment:
        "Feature UI renders on the client; it reaches data through actions.ts or api.ts, never packages/db or packages/auth.",
      severity: "error",
      from: { path: `^${featurePath}/[^/]+/ui/` },
      to: {
        path: `^(?:${databasePath}|${authPath})/`,
        dependencyTypesNot: ["type-only"],
      },
    },
    {
      name: "no-orphans-in-web-code",
      comment:
        "Controller, service and feature source files should be used by the app.",
      severity: "error",
      from: {
        orphan: true,
        path: `^(?:${controllerPath}|${servicePath}|${featurePath})/`,
        pathNot: testPath,
      },
      to: {},
    },
  ],
  options: {
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".js", ".mjs", ".json"],
    },
    tsPreCompilationDeps: true,
  },
};
