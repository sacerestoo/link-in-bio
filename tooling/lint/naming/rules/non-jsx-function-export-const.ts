import { defineRule } from "vite-plus/lint/plugins";
import {
  containsJsx,
  getChild,
  getChildren,
  getString,
  isAstNode,
} from "../ast-utils.ts";

const nonJsxFunctionExportConst = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require non-JSX functions to use exported const declarations",
    },
    messages: {
      exportConst:
        "Functions without JSX must use a named `export const` declaration.",
    },
  },
  create(context) {
    return {
      Program(input: unknown): void {
        if (!isAstNode(input)) return;

        for (const statement of getChildren(input, "body")) {
          const isNamedExport = statement.type === "ExportNamedDeclaration";
          const isDefaultExport = statement.type === "ExportDefaultDeclaration";
          if (!isNamedExport && !isDefaultExport) continue;
          const declaration = getChild(statement, "declaration");

          if (declaration?.type === "FunctionDeclaration") {
            if (!containsJsx(getChild(declaration, "body"))) {
              context.report({ node: statement, messageId: "exportConst" });
            }
            continue;
          }

          if (declaration?.type !== "VariableDeclaration") continue;
          for (const variable of getChildren(declaration, "declarations")) {
            const init = getChild(variable, "init");
            if (
              (init?.type === "ArrowFunctionExpression" ||
                init?.type === "FunctionExpression") &&
              !containsJsx(getChild(init, "body")) &&
              (!isNamedExport || getString(declaration, "kind") !== "const")
            ) {
              context.report({ node: statement, messageId: "exportConst" });
            }
          }
        }
      },
    };
  },
});

export default nonJsxFunctionExportConst;
