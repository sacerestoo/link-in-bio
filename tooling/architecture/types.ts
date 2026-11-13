export type SingletonFileRule = Readonly<{
  name: string;
  /** Every path where this file must exist; no other copy is allowed. */
  expectedPaths: readonly string[];
  prefix: string;
  extensions: readonly string[];
}>;

export type WorkspaceConfig = Readonly<{
  /** Glob patterns declared in the root package.json `workspaces` field. */
  patterns: readonly string[];
  /** Approved workspace package directories, e.g. `apps/web`. */
  packages: readonly string[];
}>;

export type ArchitectureConfig<
  Directories extends Readonly<Record<string, string>> = Record<string, string>,
> = Readonly<{
  directories: Directories;
  applicationDirectoryKeys: readonly (keyof Directories & string)[];
  webDirectoryKeys: readonly (keyof Directories & string)[];
  databaseModulePathPatterns: readonly string[];
  databaseImporterPathPatterns: readonly string[];
  sourceExtensions: readonly string[];
  additionalRootDirectories: readonly string[];
  generatedDirectories: readonly string[];
  featureSubdirectories: readonly string[];
  featureUi: Readonly<{
    directory: string;
    extensions: readonly string[];
  }>;
  singletonFiles: readonly SingletonFileRule[];
  packageManifest: string;
  workspaces: WorkspaceConfig;
  cssDirectory: string;
  /** CSS files allowed outside cssDirectory, e.g. Next.js `app/globals.css`. */
  allowedCssFiles: readonly string[];
  dependencyCruiserConfig: string;
  typeScriptConfig: string;
}>;
