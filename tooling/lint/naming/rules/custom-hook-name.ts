import { defineRule } from "vite-plus/lint/plugins";
import { getChild, getString, isAstNode, visit } from "../ast-utils.ts";
import { componentNamePattern } from "../patterns.ts";

const hookNamePattern = /^use[A-Z][A-Za-z0-9]*$/u;

function containsHookCall(node: unknown): boolean {
  let found = false;
  visit(node, (child) => {
    if (
      child.type === "CallExpression" &&
      getChild(child, "callee")?.type === "Identifier" &&
      hookNamePattern.test(getString(getChild(child, "callee"), "name") ?? "")
    ) {
      found = true;
    }
  });
  return found;
}

const customHookName = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require custom hook functions to start with use" },
    messages: { hook: "Custom hooks must use the `useX` function name form." },
  },
  create(context) {
    return {
      FunctionDeclaration(input: unknown): void {
        if (!isAstNode(input)) return;
        const node = input;
        const id = getChild(node, "id");
        const name = getString(id, "name");
        const body = getChild(node, "body");
        if (
          id &&
          name !== undefined &&
          name !== "" &&
          !componentNamePattern.test(name) &&
          containsHookCall(body) &&
          !hookNamePattern.test(name)
        ) {
          context.report({ node: id, messageId: "hook" });
        }
      },
      VariableDeclarator(input: unknown): void {
        if (!isAstNode(input)) return;
        const node = input;
        const id = getChild(node, "id");
        const init = getChild(node, "init");
        const name = getString(id, "name");
        if (
          id?.type === "Identifier" &&
          name !== undefined &&
          name !== "" &&
          !componentNamePattern.test(name) &&
          (init?.type === "ArrowFunctionExpression" ||
            init?.type === "FunctionExpression") &&
          containsHookCall(getChild(init, "body")) &&
          !hookNamePattern.test(name)
        ) {
          context.report({ node: id, messageId: "hook" });
        }
      },
    };
  },
});

export default customHookName;
