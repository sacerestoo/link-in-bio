import { defineRule } from "vite-plus/lint/plugins";
import type { RuleContext } from "../next-app/directives-shared.ts";
import {
  getChild,
  getChildren,
  getName,
  isAstNode,
  type AstNode,
} from "../naming/ast-utils.ts";
import {
  bodyReaders,
  contractHelperName,
  importedFrom,
  isContractModule,
  responseClasses,
  tableSchemaFactories,
} from "./resolve.ts";

export const noRawBodyRead = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Read request and response bodies only through a valibot contract",
    },
    messages: {
      read: "Do not call `.{{method}}()` on a body here. Use `readJson(contract, request)` from @/shared/lib/contract so the input is parsed by a contract from features/<name>/contracts.ts.",
      respond:
        "Do not build JSON with `{{owner}}.json()`. Return `jsonResponse(contract, data)` from @/shared/lib/contract so the response is parsed by its contract and unlisted columns are stripped.",
    },
  },
  create(context: Readonly<RuleContext>) {
    return {
      CallExpression(call: unknown): void {
        if (!isAstNode(call)) return;
        const callee = getChild(call, "callee");
        if (callee?.type !== "MemberExpression") return;
        const method = getName(getChild(callee, "property"));
        if (method === undefined || !bodyReaders.has(method)) return;
        const owner = getName(getChild(callee, "object"));
        if (
          method === "json" &&
          owner !== undefined &&
          responseClasses.has(owner)
        ) {
          context.report({ node: call, messageId: "respond", data: { owner } });
          return;
        }
        if (getChildren(call, "arguments").length === 0) {
          context.report({ node: call, messageId: "read", data: { method } });
        }
      },
    };
  },
});

export const contractFromContractsModule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Boundary helpers take a contract from a feature contracts module",
    },
    messages: {
      source:
        "Pass `{{helper}}` a schema imported from @/features/<name>/contracts. Boundary schemas live there so every request and response shape is reviewed in one place.",
    },
  },
  create(context: Readonly<RuleContext>) {
    return {
      CallExpression(call: unknown): void {
        if (!isAstNode(call)) return;
        const helper = contractHelperName(context, call);
        if (helper === undefined) return;
        const contract = getChildren(call, "arguments")[0];
        const source = importedFrom(context, contract);
        if (!isContractModule(context.filename, source)) {
          context.report({
            node: contract ?? call,
            messageId: "source",
            data: { helper },
          });
        }
      },
    };
  },
});

function calleeName(call: Readonly<AstNode>): string | undefined {
  const callee = getChild(call, "callee");
  return callee?.type === "MemberExpression"
    ? getName(getChild(callee, "property"))
    : getName(callee);
}

export const contractExplicitPick = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Table-derived contracts list their fields with pick, never omit",
    },
    messages: {
      pick: 'Wrap `{{factory}}(table)` in `v.pick(..., ["field", ...])`. A whole-table schema exposes every column, including ones added later.',
      omit: "Use `v.pick` with the fields the boundary accepts or returns. `omit` lets new columns through by default.",
    },
  },
  create(context: Readonly<RuleContext>) {
    return {
      CallExpression(call: unknown): void {
        if (!isAstNode(call)) return;
        const name = calleeName(call);
        if (
          name === "omit" &&
          importedFrom(context, getChild(call, "callee")) === "valibot"
        ) {
          context.report({ node: call, messageId: "omit" });
          return;
        }
        if (name === undefined || !tableSchemaFactories.has(name)) return;
        const parent = getChild(call, "parent");
        const pickedDirectly =
          parent?.type === "CallExpression" &&
          calleeName(parent) === "pick" &&
          getChildren(parent, "arguments")[0] === call;
        if (!pickedDirectly) {
          context.report({
            node: call,
            messageId: "pick",
            data: { factory: name },
          });
        }
      },
    };
  },
});
