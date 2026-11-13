import { defineRule } from "vite-plus/lint/plugins";
import { getChild, getName, isAstNode } from "../ast-utils.ts";

const pascalCasePattern = /^[A-Z][A-Za-z0-9]*$/u;

type RuleContext = Parameters<
  NonNullable<Parameters<typeof defineRule>[0]["create"]>
>[0];

function checkPascalCase(context: Readonly<RuleContext>, node: unknown): void {
  if (!isAstNode(node)) return;
  const name = getName(node);
  if (name === undefined || name === "" || pascalCasePattern.test(name)) return;

  context.report({
    node,
    message: `Identifier "${name}" must use PascalCase.`,
  });
}

export const pascalCaseTypes = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require PascalCase for type declarations" },
  },
  create(context) {
    return {
      TSTypeAliasDeclaration(node: unknown): void {
        if (isAstNode(node)) checkPascalCase(context, getChild(node, "id"));
      },
      TSInterfaceDeclaration(node: unknown): void {
        if (isAstNode(node)) checkPascalCase(context, getChild(node, "id"));
      },
      TSTypeParameter(node: unknown): void {
        if (isAstNode(node)) checkPascalCase(context, getChild(node, "name"));
      },
    };
  },
});
