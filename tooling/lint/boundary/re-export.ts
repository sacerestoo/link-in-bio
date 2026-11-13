import { defineRule } from "vite-plus/lint/plugins";
import type { RuleContext } from "../next-app/directives-shared.ts";
import { getChild, getString, isAstNode } from "../naming/ast-utils.ts";

export const noReExport = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Import from the defining module instead of a barrel",
    },
    messages: {
      reExport:
        "Do not re-export from `{{source}}`. Import from the module that defines the value; barrels hide the dependency graph and defeat boundary checks.",
    },
  },
  create(context: Readonly<RuleContext>) {
    function check(statement: unknown): void {
      const source = getString(getChild(statement, "source"), "value");
      if (isAstNode(statement) && source !== undefined) {
        context.report({
          node: statement,
          messageId: "reExport",
          data: { source },
        });
      }
    }
    return { ExportAllDeclaration: check, ExportNamedDeclaration: check };
  },
});
