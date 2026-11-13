import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * App Router file conventions. app/ only holds routing files, so feature
 * code stays in features/ and shared/. Sources:
 * https://nextjs.org/docs/app/getting-started/project-structure
 * https://nextjs.org/docs/app/api-reference/file-conventions/metadata
 */
export type NextAppConfig = Readonly<{
  appDirectory: string;
  /** Extra files allowed at the app/ root, such as the providers module. */
  appRootFiles: readonly string[];
  /** Root-level request interceptor, the Next 16 replacement for middleware. */
  proxyFile: string;
  generatedDirectories: readonly string[];
}>;

const routeFile =
  /^(?:page|layout|template|loading|error|not-found|forbidden|unauthorized|default)\.tsx$|^route\.ts$/u;
const rootRouteFile = /^(?:global-error|global-not-found)\.tsx$/u;
const metadataFile =
  /^(?:(?:icon|apple-icon|opengraph-image|twitter-image)\d*\.(?:ico|jpe?g|png|gif|svg|tsx|ts)|(?:opengraph-image|twitter-image)\d*\.alt\.txt|robots\.(?:txt|ts)|sitemap\.(?:xml|ts)|manifest\.(?:json|webmanifest|ts))$/u;
const rootMetadataFile = /^favicon\.ico$/u;
const canonicalDynamicParams = new Map([
  ["changelogid", "changelogId"],
  ["feedbackid", "feedbackId"],
  ["orgslug", "orgSlug"],
]);

const segmentPatterns = [
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
  /^\[[a-z][a-zA-Z0-9]*\]$/u,
  /^\[\.\.\.[a-z][a-zA-Z0-9]*\]$/u,
  /^\[\[\.\.\.[a-z][a-zA-Z0-9]*\]\]$/u,
  /^\([a-z0-9]+(?:-[a-z0-9]+)*\)$/u,
  /^@[a-z0-9]+(?:-[a-z0-9]+)*$/u,
] as const;

function isAllowedAppFile(
  fileName: string,
  isRoot: boolean,
  config: NextAppConfig,
): boolean {
  if (fileName === ".gitkeep") return true;
  if (routeFile.test(fileName) || metadataFile.test(fileName)) return true;
  return (
    isRoot &&
    (rootRouteFile.test(fileName) ||
      rootMetadataFile.test(fileName) ||
      config.appRootFiles.includes(fileName))
  );
}

function segmentError(path: string, name: string): string | undefined {
  if (name.startsWith("_")) {
    return `Move ${path} out of app/: keep non-route code in features/ or shared/ instead of private folders.`;
  }
  const dynamicParam = /^\[([a-z][A-Za-z0-9]*)\]$/u.exec(name)?.[1];
  const canonicalName =
    dynamicParam === undefined
      ? undefined
      : canonicalDynamicParams.get(dynamicParam.toLowerCase());
  if (canonicalName !== undefined && dynamicParam !== canonicalName) {
    return `Rename route parameter ${path} to [${canonicalName}] to preserve camelCase.`;
  }
  return segmentPatterns.some((pattern) => pattern.test(name))
    ? undefined
    : `Rename route segment ${path} to kebab-case, [param], [...param], [[...param]], (group), or @slot.`;
}

function checkAppDirectory(
  root: string,
  directory: string,
  config: NextAppConfig,
): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const isRoot = directory === join(root, config.appDirectory);
  const errors: string[] = [];
  const files = new Set(
    entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
  );
  if (files.has("page.tsx") && files.has("route.ts")) {
    errors.push(
      `Split ${relative(root, directory)}: page.tsx and route.ts cannot share a route segment.`,
    );
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const display = relative(root, path);
    if (entry.isDirectory()) {
      const error = segmentError(display, entry.name);
      errors.push(
        ...(error === undefined
          ? checkAppDirectory(root, path, config)
          : [error]),
      );
    } else if (!isAllowedAppFile(entry.name, isRoot, config)) {
      errors.push(
        `Move ${display} out of app/: app/ only holds Next.js route and metadata files.`,
      );
    }
  }
  return errors;
}

function findFiles(
  directory: string,
  generated: Readonly<Set<string>>,
  matches: (fileName: string) => boolean,
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return generated.has(entry.name)
        ? []
        : findFiles(path, generated, matches);
    }
    return matches(entry.name) ? [path] : [];
  });
}

function checkRequestInterceptors(
  root: string,
  config: NextAppConfig,
): string[] {
  const generated = new Set(config.generatedDirectories);
  const middleware = findFiles(root, generated, (fileName) =>
    /^middleware\.[cm]?[jt]sx?$/u.test(fileName),
  ).map((path) => relative(root, path));
  const proxies = findFiles(root, generated, (fileName) =>
    /^proxy\.[cm]?[jt]sx?$/u.test(fileName),
  ).map((path) => relative(root, path));
  return [
    ...(middleware.length > 0
      ? [
          `Rename ${middleware.join(", ")} to ${config.proxyFile}: Next.js 16 replaced middleware with proxy.`,
        ]
      : []),
    ...(proxies.some((path) => path !== config.proxyFile)
      ? [`Keep one ${config.proxyFile} at the repository root.`]
      : []),
  ];
}

export function checkNextAppShape(
  root: string,
  config: NextAppConfig,
): string[] {
  const appRoot = join(root, config.appDirectory);
  return [
    ...(existsSync(appRoot) ? checkAppDirectory(root, appRoot, config) : []),
    ...checkRequestInterceptors(root, config),
  ];
}

/** Modules that must start with `import "server-only"`. */
export function checkServerOnlyMarkers(
  root: string,
  modules: readonly string[],
): string[] {
  return modules
    .filter((path) => existsSync(join(root, path)))
    .filter(
      (path) =>
        !/^import "server-only";$/mu.test(
          readFileSync(join(root, path), "utf8"),
        ),
    )
    .map(
      (path) =>
        `Add import "server-only" to ${path} so client bundles fail to import it.`,
    );
}
