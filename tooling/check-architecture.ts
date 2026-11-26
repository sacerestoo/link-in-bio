import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkArchitectureShape } from "./architecture/check.ts";
import {
  dependencyCruiserExitCode,
  runDependencyCruiser,
} from "./architecture/dependency-cruiser.ts";
import { architecture } from "./architecture/project.ts";
import {
  findClientServerOnlyPaths,
  readModuleKind,
  type CruiseModule,
} from "./next-app/client-boundary.ts";
import { checkDatabaseShape } from "./next-app/db-schema.ts";
import {
  databaseArchitecture,
  nextAppArchitecture,
  serverOnlyModules,
} from "./next-app/project.ts";
import {
  checkNextAppShape,
  checkServerOnlyMarkers,
} from "./next-app/route-files.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const webDependencyDirectoryKeys = ["app", "features", "lib"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  isRecord(value) ? value : undefined;

const isCruiseModule = (value: unknown): value is CruiseModule =>
  isRecord(value) &&
  typeof value.source === "string" &&
  Array.isArray(value.dependencies) &&
  value.dependencies.every(
    (dependency: unknown) =>
      isRecord(dependency) &&
      typeof dependency.resolved === "string" &&
      Array.isArray(dependency.dependencyTypes) &&
      dependency.dependencyTypes.every(
        (type: unknown) => typeof type === "string",
      ),
  );

const isUnknownArray = (value: unknown): value is readonly unknown[] =>
  Array.isArray(value);

const getString = (value: unknown, key: string, fallback: string): string => {
  const field = asRecord(value)?.[key];
  return typeof field === "string" ? field : fallback;
};
const architectureErrors = [
  ...checkArchitectureShape(root, architecture),
  ...checkNextAppShape(root, nextAppArchitecture),
  ...checkDatabaseShape(root, databaseArchitecture),
  ...checkServerOnlyMarkers(root, serverOnlyModules),
];

if (architectureErrors.length > 0) {
  for (const error of architectureErrors) console.error(error);
  process.exit(1);
}

const graph = runDependencyCruiser(root, [
  "--config",
  architecture.dependencyCruiserConfig,
  "--ts-config",
  join(root, architecture.typeScriptConfig),
  "--output-type",
  "json",
  ...architecture.applicationDirectoryKeys
    .map((key) => architecture.directories[key])
    .filter((directory) => existsSync(join(root, directory))),
]);
if (graph.error) throw graph.error;
process.stderr.write(graph.stderr);
const cruiseOutput: unknown = JSON.parse(graph.stdout);
const cruiseRecord = asRecord(cruiseOutput);
const modulesValue = cruiseRecord?.modules;
const modules = isUnknownArray(modulesValue)
  ? modulesValue.filter((module) => isCruiseModule(module))
  : [];
if (!isUnknownArray(modulesValue) || modules.length !== modulesValue.length)
  throw new Error("Dependency-cruiser returned an invalid module graph.");
if (modules.length === 0)
  throw new Error("Dependency-cruiser found no modules.");
const violations = asRecord(cruiseRecord?.summary)?.violations;
const violationsList = isUnknownArray(violations) ? violations : [];

// The root tsconfig has no `@/` mapping. Re-scan web code with its own config
// so aliased imports between feature domains resolve to their actual modules.
const webGraph = runDependencyCruiser(root, [
  "--config",
  architecture.dependencyCruiserConfig,
  "--ts-config",
  join(root, "apps/web/tsconfig.json"),
  "--output-type",
  "json",
  ...webDependencyDirectoryKeys
    .map((key) => architecture.directories[key])
    .filter((directory) => existsSync(join(root, directory))),
]);
if (webGraph.error) throw webGraph.error;
process.stderr.write(webGraph.stderr);
const webCruiseOutput: unknown = JSON.parse(webGraph.stdout);
const webCruiseRecord = asRecord(webCruiseOutput);
const webModulesValue = webCruiseRecord?.modules;
const webModules = isUnknownArray(webModulesValue)
  ? webModulesValue.filter((module) => isCruiseModule(module))
  : [];
if (
  !isUnknownArray(webModulesValue) ||
  webModules.length !== webModulesValue.length
)
  throw new Error("Dependency-cruiser returned an invalid web module graph.");
if (webModules.length === 0)
  throw new Error("Dependency-cruiser found no web modules.");
const webViolations = asRecord(webCruiseRecord?.summary)?.violations;
if (!isUnknownArray(webViolations))
  throw new Error("Dependency-cruiser returned invalid web violations.");

const getViolationKey = (violation: unknown): string =>
  [
    getString(asRecord(violation)?.rule, "name", "unknown-rule"),
    getString(violation, "from", "unknown source"),
    getString(violation, "to", "unknown target"),
  ].join("\u0000");
const allViolations = [...violationsList];
const knownViolationKeys = new Set(
  violationsList.map((violation) => getViolationKey(violation)),
);
for (const violation of webViolations) {
  if (
    getString(asRecord(violation)?.rule, "name", "unknown-rule") !==
    "features-not-to-features"
  )
    continue;
  const key = getViolationKey(violation);
  if (knownViolationKeys.has(key)) continue;
  knownViolationKeys.add(key);
  allViolations.push(violation);
}

for (const violation of allViolations) {
  const ruleName = getString(asRecord(violation)?.rule, "name", "unknown-rule");
  const from = getString(violation, "from", "unknown source");
  const to = getString(violation, "to", "unknown target");
  console.error(`Dependency-cruiser ${ruleName}: ${from} -> ${to}`);
}
const boundaryErrors = findClientServerOnlyPaths(modules, readModuleKind(root));
for (const error of boundaryErrors) console.error(error);
const issueCount = allViolations.length + boundaryErrors.length;
const exitCode = dependencyCruiserExitCode(graph.status, issueCount);
const webExitCode = dependencyCruiserExitCode(webGraph.status, issueCount);
if (exitCode !== 0 || webExitCode !== 0) process.exit(exitCode || webExitCode);
