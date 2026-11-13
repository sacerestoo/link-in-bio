import { defineRule } from "vite-plus/lint/plugins";
import { getChild, isAstNode, type AstNode } from "../naming/ast-utils.ts";
import { fileDirectives, type RuleContext } from "./directives-shared.ts";

function directiveRule(directive: string, description: string, fix: string) {
  return defineRule({
    meta: {
      type: "problem",
      docs: { description },
      messages: { placement: `"${directive}" is not allowed here. ${fix}` },
    },
    create(context: Readonly<RuleContext>) {
      return {
        Program(program: unknown): void {
          if (!isAstNode(program)) return;
          if (fileDirectives(program).includes(directive)) {
            context.report({ node: program, messageId: "placement" });
          }
        },
      };
    },
  });
}

export const clientDirectivePlacement = directiveRule(
  "use client",
  "Keep Client Component boundaries in UI folders",
  "Put interactive components in features/<name>/ui/ or shared/ui/ and render them from the Server Component; pages and layouts stay server-rendered.",
);

export const serverDirectivePlacement = directiveRule(
  "use server",
  "Keep Server Functions in feature actions modules",
  "Server Functions live in features/<name>/actions.ts, which validates every argument with a contract.",
);

function isFunctionNode(node: Readonly<AstNode>): boolean {
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression"
  );
}

export const noInlineServerAction = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Do not declare Server Functions inside other functions",
    },
    messages: {
      inline:
        'Move this inline "use server" function to features/<name>/actions.ts. Inline Server Functions capture closure values and skip the actions contract check.',
    },
  },
  create(context: Readonly<RuleContext>) {
    function check(node: unknown): void {
      if (!isAstNode(node) || !isFunctionNode(node)) return;
      const body = getChild(node, "body");
      if (body?.type !== "BlockStatement") return;
      if (fileDirectives(body).includes("use server")) {
        context.report({ node, messageId: "inline" });
      }
    }
    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});
