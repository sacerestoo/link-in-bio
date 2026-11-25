import { definePlugin, defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";
import { noQueryKeyHelperFunctions } from "./no-query-key-helper-functions.ts";
import { canonicalQueryHooks } from "./query-hooks.ts";
import {
  definitionImport,
  isFeatureQueriesFile,
  isQueryOptionsCall,
  queryClientKeyMethods,
  report,
  resolveIdentifier,
  type RuleContext,
} from "./query-utils.ts";

type QueryRuleState = Readonly<{
  isQueryModule: boolean;
}>;

function isQueryNamespaceCall(
  context: Readonly<RuleContext>,
  expression: unknown,
  localQueryModule: boolean,
): boolean {
  if (!isAstNode(expression) || expression.type !== "CallExpression") {
    return false;
  }
  const callee = getChild(expression, "callee");
  if (callee?.type !== "MemberExpression") return false;
  const object = getChild(callee, "object");
  const propertyName = getName(getChild(callee, "property"));
  if (
    object?.type !== "Identifier" ||
    propertyName === undefined ||
    (propertyName !== "all" && !propertyName.startsWith("by"))
  ) {
    return false;
  }

  const variable = resolveIdentifier(context, object);
  return (
    variable?.defs.some((definition) => {
      if (localQueryModule && definition.type === "Variable") {
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
      }
      const imported = definitionImport(definition);
      return (
        !localQueryModule &&
        imported?.source.endsWith("/queries") === true &&
        imported.imported?.endsWith("Queries") === true
      );
    }) ?? false
  );
}

function isQueryKeyFactory(
  context: Readonly<RuleContext>,
  expression: unknown,
  localQueryModule: boolean,
): boolean {
  if (!isAstNode(expression)) return false;
  if (expression.type === "ArrayExpression" && localQueryModule) {
    return getChildren(expression, "elements").some(
      (element) =>
        element.type === "SpreadElement" &&
        isQueryNamespaceCall(context, getChild(element, "argument"), true),
    );
  }
  if (expression.type !== "CallExpression") return false;
  const callee = getChild(expression, "callee");
  if (callee?.type === "MemberExpression") {
    return isQueryNamespaceCall(context, expression, localQueryModule);
  }
  if (callee?.type !== "Identifier") return false;
  const variable = resolveIdentifier(context, callee);
  return (
    !localQueryModule &&
    (variable?.defs.some((definition) => {
      const imported = definitionImport(definition);
      return (
        imported?.source.endsWith("/queries") === true &&
        imported.imported?.endsWith("Queries") === true
      );
    }) ??
      false)
  );
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

const noPageSetQueryData = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Use queryClient.query instead of setQueryData in web routes",
    },
  },
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");
    if (
      !filename.includes("/apps/web/app/") &&
      !filename.startsWith("apps/web/app/")
    ) {
      return {};
    }
    return {
      CallExpression(input: unknown): void {
        if (!isAstNode(input)) return;
        const callee = getChild(input, "callee");
        if (callee?.type !== "MemberExpression") return;
        if (getName(getChild(callee, "property")) !== "setQueryData") return;
        report(
          context,
          callee,
          "Use queryClient.query(...) instead of setQueryData in web route modules.",
        );
      },
    };
  },
});

export default definePlugin({
  meta: { name: "query" },
  rules: {
    "canonical-query-definitions": canonicalQueryDefinitions,
    "canonical-query-hooks": canonicalQueryHooks,
    "no-hardcoded-query-keys": noHardcodedQueryKeys,
    "no-query-key-helper-functions": noQueryKeyHelperFunctions,
    "no-page-set-query-data": noPageSetQueryData,
  },
});
