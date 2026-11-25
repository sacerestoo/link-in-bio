import { defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getName,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";
import { isFeatureQueriesFile, report } from "./query-utils.ts";

export const noQueryKeyHelperFunctions = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Keep query key factories on the feature query object, not in standalone helper functions",
    },
  },
  create(context) {
    if (!isFeatureQueriesFile(context.filename)) return {};

    const reportStandaloneFactory = (identifier: AstNode): void => {
      report(
        context,
        identifier,
        "Define query key factories on the feature query object, not as standalone *QueryKey functions.",
      );
    };

    return {
      FunctionDeclaration(input: unknown): void {
        if (!isAstNode(input) || input.type !== "FunctionDeclaration") return;
        const identifier = getChild(input, "id");
        if (
          !isAstNode(identifier) ||
          !(getName(identifier) ?? "").endsWith("QueryKey")
        ) {
          return;
        }
        reportStandaloneFactory(identifier);
      },
      VariableDeclarator(input: unknown): void {
        if (!isAstNode(input) || input.type !== "VariableDeclarator") return;
        const identifier = getChild(input, "id");
        const initializer = getChild(input, "init");
        if (
          !isAstNode(identifier) ||
          !(getName(identifier) ?? "").endsWith("QueryKey") ||
          (initializer?.type !== "ArrowFunctionExpression" &&
            initializer?.type !== "FunctionExpression")
        ) {
          return;
        }
        reportStandaloneFactory(identifier);
      },
    };
  },
});
