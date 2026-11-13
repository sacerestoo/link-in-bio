import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { ArchitectureConfig } from "./types.ts";

function findProjectFiles(
  directory: string,
  generatedDirectories: Readonly<Set<string>>,
  matches: (fileName: string) => boolean,
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return generatedDirectories.has(entry.name)
        ? []
        : findProjectFiles(path, generatedDirectories, matches);
    }

    return matches(entry.name) ? [path] : [];
  });
}

function findUnapprovedRootDirectories(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  const allowed = new Set([
    ...Object.values(config.directories).map((path) => path.split(/[\\/]/u)[0]),
    ...config.additionalRootDirectories,
  ]);
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !generatedDirectories.has(entry.name) &&
        !allowed.has(entry.name),
    )
    .map((entry) => entry.name);
}

function findUnapprovedFeatureDirectories(
  root: string,
  config: ArchitectureConfig,
): string[] {
  const featuresRoot = join(root, config.directories.features);
  if (!existsSync(featuresRoot)) return [];
  const allowed = new Set(config.featureSubdirectories);
  return readdirSync(featuresRoot, { withFileTypes: true })
    .filter((feature) => feature.isDirectory())
    .flatMap((feature) =>
      readdirSync(join(featuresRoot, feature.name), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !allowed.has(entry.name))
        .map((entry) => `${feature.name}/${entry.name}`),
    );
}

function findInvalidFeatureUiFiles(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  const featuresRoot = join(root, config.directories.features);
  if (!existsSync(featuresRoot)) return [];
  const { directory, extensions } = config.featureUi;
  return readdirSync(featuresRoot, { withFileTypes: true })
    .filter((feature) => feature.isDirectory())
    .flatMap((feature) => {
      const uiDirectory = join(featuresRoot, feature.name, directory);
      if (!existsSync(uiDirectory)) return [];
      return findProjectFiles(
        uiDirectory,
        generatedDirectories,
        (fileName) => fileName !== ".gitkeep",
      )
        .filter(
          (path) => !extensions.some((extension) => path.endsWith(extension)),
        )
        .map((path) => relative(root, path));
    });
}

function readWorkspacePatterns(packagePath: string): unknown {
  const packageJson: unknown = JSON.parse(readFileSync(packagePath, "utf8"));
  return typeof packageJson === "object" &&
    packageJson !== null &&
    "workspaces" in packageJson
    ? packageJson.workspaces
    : undefined;
}

function findPackageErrors(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  const packagePath = join(root, config.packageManifest);
  const allowedManifests = new Set([
    packagePath,
    ...config.workspaces.packages.map((directory) =>
      join(root, directory, config.packageManifest),
    ),
  ]);
  const packageFiles = findProjectFiles(
    root,
    generatedDirectories,
    (fileName) => fileName === config.packageManifest,
  );
  const errors: string[] = [];
  const unapproved = packageFiles.filter((path) => !allowedManifests.has(path));
  if (unapproved.length > 0) {
    errors.push(
      `Keep ${config.packageManifest} only at the repository root and in the approved workspace packages (${config.workspaces.packages.join(", ")}): ${unapproved.map((path) => relative(root, path)).join(", ")}.`,
    );
  }
  const missing = config.workspaces.packages.filter(
    (directory) => !existsSync(join(root, directory, config.packageManifest)),
  );
  if (missing.length > 0) {
    errors.push(
      `Add ${config.packageManifest} to workspace packages: ${missing.join(", ")}.`,
    );
  }
  if (!existsSync(packagePath)) return errors;
  return [...errors, ...findWorkspaceDeclarationErrors(packagePath, config)];
}

function findWorkspaceDeclarationErrors(
  packagePath: string,
  config: ArchitectureConfig,
): string[] {
  const errors: string[] = [];
  const patterns = readWorkspacePatterns(packagePath);
  // No configured workspaces means a single-package repository.
  if (config.workspaces.patterns.length === 0) {
    if (patterns !== undefined) {
      errors.push("Remove the package workspaces declaration.");
    }
    return errors;
  }
  if (
    !Array.isArray(patterns) ||
    patterns.length !== config.workspaces.patterns.length ||
    !config.workspaces.patterns.every((pattern) => patterns.includes(pattern))
  ) {
    errors.push(
      `Declare exactly these package workspaces in the root ${config.packageManifest}: ${config.workspaces.patterns.join(", ")}.`,
    );
  }
  return errors;
}

function findUnapprovedWorkspaceDirectories(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  const approved = new Set(config.workspaces.packages);
  const parents = new Set(
    config.workspaces.patterns.map((pattern) => pattern.replace(/\/\*$/u, "")),
  );
  return [...parents].flatMap((parent) => {
    const parentPath = join(root, parent);
    if (!existsSync(parentPath)) return [];
    return readdirSync(parentPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !generatedDirectories.has(entry.name) &&
          !approved.has(`${parent}/${entry.name}`),
      )
      .map((entry) => `${parent}/${entry.name}`);
  });
}

function findSingletonFileErrors(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  return config.singletonFiles.flatMap((rule) => {
    const files = findProjectFiles(
      root,
      generatedDirectories,
      (fileName) =>
        fileName.startsWith(rule.prefix) &&
        rule.extensions.some((extension) => fileName.endsWith(extension)),
    );
    const expected = new Set(
      rule.expectedPaths.map((path) => join(root, path)),
    );
    return files.length === expected.size &&
      files.every((path) => expected.has(path))
      ? []
      : [
          `Keep exactly one ${rule.name} at each of: ${rule.expectedPaths.join(", ")}.`,
        ];
  });
}

function findCssErrors(
  root: string,
  config: ArchitectureConfig,
  generatedDirectories: Readonly<Set<string>>,
): string[] {
  const cssFiles = findProjectFiles(root, generatedDirectories, (fileName) =>
    fileName.endsWith(".css"),
  );
  const allowed = new Set(
    config.allowedCssFiles.map((file) => join(root, file)),
  );
  const misplaced = cssFiles.filter((path) => {
    if (allowed.has(path)) return false;
    const relativePath = relative(join(root, config.cssDirectory), path);
    return relativePath === ".." || relativePath.startsWith(`..${sep}`);
  });
  return misplaced.length === 0
    ? []
    : [
        `Keep CSS files inside ${config.cssDirectory}/ (allowed exceptions: ${config.allowedCssFiles.join(", ") || "none"}).`,
      ];
}

export function checkArchitectureShape(
  root: string,
  config: ArchitectureConfig,
): string[] {
  const generatedDirectories = new Set(config.generatedDirectories);
  const unapprovedRoot = findUnapprovedRootDirectories(
    root,
    config,
    generatedDirectories,
  );
  const unapprovedWorkspace = findUnapprovedWorkspaceDirectories(
    root,
    config,
    generatedDirectories,
  );
  const unapprovedFeature = findUnapprovedFeatureDirectories(root, config);
  const invalidUi = findInvalidFeatureUiFiles(
    root,
    config,
    generatedDirectories,
  );

  return [
    ...(unapprovedRoot.length > 0
      ? [`Remove unapproved root directories: ${unapprovedRoot.join(", ")}.`]
      : []),
    ...(unapprovedWorkspace.length > 0
      ? [
          `Remove unapproved workspace packages: ${unapprovedWorkspace.join(", ")}.`,
        ]
      : []),
    ...(unapprovedFeature.length > 0
      ? [
          `Remove unapproved feature directories: ${unapprovedFeature.join(", ")}.`,
        ]
      : []),
    ...(invalidUi.length > 0
      ? [
          `Keep feature UI source files as ${config.featureUi.extensions.join(" or ")}: ${invalidUi.join(", ")}.`,
        ]
      : []),
    ...findPackageErrors(root, config, generatedDirectories),
    ...findSingletonFileErrors(root, config, generatedDirectories),
    ...findCssErrors(root, config, generatedDirectories),
  ];
}
