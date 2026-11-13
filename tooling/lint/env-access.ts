import { definePlugin, defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "./naming/ast-utils.ts";

// Files that may read the environment directly. Everything else imports the
// validated values from the app env.ts (apps/web/server/env.ts,
// apps/cron/src/env.ts).
export const envAccessAllowedFiles = [
  "apps/web/server/env.ts",
  "apps/cron/src/env.ts",
  "**/*.config.ts",
  "tooling/**",
];

function getPropertyName(node: Readonly<AstNode>): string | undefined {
  const property = getChild(node, "property");
  if (node["computed"] === true) return getString(property, "value");
  return getName(property);
}

function isProcessEnv(node: Readonly<AstNode>): boolean {
  if (getPropertyName(node) !== "env") return false;
  let object = getChild(node, "object");
  if (object?.type === "MemberExpression") {
    if (getName(getChild(object, "object")) !== "globalThis") return false;
    object = getChild(object, "property");
  }
  return getName(object) === "process";
}

function isImportMetaEnv(node: Readonly<AstNode>): boolean {
  const object = getChild(node, "object");
  return (
    object?.type === "MetaProperty" &&
    getName(getChild(object, "meta")) === "import" &&
    getPropertyName(node) === "env"
  );
}

function destructuresEnv(node: Readonly<AstNode>): boolean {
  const id = getChild(node, "id");
  if (id?.type !== "ObjectPattern") return false;
  if (getName(getChild(node, "init")) !== "process") return false;
  return getChildren(id, "properties").some(
    (property) => getName(getChild(property, "key")) === "env",
  );
}

const noDirectEnv = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Read environment values only through env.ts" },
    messages: {
      processEnv:
        "Read settings through `getEnv()` or `pickEnv()` from env.ts, not `process.env`.",
      importMetaEnv:
        "Read settings through `getEnv()` or `pickEnv()` from env.ts, not `import.meta.env`.",
      workersEnv:
        "Read settings through `getEnv()` or `pickEnv()` from env.ts, not `env` from `cloudflare:workers`.",
    },
  },
  create(context) {
    return {
      MemberExpression(input: unknown): void {
        if (!isAstNode(input)) return;
        if (isProcessEnv(input)) {
          context.report({ node: input, messageId: "processEnv" });
        } else if (isImportMetaEnv(input)) {
          context.report({ node: input, messageId: "importMetaEnv" });
        }
      },
      VariableDeclarator(input: unknown): void {
        if (isAstNode(input) && destructuresEnv(input)) {
          context.report({ node: input, messageId: "processEnv" });
        }
      },
      ImportDeclaration(input: unknown): void {
        if (!isAstNode(input)) return;
        if (
          getString(getChild(input, "source"), "value") !== "cloudflare:workers"
        )
          return;
        for (const specifier of getChildren(input, "specifiers")) {
          if (
            specifier.type === "ImportNamespaceSpecifier" ||
            getName(getChild(specifier, "imported")) === "env"
          ) {
            context.report({ node: specifier, messageId: "workersEnv" });
          }
        }
      },
    };
  },
});

export default definePlugin({
  meta: { name: "env-access" },
  rules: { "no-direct-env": noDirectEnv },
});
