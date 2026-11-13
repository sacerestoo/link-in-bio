import { defineRule } from "vite-plus/lint/plugins";
import { isAstNode } from "../ast-utils.ts";

const noJavascriptFiles = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require TypeScript source files" },
    messages: {
      typescriptOnly: "Use a TypeScript file instead of JavaScript.",
    },
  },
  create(context) {
    return {
      Program(input: unknown): void {
        if (!isAstNode(input)) return;
        const node = input;
        if (/\.(?:cjs|js|jsx|mjs)$/iu.test(context.filename)) {
          context.report({ node, messageId: "typescriptOnly" });
        }
      },
    };
  },
});

export default noJavascriptFiles;
