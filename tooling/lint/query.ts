import {
  definePlugin,
  defineRule,
  type Variable,
} from "vite-plus/lint/plugins";
import { architecture } from "../architecture/project.ts";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";

type RuleContext = Parameters<
  NonNullable<Parameters<typeof defineRule>[0]["create"]>
>[0];
type QueryRuleState = Readonly<{
  isQueryModule: boolean;
}>;

const queryClientKeyMethods = new Set([
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
function resolveIdentifier(
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

function definitionImport(
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

function isQueryOptionsCall(
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

function isQueryKeyFactory(
  context: Readonly<RuleContext>,
  expression: unknown,
  localQueryModule: boolean,
): boolean {
  if (!isAstNode(expression) || expression.type !== "CallExpression") {
    return false;
  }
  const callee = getChild(expression, "callee");
  if (callee?.type !== "Identifier") return false;
  const variable = resolveIdentifier(context, callee);
  return (
    variable?.defs.some((definition) => {
      if (localQueryModule && definition.type === "Variable") {
        if (!(getName(callee) ?? "").endsWith("QueryKey")) return false;
        const initializer = getChild(definition.node, "init");
        return (
          initializer?.type === "ArrowFunctionExpression" ||
          initializer?.type === "FunctionExpression"
        );
      }
      if (localQueryModule && definition.type === "FunctionName") {
        return (
          (getName(callee) ?? "").endsWith("QueryKey") &&
          isAstNode(definition.node) &&
          definition.node.type === "FunctionDeclaration"
        );
      }
      const imported = definitionImport(definition);
      return (
        !localQueryModule &&
        imported?.source.endsWith("/queries") === true &&
        imported.imported?.endsWith("QueryKey") === true
      );
    }) ?? false
  );
}

function isFeatureQueriesFile(filename: string): boolean {
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

function isTanStackQueryProperty(
  context: Readonly<RuleContext>,
  property: Readonly<AstNode>,
): boolean {
  let current: Readonly<AstNode> = property;
  let parent = getChild(current, "parent");
  while (parent) {
    if (
      parent.type === "FunctionDeclaration" ||
      parent.type === "FunctionExpression" ||
      parent.type === "ArrowFunctionExpression"
    ) {
      return false;
    }
    if (parent.type === "CallExpression") {
      if (isQueryOptionsCall(context, parent)) return true;
      const callee = getChild(parent, "callee");
      if (callee?.type === "MemberExpression") {
        return queryClientKeyMethods.has(
          getName(getChild(callee, "property")) ?? "",
        );
      }
      return false;
    }
    current = parent;
    parent = getChild(current, "parent");
  }
  return false;
}

function report(
  context: Readonly<RuleContext>,
  node: Readonly<AstNode>,
  message: string,
): void {
  context.report({ node, message });
}

const canonicalQueryDefinitions = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep TanStack query options in each feature's queries module",
    },
  },
  create(context) {
    return {
      CallExpression(input: unknown): void {
        if (!isAstNode(input)) return;
        if (isFeatureQueriesFile(context.filename)) return;
        if (!isQueryOptionsCall(context, input)) return;
        report(
          context,
          getChild(input, "callee") ?? input,
          "Use queryOptions only from the feature's queries.ts file.",
        );
      },
    };
  },
});

function checkQueryKeyProperty(
  context: Readonly<RuleContext>,
  input: unknown,
  state: Readonly<QueryRuleState>,
): void {
  if (!isAstNode(input)) return;
  if (getName(getChild(input, "key")) !== "queryKey") return;
  if (!isTanStackQueryProperty(context, input)) return;
  const value = getChild(input, "value");
  if (isQueryKeyFactory(context, value, state.isQueryModule)) return;
  report(
    context,
    value ?? input,
    "Use a query key factory from this feature's queries.ts file.",
  );
}

function checkQueryClientCall(
  context: Readonly<RuleContext>,
  input: unknown,
): void {
  if (!isAstNode(input)) return;
  const callee = getChild(input, "callee");
  if (callee?.type !== "MemberExpression") return;
  if (!queryClientKeyMethods.has(getName(getChild(callee, "property")) ?? "")) {
    return;
  }
  const queryKey = getChildren(input, "arguments")[0];
  if (queryKey === undefined) return;
  if (queryKey.type === "ObjectExpression") return;
  if (isQueryKeyFactory(context, queryKey, false)) return;
  report(
    context,
    queryKey,
    "Use a query key factory from a queries.ts module.",
  );
}

const noHardcodedQueryKeys = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Require feature query key factories from queries modules",
    },
  },
  create(context) {
    const state: QueryRuleState = {
      isQueryModule: isFeatureQueriesFile(context.filename),
    };
    return {
      Property: (input: unknown): void => {
        checkQueryKeyProperty(context, input, state);
      },
      CallExpression: (input: unknown): void => {
        checkQueryClientCall(context, input);
      },
    };
  },
});

export default definePlugin({
  meta: { name: "query" },
  rules: {
    "canonical-query-definitions": canonicalQueryDefinitions,
    "no-hardcoded-query-keys": noHardcodedQueryKeys,
  },
});
