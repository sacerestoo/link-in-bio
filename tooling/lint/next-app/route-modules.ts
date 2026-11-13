import { defineRule } from "vite-plus/lint/plugins";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "../naming/ast-utils.ts";
import { fileDirectives, type RuleContext } from "./directives-shared.ts";

// Route segment config: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const segmentConfigExports = new Set([
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
]);
const pageExports = new Set([
  "default",
  "generateMetadata",
  "generateStaticParams",
  "generateViewport",
  "metadata",
  "viewport",
  ...segmentConfigExports,
]);
const routeHandlerExports = new Set([
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "generateStaticParams",
  ...segmentConfigExports,
]);
const defaultOnlyExports = new Set(["default"]);
// Files Next.js only renders from their default export.
const routeModuleExports = new Map<string, ReadonlySet<string>>([
  ["page", pageExports],
  ["layout", pageExports],
  ["route", routeHandlerExports],
  ["template", defaultOnlyExports],
  ["default", defaultOnlyExports],
  ["loading", defaultOnlyExports],
  ["not-found", defaultOnlyExports],
  ["forbidden", defaultOnlyExports],
  ["unauthorized", defaultOnlyExports],
  ["error", defaultOnlyExports],
  ["global-error", new Set(["default", "metadata"])],
]);
const clientOnlyRouteModules = new Set(["error", "global-error"]);

function routeModuleName(filename: string): string | undefined {
  const match = /(?:^|[/\\])([a-z-]+)\.tsx?$/u.exec(filename);
  const name = match?.[1];
  return name !== undefined && routeModuleExports.has(name) ? name : undefined;
}

type ExportedName = Readonly<{ name: string; node: Readonly<AstNode> }>;

function bindingNames(pattern: unknown): ExportedName[] {
  if (!isAstNode(pattern)) return [];
  if (pattern.type === "Identifier") {
    return [{ name: getName(pattern) ?? "", node: pattern }];
  }
  if (pattern.type === "ObjectPattern") {
    return getChildren(pattern, "properties").flatMap((property) =>
      property.type === "RestElement"
        ? bindingNames(getChild(property, "argument"))
        : bindingNames(getChild(property, "value")),
    );
  }
  if (pattern.type === "ArrayPattern") {
    return getChildren(pattern, "elements").flatMap((element) =>
      bindingNames(element),
    );
  }
  if (pattern.type === "AssignmentPattern") {
    return bindingNames(getChild(pattern, "left"));
  }
  return [];
}

function exportedNames(statement: Readonly<AstNode>): ExportedName[] {
  if (statement.type === "ExportDefaultDeclaration") {
    return [{ name: "default", node: statement }];
  }
  if (statement.type === "ExportAllDeclaration") {
    return [{ name: "*", node: statement }];
  }
  if (statement.type !== "ExportNamedDeclaration") return [];
  if (getString(statement, "exportKind") === "type") return [];
  const declaration = getChild(statement, "declaration");
  if (declaration?.type === "VariableDeclaration") {
    return getChildren(declaration, "declarations").flatMap((declarator) =>
      bindingNames(getChild(declarator, "id")),
    );
  }
  if (
    declaration?.type === "FunctionDeclaration" ||
    declaration?.type === "ClassDeclaration"
  ) {
    return [
      { name: getName(getChild(declaration, "id")) ?? "", node: declaration },
    ];
  }
  if (declaration !== undefined) return [];
  return getChildren(statement, "specifiers")
    .filter((specifier) => getString(specifier, "exportKind") !== "type")
    .map((specifier) => ({
      name: getName(getChild(specifier, "exported")) ?? "",
      node: specifier,
    }));
}

export const routeModuleExportsRule = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Only export the names Next.js reads from App Router special files",
    },
    messages: {
      unexpected:
        "`{{name}}` is not a Next.js export for `{{file}}`. Allowed: {{allowed}}. Move other code to features/ or shared/.",
      missingDefault:
        "`{{file}}` must default-export its component so Next.js can render it.",
      routeDefault:
        "Route handlers export HTTP method functions (GET, POST, ...), not a default export.",
      clientRequired:
        '`{{file}}` must start with "use client": Next.js renders error boundaries as Client Components.',
    },
  },
  create(context: Readonly<RuleContext>) {
    const file = routeModuleName(context.filename);
    if (file === undefined) return {};
    const allowed = routeModuleExports.get(file) ?? defaultOnlyExports;
    return {
      Program(program: unknown): void {
        if (!isAstNode(program)) return;
        const names = getChildren(program, "body").flatMap((statement) =>
          exportedNames(statement),
        );
        for (const { name, node } of names) {
          if (file === "route" && name === "default") {
            context.report({ node, messageId: "routeDefault" });
          } else if (!allowed.has(name)) {
            context.report({
              node,
              messageId: "unexpected",
              data: { name, file, allowed: [...allowed].join(", ") },
            });
          }
        }
        if (file !== "route" && !names.some(({ name }) => name === "default")) {
          context.report({
            node: program,
            messageId: "missingDefault",
            data: { file },
          });
        }
        if (
          clientOnlyRouteModules.has(file) &&
          !fileDirectives(program).includes("use client")
        ) {
          context.report({
            node: program,
            messageId: "clientRequired",
            data: { file },
          });
        }
      },
    };
  },
});

function isStaticLiteral(node: unknown): boolean {
  if (!isAstNode(node)) return false;
  if (node.type === "Literal") return true;
  if (node.type === "TemplateLiteral") {
    return getChildren(node, "expressions").length === 0;
  }
  if (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression") {
    return isStaticLiteral(getChild(node, "expression"));
  }
  if (node.type === "ArrayExpression") {
    return getChildren(node, "elements").every((element) =>
      isStaticLiteral(element),
    );
  }
  return false;
}

export const staticSegmentConfig = defineRule({
  meta: {
    type: "problem",
    docs: {
      description: "Route segment config must be a static literal",
    },
    messages: {
      literal:
        "Route segment config `{{name}}` must be a literal value; Next.js reads it statically at build time.",
    },
  },
  create(context: Readonly<RuleContext>) {
    if (routeModuleName(context.filename) === undefined) return {};
    return {
      ExportNamedDeclaration(statement: unknown): void {
        const declaration = getChild(statement, "declaration");
        if (declaration?.type !== "VariableDeclaration") return;
        for (const declarator of getChildren(declaration, "declarations")) {
          const name = getName(getChild(declarator, "id"));
          if (name === undefined || !segmentConfigExports.has(name)) continue;
          if (!isStaticLiteral(getChild(declarator, "init"))) {
            context.report({
              node: declarator,
              messageId: "literal",
              data: { name },
            });
          }
        }
      },
    };
  },
});
