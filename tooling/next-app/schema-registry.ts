import { parseSync } from "vite-plus";
import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  visit,
  type AstNode,
} from "../lint/naming/ast-utils.ts";

/**
 * What db/client.ts actually registers, read from its AST: which local names
 * import each `./schema/<domain>` module, which names the exported `schema`
 * object spreads, and whether that object reaches `drizzle(..., { schema })`.
 */
export type SchemaRegistry = Readonly<{
  importsByDomain: ReadonlyMap<string, readonly string[]>;
  spreadNames: ReadonlySet<string>;
  hasSchemaExport: boolean;
  passedToDrizzle: boolean;
}>;

const schemaExportName = "schema";

const collectImports = (
  program: Readonly<AstNode>,
  schemaPrefix: string,
): Map<string, string[]> => {
  const importsByDomain = new Map<string, string[]>();
  for (const statement of getChildren(program, "body")) {
    if (statement.type !== "ImportDeclaration") continue;
    const source = getString(getChild(statement, "source"), "value");
    if (source?.startsWith(schemaPrefix) !== true) continue;
    const domain = source.slice(schemaPrefix.length);
    const locals = getChildren(statement, "specifiers")
      .map((specifier) => getName(getChild(specifier, "local")))
      .filter((name): name is string => name !== undefined);
    importsByDomain.set(domain, [
      ...(importsByDomain.get(domain) ?? []),
      ...locals,
    ]);
  }
  return importsByDomain;
};

const findSchemaObject = (
  program: Readonly<AstNode>,
): Readonly<AstNode> | undefined => {
  for (const statement of getChildren(program, "body")) {
    if (statement.type !== "ExportNamedDeclaration") continue;
    const declaration = getChild(statement, "declaration");
    for (const declarator of getChildren(declaration, "declarations")) {
      if (getName(getChild(declarator, "id")) !== schemaExportName) continue;
      const init = getChild(declarator, "init");
      return init?.type === "ObjectExpression" ? init : undefined;
    }
  }
  return undefined;
};

const collectSpreadNames = (
  schemaObject: Readonly<AstNode> | undefined,
): Set<string> =>
  new Set(
    getChildren(schemaObject, "properties")
      .filter((property) => property.type === "SpreadElement")
      .map((property) => getName(getChild(property, "argument")))
      .filter((name): name is string => name !== undefined),
  );

const passesSchemaToDrizzle = (program: Readonly<AstNode>): boolean => {
  let found = false;
  visit(program, (node) => {
    if (node.type !== "CallExpression") return;
    if (getName(getChild(node, "callee")) !== "drizzle") return;
    const options = getChildren(node, "arguments")[1];
    found ||= getChildren(options, "properties").some(
      (property) =>
        getName(getChild(property, "key")) === schemaExportName &&
        getName(getChild(property, "value")) === schemaExportName,
    );
  });
  return found;
};

export const readSchemaRegistry = (
  clientSource: string,
  schemaPrefix: string,
): SchemaRegistry => {
  const { program, errors } = parseSync("client.ts", clientSource, {
    lang: "ts",
    range: true,
  });
  const root: unknown = program;
  if (errors.length > 0 || !isAstNode(root)) {
    throw new Error(
      `Could not parse the database client: ${errors.map((error) => error.message).join("; ")}`,
    );
  }
  const schemaObject = findSchemaObject(root);
  return {
    importsByDomain: collectImports(root, schemaPrefix),
    spreadNames: collectSpreadNames(schemaObject),
    hasSchemaExport: schemaObject !== undefined,
    passedToDrizzle: passesSchemaToDrizzle(root),
  };
};
