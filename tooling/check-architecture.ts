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
for (const violation of violationsList) {
  const ruleName = getString(asRecord(violation)?.rule, "name", "unknown-rule");
  const from = getString(violation, "from", "unknown source");
  const to = getString(violation, "to", "unknown target");
  console.error(`Dependency-cruiser ${ruleName}: ${from} -> ${to}`);
}
const boundaryErrors = findClientServerOnlyPaths(modules, readModuleKind(root));
for (const error of boundaryErrors) console.error(error);
const exitCode = dependencyCruiserExitCode(
  graph.status,
  violationsList.length + boundaryErrors.length,
);
if (exitCode !== 0) process.exit(exitCode);
