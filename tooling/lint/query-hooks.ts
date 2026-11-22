import { defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";
import {
  isFeatureQueriesFile,
  isFeatureQueriesImport,
  isQueryOptionsCall,
  report,
  resolveIdentifier,
  definitionImport,
  type RuleContext,
} from "./query-utils.ts";

function isTanStackQueryHookCall(
  context: Readonly<RuleContext>,
  call: Readonly<AstNode>,
): boolean {
  const callee = getChild(call, "callee");
  if (callee?.type === "Identifier") {
    const variable = resolveIdentifier(context, callee);
    return (
      variable?.defs.some((definition) => {
        const imported = definitionImport(definition);
        return (
          imported?.source === "@tanstack/react-query" &&
          imported.imported === "useQuery"
        );
      }) ?? false
    );
  }
  if (callee?.type !== "MemberExpression") return false;
  const object = getChild(callee, "object");
  const variable =
    object?.type === "Identifier"
      ? resolveIdentifier(context, object)
      : undefined;
  return (
    getName(getChild(callee, "property")) === "useQuery" &&
    (variable?.defs.some((definition) => {
      const imported = definitionImport(definition);
      return (
        imported?.source === "@tanstack/react-query" &&
        imported.imported === undefined
      );
    }) ??
      false)
  );
}

function isFeatureQueryNamespaceOptionsCall(
  context: Readonly<RuleContext>,
  call: Readonly<AstNode>,
): boolean {
  const callee = getChild(call, "callee");
  if (callee?.type !== "MemberExpression") return false;

  const object = getChild(callee, "object");
  const propertyName = getName(getChild(callee, "property"));
  if (
    object?.type !== "Identifier" ||
    propertyName === undefined ||
    propertyName === "all" ||
    propertyName.startsWith("by")
  ) {
    return false;
  }

  const variable = resolveIdentifier(context, object);
  return (
    variable?.defs.some((definition) => {
      const imported = definitionImport(definition);
      if (
        imported?.imported?.endsWith("Queries") === true &&
        isFeatureQueriesImport(context.filename, imported.source)
      ) {
        return true;
      }

      if (
        !isFeatureQueriesFile(context.filename) ||
        definition.type !== "Variable" ||
        !(getName(object) ?? "").endsWith("Queries")
      ) {
        return false;
      }
      const initializer = getChild(definition.node, "init");
      return (
        initializer?.type === "ObjectExpression" &&
        getChildren(initializer, "properties").some((property) => {
          const value = getChild(property, "value");
          return (
            getName(getChild(property, "key")) === propertyName &&
            (value?.type === "ArrowFunctionExpression" ||
              value?.type === "FunctionExpression")
          );
        })
      );
    }) ?? false
  );
}

function isFeatureQueryOptionsFactoryCall(
  context: Readonly<RuleContext>,
  expression: unknown,
): boolean {
  if (!isAstNode(expression) || expression.type !== "CallExpression") {
    return false;
  }
  if (isFeatureQueryNamespaceOptionsCall(context, expression)) return true;

  const isQueriesFile = isFeatureQueriesFile(context.filename);
  if (isQueriesFile && isQueryOptionsCall(context, expression)) return true;

  const callee = getChild(expression, "callee");
  if (callee?.type !== "Identifier") return false;
  const variable = resolveIdentifier(context, callee);
  return (
    variable?.defs.some((definition) => {
      const imported = definitionImport(definition);
      if (
        imported?.imported?.endsWith("QueryOptions") === true &&
        isFeatureQueriesImport(context.filename, imported.source)
      ) {
        return true;
      }
      if (!isQueriesFile || !(getName(callee) ?? "").endsWith("QueryOptions")) {
        return false;
      }

      if (definition.type === "Variable") {
        const initializer = getChild(definition.node, "init");
        return (
          initializer?.type === "ArrowFunctionExpression" ||
          initializer?.type === "FunctionExpression"
        );
      }
      return (
        definition.type === "FunctionName" &&
        isAstNode(definition.node) &&
        definition.node.type === "FunctionDeclaration"
      );
    }) ?? false
  );
}

function usesFeatureQueryOptions(
  context: Readonly<RuleContext>,
  expression: unknown,
): boolean {
  if (isFeatureQueryOptionsFactoryCall(context, expression)) return true;
  if (!isAstNode(expression) || expression.type !== "ObjectExpression") {
    return false;
  }
  return getChildren(expression, "properties").some(
    (property) =>
      property.type === "SpreadElement" &&
      isFeatureQueryOptionsFactoryCall(context, getChild(property, "argument")),
  );
}

export const canonicalQueryHooks = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Use feature query options factories for TanStack useQuery calls",
    },
  },
  create(context) {
    return {
      CallExpression(input: unknown): void {
        if (!isAstNode(input) || !isTanStackQueryHookCall(context, input)) {
          return;
        }
        if (
          usesFeatureQueryOptions(context, getChildren(input, "arguments")[0])
        ) {
          return;
        }
        report(
          context,
          getChild(input, "callee") ?? input,
          "Call useQuery using a queryOptions factory from the feature's queries.ts.",
        );
      },
    };
  },
});
