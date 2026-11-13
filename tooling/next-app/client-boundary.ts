import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Dependency-cruiser cannot stop a reachability rule at a "use server" file,
 * so this walks its JSON graph: from every "use client" module, follow
 * runtime imports (a "use server" module only ships a reference to the
 * client) and fail when a path reaches server-only.
 * https://nextjs.org/docs/app/getting-started/server-and-client-components
 */
// couldNotResolve marks imports with no file behind them, such as a broken
// relative import in a package's .d.ts; there is nothing to read or follow.
export type CruiseDependency = Readonly<{
  resolved: string;
  dependencyTypes: readonly string[];
  couldNotResolve?: boolean;
}>;

export type CruiseModule = Readonly<{
  source: string;
  dependencies: readonly CruiseDependency[];
  couldNotResolve?: boolean;
}>;

export type ModuleKind = "client" | "server-functions" | "plain";

const serverOnlyPackage = /^node_modules\/server-only\//u;
const localSource = /^(?!node_modules\/)[^:]+\.[cm]?[jt]sx?$/u;

function isRuntimeDependency(dependency: CruiseDependency): boolean {
  return !dependency.dependencyTypes.some((type) => type.startsWith("type-"));
}

export function findClientServerOnlyPaths(
  modules: readonly CruiseModule[],
  kindOf: (source: string) => ModuleKind,
): string[] {
  const graph = new Map(modules.map((module) => [module.source, module]));
  const errors: string[] = [];
  for (const start of modules) {
    if (
      start.couldNotResolve === true ||
      !localSource.test(start.source) ||
      kindOf(start.source) !== "client"
    ) {
      continue;
    }
    const seen = new Set<string>([start.source]);
    const queue: string[][] = [[start.source]];
    while (queue.length > 0) {
      const path = queue.shift() ?? [];
      const current = graph.get(path.at(-1) ?? "");
      for (const dependency of current?.dependencies ?? []) {
        if (!isRuntimeDependency(dependency)) continue;
        if (serverOnlyPackage.test(dependency.resolved)) {
          errors.push(
            `Client module ${start.source} reaches server-only code: ${path.join(" -> ")}.`,
          );
          queue.length = 0;
          break;
        }
        if (
          dependency.couldNotResolve === true ||
          seen.has(dependency.resolved) ||
          !localSource.test(dependency.resolved) ||
          kindOf(dependency.resolved) === "server-functions"
        ) {
          continue;
        }
        seen.add(dependency.resolved);
        queue.push([...path, dependency.resolved]);
      }
    }
  }
  return errors;
}

export function readModuleKind(root: string): (source: string) => ModuleKind {
  const cache = new Map<string, ModuleKind>();
  return (source) => {
    const cached = cache.get(source);
    if (cached !== undefined) return cached;
    const directive =
      /^\s*(?:\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*["']use (client|server)["']/u.exec(
        readFileSync(join(root, source), "utf8"),
      )?.[1];
    const kind: ModuleKind =
      directive === "client"
        ? "client"
        : directive === "server"
          ? "server-functions"
          : "plain";
    cache.set(source, kind);
    return kind;
  };
}
