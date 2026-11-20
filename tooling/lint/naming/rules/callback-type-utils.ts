import {
  getChild,
  getChildren,
  getName,
  getString,
  isAstNode,
  type AstNode,
} from "../ast-utils.ts";

export type TypeDeclarations = ReadonlyMap<string, AstNode>;
export type TypeParameters = ReadonlyMap<string, AstNode>;

const callbackTypeNamePattern = /(?:Callback|Handler|Fn|Function|Dispatch)$/u;

export const getTypeReferenceName = (node: unknown): string | undefined => {
  if (!isAstNode(node)) return undefined;
  if (node.type === "Identifier") return getName(node);
  if (node.type === "TSQualifiedName")
    return getTypeReferenceName(getChild(node, "right"));
  return undefined;
};

export const getFunctionType = (node: AstNode): AstNode | undefined =>
  getChild(node, "typeAnnotation") ?? getChild(node, "type");

export const getTypeParameters = (node: AstNode): Map<string, AstNode> => {
  const parameters = new Map<string, AstNode>();
  for (const parameter of getChildren(
    getChild(node, "typeParameters"),
    "params",
  )) {
    const name =
      getName(getChild(parameter, "name")) ?? getString(parameter, "name");
    if (name !== undefined) parameters.set(name, parameter);
  }
  return parameters;
};

export const getPropertyName = (node: AstNode): string | undefined =>
  getName(getChild(node, "key")) ?? getName(getChild(node, "name"));

export const isFunctionProperty = (
  node: AstNode,
  declarations: TypeDeclarations,
): boolean =>
  node.type === "TSMethodSignature" ||
  (node.type === "TSPropertySignature" &&
    isFunctionType(getChild(node, "typeAnnotation"), declarations));

const getTypeMembers = (
  node: unknown,
  declarations: TypeDeclarations,
  seen = new Set<string>(),
): ReadonlyArray<Readonly<AstNode>> => {
  if (!isAstNode(node)) return [];
  if (node.type === "TSTypeLiteral") return getChildren(node, "members");
  if (node.type === "TSIntersectionType") {
    return getChildren(node, "types").flatMap((type) =>
      getTypeMembers(type, declarations, seen),
    );
  }
  if (node.type !== "TSTypeReference") return [];
  const name = getTypeReferenceName(getChild(node, "typeName"));
  const declaration = name === undefined ? undefined : declarations.get(name);
  if (name === undefined || declaration === undefined || seen.has(name))
    return [];
  seen.add(name);
  if (declaration.type === "TSTypeAliasDeclaration") {
    return getTypeMembers(
      getChild(declaration, "typeAnnotation"),
      declarations,
      seen,
    );
  }
  return getChildren(getChild(declaration, "body"), "body");
};

const isFunctionIndexedAccess = (
  node: AstNode,
  declarations: TypeDeclarations,
  seen: Set<string>,
  typeParameters: TypeParameters,
): boolean => {
  const members = getTypeMembers(getChild(node, "objectType"), declarations);
  const indexType = getChild(node, "indexType");
  const indexes =
    indexType?.type === "TSUnionType"
      ? getChildren(indexType, "types")
      : indexType === undefined
        ? []
        : [indexType];
  return indexes.some((index) => {
    const name = getName(getChild(index, "literal")) ?? getName(index);
    const member = members.find(
      (candidate) => getPropertyName(candidate) === name,
    );
    return (
      member !== undefined &&
      isFunctionType(
        getChild(member, "typeAnnotation"),
        declarations,
        seen,
        typeParameters,
      )
    );
  });
};

export const isFunctionType = (
  node: unknown,
  declarations: TypeDeclarations,
  seen = new Set<string>(),
  typeParameters: TypeParameters = new Map(),
): boolean => {
  if (!isAstNode(node)) return false;
  if (node.type === "TSFunctionType" || node.type === "TSConstructorType") {
    return true;
  }
  if (
    node.type === "TSTypeAnnotation" ||
    node.type === "TSParenthesizedType" ||
    node.type === "TSOptionalType" ||
    node.type === "TSRestType"
  ) {
    return isFunctionType(
      getFunctionType(node),
      declarations,
      seen,
      typeParameters,
    );
  }
  if (node.type === "TSUnionType" || node.type === "TSIntersectionType") {
    return getChildren(node, "types").some((type) =>
      isFunctionType(type, declarations, seen, typeParameters),
    );
  }
  if (node.type === "TSIndexedAccessType") {
    return isFunctionIndexedAccess(node, declarations, seen, typeParameters);
  }
  return (
    node.type === "TSTypeReference" &&
    isFunctionReference(node, declarations, seen, typeParameters)
  );
};

const isFunctionReference = (
  node: AstNode,
  declarations: TypeDeclarations,
  seen: Set<string>,
  typeParameters: TypeParameters,
): boolean => {
  const name = getTypeReferenceName(getChild(node, "typeName"));
  if (name === undefined) return false;
  const declaration = declarations.get(name);
  if (declaration !== undefined && !seen.has(name)) {
    return isFunctionDeclaration(
      declaration,
      declarations,
      seen,
      typeParameters,
    );
  }
  const typeParameter = typeParameters.get(name);
  const typeParameterKey = `type:${name}`;
  if (typeParameter !== undefined && !seen.has(typeParameterKey)) {
    seen.add(typeParameterKey);
    return isFunctionType(
      getChild(typeParameter, "constraint"),
      declarations,
      seen,
      typeParameters,
    );
  }
  return callbackTypeNamePattern.test(name) || name === "Function";
};

const isFunctionDeclaration = (
  declaration: AstNode,
  declarations: TypeDeclarations,
  seen: Set<string>,
  typeParameters: TypeParameters,
): boolean => {
  const name = getName(getChild(declaration, "id"));
  if (name !== undefined) seen.add(name);
  if (declaration.type === "TSTypeAliasDeclaration") {
    return isFunctionType(
      getChild(declaration, "typeAnnotation"),
      declarations,
      seen,
      typeParameters,
    );
  }
  const body = getChild(declaration, "body");
  if (
    getChildren(body, "body").some(
      (member) => member.type === "TSCallSignatureDeclaration",
    )
  ) {
    return true;
  }
  return getChildren(declaration, "extends").some((extension) =>
    isFunctionType(extension, declarations, seen, typeParameters),
  );
};

export const getParameterName = (parameter: AstNode): string | undefined => {
  const binding = getBindingIdentifier(parameter);
  return getName(binding);
};

const getBindingIdentifier = (parameter: AstNode): AstNode | undefined => {
  if (parameter.type === "Identifier") return parameter;
  if (
    parameter.type === "AssignmentPattern" ||
    parameter.type === "RestElement" ||
    parameter.type === "TSParameterProperty"
  ) {
    return getBindingIdentifier(
      getChild(parameter, "left") ??
        getChild(parameter, "argument") ??
        getChild(parameter, "parameter") ??
        parameter,
    );
  }
  return undefined;
};

export const getParameterType = (parameter: AstNode): AstNode | undefined =>
  getChild(getBindingIdentifier(parameter), "typeAnnotation") ??
  getChild(parameter, "typeAnnotation");

export const isFunctionLike = (node: AstNode): boolean =>
  node.type === "FunctionDeclaration" ||
  node.type === "FunctionExpression" ||
  node.type === "ArrowFunctionExpression" ||
  node.type === "TSFunctionType" ||
  node.type === "TSConstructorType" ||
  node.type === "TSCallSignatureDeclaration" ||
  node.type === "TSMethodSignature" ||
  node.type === "TSConstructSignatureDeclaration";
