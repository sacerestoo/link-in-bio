import { getChild, getName, isAstNode, type AstNode } from "../ast-utils.ts";
import {
  isFunctionType,
  type TypeDeclarations,
} from "./callback-type-utils.ts";

export type ResolvedVariables = ReadonlyMap<AstNode, unknown>;

const isFunctionExpression = (node: unknown): boolean =>
  isAstNode(node) &&
  (node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionExpression");

const getDefinitionNode = (definition: unknown): AstNode | undefined => {
  if (typeof definition !== "object" || definition === null) return undefined;
  const node = Reflect.get(definition, "node") as unknown;
  return isAstNode(node) ? node : undefined;
};

const isCallbackFactory = (node: unknown): boolean => {
  if (!isAstNode(node) || node.type !== "CallExpression") return false;
  const callee = getChild(node, "callee");
  return (
    getName(callee) === "useCallback" ||
    getName(getChild(callee, "property")) === "useCallback"
  );
};

const isFunctionIdentifier = (
  identifier: AstNode,
  resolvedVariables: ResolvedVariables,
  declarations: TypeDeclarations,
): boolean => {
  const variable = resolvedVariables.get(identifier);
  if (typeof variable !== "object" || variable === null) return false;
  const definitions = Reflect.get(variable, "defs") as unknown;
  if (!Array.isArray(definitions)) return false;

  return definitions.some((definition: unknown) => {
    if (typeof definition !== "object" || definition === null) return false;
    const definitionType = Reflect.get(definition, "type") as unknown;
    const binding = Reflect.get(definition, "name") as unknown;
    const node = getDefinitionNode(definition);
    if (
      node?.type === "FunctionDeclaration" &&
      (definitionType === "FunctionName" || definitionType === "Function")
    ) {
      return true;
    }
    if (node?.type === "VariableDeclarator") {
      const initializer = getChild(node, "init");
      if (isFunctionExpression(initializer) || isCallbackFactory(initializer)) {
        return true;
      }
      return isFunctionType(
        getChild(getChild(node, "id"), "typeAnnotation"),
        declarations,
      );
    }
    return (
      isAstNode(binding) &&
      isFunctionType(getChild(binding, "typeAnnotation"), declarations)
    );
  });
};

export const isFunctionValue = (
  node: unknown,
  resolvedVariables: ResolvedVariables,
  declarations: TypeDeclarations,
): boolean => {
  if (!isAstNode(node)) return false;
  if (isFunctionExpression(node)) return true;
  if (node.type === "Identifier") {
    return isFunctionIdentifier(node, resolvedVariables, declarations);
  }
  if (
    node.type === "TSAsExpression" ||
    node.type === "TSTypeAssertion" ||
    node.type === "TSNonNullExpression" ||
    node.type === "ChainExpression"
  ) {
    return isFunctionValue(
      getChild(node, "expression"),
      resolvedVariables,
      declarations,
    );
  }
  if (node.type === "ConditionalExpression") {
    return (
      isFunctionValue(
        getChild(node, "consequent"),
        resolvedVariables,
        declarations,
      ) ||
      isFunctionValue(
        getChild(node, "alternate"),
        resolvedVariables,
        declarations,
      )
    );
  }
  return false;
};
