import type { defineRule, Variable } from "vite-plus/lint/plugins";
import { architecture } from "../architecture/project.ts";
import {
  getChild,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";

export type RuleContext = Parameters<
  NonNullable<Parameters<typeof defineRule>[0]["create"]>
>[0];

export const queryClientKeyMethods = new Set([
  "cancelQueries",
  "getQueryData",
  "getQueryDefaults",
  "getQueryState",
  "invalidateQueries",
  "refetchQueries",
  "removeQueries",
  "resetQueries",
  "setQueryData",
  "setQueryDefaults",
]);
const queryOptionsNames = new Set(["infiniteQueryOptions", "queryOptions"]);

export function resolveIdentifier(
  context: Readonly<RuleContext>,
  identifier: Readonly<AstNode>,
): Variable | undefined {
  for (const scope of context.sourceCode.scopeManager.scopes) {
    const identifierNode: unknown = identifier;
    const reference = scope.references.find(
      (candidate) => candidate.identifier === identifierNode,
    );
    if (reference?.resolved) return reference.resolved;
  }
  return undefined;
}

export function definitionImport(
  definition: Readonly<Variable["defs"][number]>,
): Readonly<{ source: string; imported: string | undefined }> | undefined {
  if (definition.type !== "ImportBinding") return undefined;
  let node: unknown = definition.node;
  while (isAstNode(node)) {
    if (node.type === "ImportDeclaration") {
      return {
        source: getString(getChild(node, "source"), "value") ?? "",
        imported: undefined,
      };
    }
    if (node.type === "ImportSpecifier") {
      const declaration = getChild(node, "parent");
      return {
        source: getString(getChild(declaration, "source"), "value") ?? "",
        imported: getName(getChild(node, "imported")),
      };
    }
    node = getChild(node, "parent");
  }
  return undefined;
}

export function isQueryOptionsCall(
  context: Readonly<RuleContext>,
  call: Readonly<AstNode>,
): boolean {
  const callee = getChild(call, "callee");
  if (!callee) return false;
  if (callee.type === "Identifier") {
    const variable = resolveIdentifier(context, callee);
    return (
      variable?.defs.some((definition) => {
        const imported = definitionImport(definition);
        return (
          imported?.source === "@tanstack/react-query" &&
          imported.imported !== undefined &&
          queryOptionsNames.has(imported.imported)
        );
      }) ?? false
    );
  }
  if (callee.type !== "MemberExpression") return false;
  const object = getChild(callee, "object");
  const propertyName = getName(getChild(callee, "property"));
  if (
    object?.type !== "Identifier" ||
    propertyName === undefined ||
    propertyName === ""
  ) {
    return false;
  }
  const variable = resolveIdentifier(context, object);
  return (
    variable?.defs.some((definition) => {
      const imported = definitionImport(definition);
      return (
        imported?.source === "@tanstack/react-query" &&
        imported.imported === undefined &&
        queryOptionsNames.has(propertyName)
      );
    }) ?? false
  );
}

export function isFeatureQueriesFile(filename: string): boolean {
  const featureRoot = architecture.directories.features
    .replaceAll("\\", "/")
    .replace(/\/$/u, "");
  const normalizedFilename = `/${filename.replaceAll("\\", "/")}`.replaceAll(
    /\/+/gu,
    "/",
  );
  const marker = `/${featureRoot}/`;
  const featureIndex = normalizedFilename.lastIndexOf(marker);
  if (featureIndex === -1) return false;
  const relativeFile = normalizedFilename.slice(featureIndex + marker.length);
  return /^[^/]+\/queries\.[cm]?[jt]sx?$/u.test(relativeFile);
}

export function report(
  context: Readonly<RuleContext>,
  node: Readonly<AstNode>,
  message: string,
): void {
  context.report({ node, message });
}
