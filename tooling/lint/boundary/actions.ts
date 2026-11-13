import { defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "../naming/ast-utils.ts";
import {
  fileDirectives,
  type RuleContext,
} from "../next-app/directives-shared.ts";
import { contractHelperName } from "./resolve.ts";

type ExportedFunction = Readonly<{ name: string; node: Readonly<AstNode> }>;

function exportedActions(program: Readonly<AstNode>): {
  functions: ExportedFunction[];
  others: Readonly<AstNode>[];
} {
  const functions: ExportedFunction[] = [];
  const others: Readonly<AstNode>[] = [];
  for (const statement of getChildren(program, "body")) {
    if (statement.type === "ExportDefaultDeclaration") {
      others.push(statement);
      continue;
    }
    if (statement.type !== "ExportNamedDeclaration") continue;
    if (getString(statement, "exportKind") === "type") continue;
    const declaration = getChild(statement, "declaration");
    if (declaration?.type === "FunctionDeclaration") {
      functions.push({
        name: getName(getChild(declaration, "id")) ?? "",
        node: declaration,
      });
      continue;
    }
    if (declaration?.type === "VariableDeclaration") {
      for (const declarator of getChildren(declaration, "declarations")) {
        const init = getChild(declarator, "init");
        if (
          init?.type === "ArrowFunctionExpression" ||
          init?.type === "FunctionExpression"
        ) {
          functions.push({
            name: getName(getChild(declarator, "id")) ?? "",
            node: init,
          });
        } else {
          others.push(declarator);
        }
      }
      continue;
    }
    if (declaration === undefined || !declaration.type.startsWith("TS")) {
      others.push(statement);
    }
  }
  return { functions, others };
}

export const serverActionInput = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Server Functions parse every argument with a contract",
    },
    messages: {
      directive:
        'Start actions modules with "use server" so Next.js treats every export as a Server Function.',
      export:
        "Actions modules export only async Server Functions. Move other exports to the feature's contracts.ts or a server module.",
      notAsync: "Server Function `{{name}}` must be async.",
      pattern:
        "Take `{{name}}` arguments as plain parameters and parse them with `parseInput(contract, value)`; destructuring reads unvalidated client input.",
      unvalidated:
        "Use parameter `{{param}}` only as `parseInput(contract, {{param}})`. Server Function arguments come from the client and must be parsed before use.",
    },
  },
  create(context: Readonly<RuleContext>) {
    return {
      Program(program: unknown): void {
        if (!isAstNode(program)) return;
        if (!fileDirectives(program).includes("use server")) {
          context.report({ node: program, messageId: "directive" });
        }
        const { functions, others } = exportedActions(program);
        for (const node of others)
          context.report({ node, messageId: "export" });
        for (const { name, node } of functions) {
          if (node["async"] !== true) {
            context.report({ node, messageId: "notAsync", data: { name } });
          }
          for (const param of getChildren(node, "params")) {
            if (param.type !== "Identifier") {
              context.report({
                node: param,
                messageId: "pattern",
                data: { name },
              });
              continue;
            }
            const paramName = getName(param) ?? "";
            const functionNode: unknown = node;
            const variable = context.sourceCode.scopeManager.scopes
              .find((scope) => scope.block === functionNode)
              ?.set.get(paramName);
            for (const reference of variable?.references ?? []) {
              const identifier: unknown = reference.identifier;
              const parent = getChild(identifier, "parent");
              const validated =
                parent?.type === "CallExpression" &&
                getChildren(parent, "arguments")[1] === identifier &&
                contractHelperName(context, parent) === "parseInput";
              if (!validated && isAstNode(identifier)) {
                context.report({
                  node: identifier,
                  messageId: "unvalidated",
                  data: { param: paramName },
                });
              }
            }
          }
        }
      },
    };
  },
});
