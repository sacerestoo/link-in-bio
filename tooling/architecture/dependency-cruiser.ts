import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

const requiredVersion = "6.0.3";

const readVersion = (packageDirectory: string): unknown => {
  const manifest: unknown = JSON.parse(
    readFileSync(join(packageDirectory, "package.json"), "utf8"),
  );
  return typeof manifest === "object" &&
    manifest !== null &&
    "version" in manifest
    ? manifest.version
    : undefined;
};

// Dependency-cruiser 18 supports TypeScript 6, while the app uses TypeScript 7.
// Without this link it silently skips TypeScript sources and reports no violations.
// Bun's isolated linker makes node_modules/dependency-cruiser a symlink into
// its store, so link inside the real package directory.
export const linkDependencyCruiserTypeScript = (root: string): void => {
  const compatiblePath = realpathSync(
    join(root, "node_modules/typescript-dependency-cruiser"),
  );
  const linkedPath = join(
    realpathSync(join(root, "node_modules/dependency-cruiser")),
    "node_modules/typescript",
  );
  if (!existsSync(linkedPath)) {
    // A dangling link from an earlier layout fails existsSync; replace it.
    if (lstatSync(linkedPath, { throwIfNoEntry: false }) !== undefined) {
      rmSync(linkedPath, { force: true });
    }
    mkdirSync(dirname(linkedPath), { recursive: true });
    symlinkSync(
      relative(dirname(linkedPath), compatiblePath),
      linkedPath,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  const version = readVersion(linkedPath);
  if (version !== requiredVersion) {
    throw new Error(
      `Dependency-cruiser requires TypeScript ${requiredVersion}, found ${String(version)}.`,
    );
  }
};

export const runDependencyCruiser = (
  root: string,
  cruiseArguments: readonly string[],
): SpawnSyncReturns<string> => {
  linkDependencyCruiserTypeScript(root);
  const result = spawnSync("bunx", ["depcruise", ...cruiseArguments], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
};

export const dependencyCruiserExitCode = (
  status: number | null,
  issueCount: number,
): number => {
  if (status === 0 && issueCount === 0) return 0;
  return status === null || status === 0 ? 1 : status;
};
