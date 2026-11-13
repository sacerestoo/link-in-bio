import type { Variable } from "vite-plus/lint/plugins";
import { dirname, posix, resolve, sep } from "node:path";
import type { RuleContext } from "../next-app/directives-shared.ts";
import {
  getChild,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "../naming/ast-utils.ts";

export const contractHelpersModule = "@/shared/lib/contract";
const contractModulePath = /^features\/[a-z0-9-]+\/contracts(?:\.ts)?$/u;
const absoluteContractModulePath =
  /\/features\/[a-z0-9-]+\/contracts(?:\.ts)?$/u;
const aliasPrefix = "@/";

/**
 * Whether an import specifier in `filename` names a features/<name>/contracts
 * module, resolving the `@/` alias and paths relative to the importing file.
 */
export const isContractModule = (
  filename: string,
  source: string | undefined,
): boolean => {
  if (source === undefined) return false;
  if (source.startsWith(aliasPrefix)) {
    return contractModulePath.test(
      posix.normalize(source.slice(aliasPrefix.length)),
    );
  }
  if (!source.startsWith(".")) return false;
  const resolved = resolve(dirname(filename), source).split(sep).join("/");
  return absoluteContractModulePath.test(resolved);
};
export const contractHelpers = new Set([
  "jsonResponse",
  "parseInput",
  "readJson",
]);
export const bodyReaders = new Set([
  "arrayBuffer",
  "blob",
  "formData",
  "json",
  "text",
]);
export const responseClasses = new Set(["NextResponse", "Response"]);
export const tableSchemaFactories = new Set([
  "createInsertSchema",
  "createSelectSchema",
  "createUpdateSchema",
]);

export function resolveIdentifier(
  context: Readonly<RuleContext>,
  identifier: Readonly<AstNode>,
): Variable | undefined {
  const identifierNode: unknown = identifier;
  for (const scope of context.sourceCode.scopeManager.scopes) {
    const reference = scope.references.find(
      (candidate) => candidate.identifier === identifierNode,
    );
    if (reference?.resolved) return reference.resolved;
  }
  return undefined;
}

export function importSource(
  variable: Variable | undefined,
): string | undefined {
  for (const definition of variable?.defs ?? []) {
    if (definition.type !== "ImportBinding") continue;
    let node: unknown = definition.node;
    while (isAstNode(node)) {
      if (node.type === "ImportDeclaration") {
        return getString(getChild(node, "source"), "value");
      }
      node = getChild(node, "parent");
    }
  }
  return undefined;
}

export function rootIdentifier(node: unknown): AstNode | undefined {
  if (!isAstNode(node)) return undefined;
  if (node.type === "Identifier") return node;
  if (node.type === "MemberExpression") {
    return rootIdentifier(getChild(node, "object"));
  }
  return undefined;
}

export function importedFrom(
  context: Readonly<RuleContext>,
  node: unknown,
): string | undefined {
  const root = rootIdentifier(node);
  return root ? importSource(resolveIdentifier(context, root)) : undefined;
}

export function contractHelperName(
  context: Readonly<RuleContext>,
  call: Readonly<AstNode>,
): string | undefined {
  const callee = getChild(call, "callee");
  const name =
    callee?.type === "MemberExpression"
      ? getName(getChild(callee, "property"))
      : getName(callee);
  if (name === undefined || !contractHelpers.has(name)) return undefined;
  return importedFrom(context, callee) === contractHelpersModule
    ? name
    : undefined;
}
