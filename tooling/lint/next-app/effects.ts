import { defineRule } from "vite-plus/lint/plugins";
import type { RuleContext } from "./directives-shared.ts";
import {
  getChild,
  getChildren,
  getName,
  isAstNode,
  visit,
} from "../naming/ast-utils.ts";

const successFlags = new Set([
  "isSubmitSuccessful",
  "isSuccess",
  "wasSuccessful",
]);
const effectHooks = new Set(["useEffect", "useLayoutEffect"]);

function calleeName(callee: unknown): string | undefined {
  if (!isAstNode(callee)) return undefined;
  if (callee.type === "MemberExpression") {
    return getName(getChild(callee, "property"));
  }
  return getName(callee);
}

export const noSuccessFlagEffect = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Do not use mutation or form success state as an effect trigger",
    },
    messages: {
      success:
        "Do not trigger work from `{{flag}}` in an effect; use the mutation's onSuccess callback so every submission is handled once.",
    },
  },
  create(context: Readonly<RuleContext>) {
    return {
      CallExpression(call: unknown): void {
        if (!isAstNode(call)) return;
        const name = calleeName(getChild(call, "callee"));
        if (name === undefined || !effectHooks.has(name)) return;
        let flag: string | undefined;
        visit(getChildren(call, "arguments"), (node): void => {
          const identifier = getName(node);
          if (
            flag === undefined &&
            node.type === "Identifier" &&
            identifier !== undefined &&
            successFlags.has(identifier)
          ) {
            flag = identifier;
          }
        });
        if (flag !== undefined) {
          context.report({ node: call, messageId: "success", data: { flag } });
        }
      },
    };
  },
});
