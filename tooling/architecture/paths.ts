import { architecture } from "./project.ts";

export { architecture };

export const architectureDirectories = architecture.directories;

export const applicationDirectories = architecture.applicationDirectoryKeys.map(
  (key) => architecture.directories[key],
);
export const webDirectories = architecture.webDirectoryKeys.map(
  (key) => architecture.directories[key],
);

export function sourceFileGlobs(directories: readonly string[]): string[] {
  return directories.flatMap((directory) =>
    architecture.sourceExtensions.map(
      (extension) => `${directory}/**/*${extension}`,
    ),
  );
}

export function directoryGlobs(directories: readonly string[]): string[] {
  return directories.map((directory) => `${directory}/**`);
}

export const applicationSourceGlobs = sourceFileGlobs(applicationDirectories);
export const applicationDirectoryGlobs = directoryGlobs(applicationDirectories);
export const webSourceGlobs = sourceFileGlobs(webDirectories);
export const featureUiSourceGlobs = architecture.featureUi.extensions.map(
  (extension) =>
    `${architecture.directories["features"]}/**/${architecture.featureUi.directory}/**/*${extension}`,
);
