import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  realpathSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLintConfig, type LintProfileSelection } from "./profiles.ts";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));

// Bun's isolated linker keeps oxlint inside vite-plus's own dependencies, so
// resolve the binary the way vite-plus does instead of node_modules/.bin.
const oxlintBinary = join(
  dirname(
    createRequire(
      realpathSync(join(repositoryRoot, "node_modules/vite-plus/package.json")),
    ).resolve("oxlint/package.json"),
  ),
  "bin/oxlint",
);

export type LintFixtureResult = ReadonlyMap<string, ReadonlySet<string>>;

type Diagnostic = Readonly<{ filename: string; code: string }>;

const isDiagnostic = (value: unknown): value is Diagnostic =>
  typeof value === "object" &&
  value !== null &&
  "filename" in value &&
  typeof value.filename === "string" &&
  "code" in value &&
  typeof value.code === "string";

const fixtureConfig = (selection: LintProfileSelection): object => {
  const config = createLintConfig(selection);
  return {
    ...config,
    // Type-aware rules need the project tsconfig; these fixtures prove the
    // syntactic rule wiring (globs, plugins, and options).
    options: { typeAware: false },
    jsPlugins: config.jsPlugins.map((plugin) => ({
      ...plugin,
      specifier: plugin.specifier.startsWith("./")
        ? join(repositoryRoot, plugin.specifier)
        : plugin.specifier,
    })),
  };
};

/**
 * Lints files at repository-relative paths in a temporary project with the
 * real lint config, so override globs match exactly as they do in `vp lint`.
 * Returns the rule codes reported for each file.
 */
export const lintFixture = (
  files: Readonly<Record<string, string>>,
  selection: LintProfileSelection,
): LintFixtureResult => {
  const root = mkdtempSync(join(tmpdir(), "lint-fixture-"));
  try {
    symlinkSync(
      join(repositoryRoot, "node_modules"),
      join(root, "node_modules"),
      "dir",
    );
    writeFileSync(
      join(root, ".oxlintrc.json"),
      JSON.stringify(fixtureConfig(selection)),
    );
    for (const [path, contents] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), contents);
    }
    const result = spawnSync(
      oxlintBinary,
      ["-c", ".oxlintrc.json", "--format=json", ...Object.keys(files)],
      { cwd: root, encoding: "utf8" },
    );
    const output: unknown = JSON.parse(result.stdout);
    const diagnostics =
      typeof output === "object" &&
      output !== null &&
      "diagnostics" in output &&
      Array.isArray(output.diagnostics)
        ? output.diagnostics.filter(isDiagnostic)
        : [];
    const codes = new Map<string, Set<string>>(
      Object.keys(files).map((path): [string, Set<string>] => [
        path,
        new Set(),
      ]),
    );
    for (const { filename, code } of diagnostics) {
      codes.get(filename)?.add(code);
    }
    return codes;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};
