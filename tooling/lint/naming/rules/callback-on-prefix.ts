import { defineRule } from "vite-plus/lint/plugins";
import {
  containsJsx,
  getChild,
  getChildren,
  getName,
  isAstNode,
  visit,
  type AstNode,
} from "../ast-utils.ts";
import { callbackNamePattern } from "../patterns.ts";
import {
  getFunctionType,
  getParameterName,
  getParameterType,
  getPropertyName,
  getTypeReferenceName,
  getTypeParameters,
  isFunctionLike,
  isFunctionProperty,
  isFunctionType,
  type TypeDeclarations,
} from "./callback-type-utils.ts";
import {
  isFunctionValue,
  type ResolvedVariables,
} from "./callback-value-utils.ts";

type RuleContext = Parameters<
  NonNullable<Parameters<typeof defineRule>[0]["create"]>
>[0];

const collectTypeDeclarations = (input: AstNode): Map<string, AstNode> => {
  const declarations = new Map<string, AstNode>();
  visit(input, (node) => {
    if (
      node.type !== "TSTypeAliasDeclaration" &&
      node.type !== "TSInterfaceDeclaration"
    ) {
      return;
    }
    const name = getName(getChild(node, "id"));
    if (name !== undefined) declarations.set(name, node);
  });
  return declarations;
};

const collectResolvedVariables = (
  context: RuleContext,
): Map<AstNode, unknown> => {
  const resolvedVariables = new Map<AstNode, unknown>();
  for (const scope of context.sourceCode.scopeManager.scopes) {
    for (const reference of scope.references) {
      if (isAstNode(reference.identifier)) {
        resolvedVariables.set(reference.identifier, reference.resolved);
      }
    }
  }
  return resolvedVariables;
};

const reportName = (
  context: RuleContext,
  node: AstNode,
  name: string | undefined,
  messageId: "parameter" | "prop",
): void => {
  if (name !== undefined && !callbackNamePattern.test(name)) {
    context.report({ node, messageId });
  }
};

const inspectPropsType = (
  context: RuleContext,
  node: unknown,
  declarations: TypeDeclarations,
  inspectedProps: Set<AstNode>,
): void => {
  visit(node, (member) => {
    if (
      inspectedProps.has(member) ||
      !isFunctionProperty(member, declarations)
    ) {
      return;
    }
    inspectedProps.add(member);
    const name = getPropertyName(member);
    const isNextErrorReset =
      name === "reset" && context.filename.endsWith("/apps/web/app/error.tsx");
    if (!isNextErrorReset) reportName(context, member, name, "prop");
  });
};

const inspectComponentProps = (
  context: RuleContext,
  input: AstNode,
  declarations: TypeDeclarations,
  inspectedProps: Set<AstNode>,
): void => {
  for (const [name, declaration] of declarations) {
    if (name.endsWith("Props")) {
      inspectPropsType(context, declaration, declarations, inspectedProps);
    }
  }

  const componentPropTypes = new Set<string>();
  visit(input, (node) => {
    if (!isFunctionLike(node) || !containsJsx(getChild(node, "body"))) return;
    for (const parameter of getChildren(node, "params")) {
      const parameterType = getParameterType(parameter);
      const componentType =
        parameterType === undefined
          ? undefined
          : getFunctionType(parameterType);
      if (componentType?.type === "TSTypeLiteral") {
        inspectPropsType(context, componentType, declarations, inspectedProps);
      }
      visit(parameterType, (typeNode) => {
        if (typeNode.type !== "TSTypeReference") return;
        const name = getTypeReferenceName(getChild(typeNode, "typeName"));
        if (name !== undefined) componentPropTypes.add(name);
      });
    }
  });
  for (const name of componentPropTypes) {
    const declaration = declarations.get(name);
    if (declaration !== undefined) {
      inspectPropsType(context, declaration, declarations, inspectedProps);
    }
  }
};

const inspectCallbackParameters = (
  context: RuleContext,
  input: AstNode,
  declarations: TypeDeclarations,
): void => {
  visit(input, (node) => {
    if (!isFunctionLike(node)) return;
    const typeParameters = getTypeParameters(node);
    for (const parameter of getChildren(node, "params")) {
      if (
        isFunctionType(
          getParameterType(parameter),
          declarations,
          new Set(),
          typeParameters,
        )
      ) {
        reportName(
          context,
          parameter,
          getParameterName(parameter),
          "parameter",
        );
      }
    }
  });
};

const inspectJsxProps = (
  context: RuleContext,
  input: AstNode,
  declarations: TypeDeclarations,
  resolvedVariables: ResolvedVariables,
): void => {
  visit(input, (node) => {
    if (node.type === "JSXSpreadAttribute") {
      const expression = getChild(node, "argument");
      if (expression?.type !== "ObjectExpression") return;
      for (const property of getChildren(expression, "properties")) {
        const name = getPropertyName(property);
        const value = getChild(property, "value");
        if (
          property.type === "ObjectMethod" ||
          isFunctionValue(value, resolvedVariables, declarations)
        ) {
          reportName(context, property, name, "prop");
        }
      }
      return;
    }
    if (node.type !== "JSXAttribute") return;
    const name = getName(getChild(node, "name"));
    const value = getChild(node, "value");
    if (value?.type !== "JSXExpressionContainer") return;
    const expression = getChild(value, "expression");
    if (
      name !== "ref" &&
      isFunctionValue(expression, resolvedVariables, declarations)
    ) {
      reportName(context, node, name, "prop");
    }
  });
};

const callbackOnPrefix = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require callback parameters and function-valued props to use the on prefix",
    },
    messages: {
      parameter: "Function-valued parameters must start with `on`.",
      prop: "Function-valued props must start with `on`.",
    },
  },
  create(context) {
    return {
      Program(input: unknown): void {
        if (!isAstNode(input)) return;
        const declarations = collectTypeDeclarations(input);
        const resolvedVariables = collectResolvedVariables(context);
        inspectComponentProps(context, input, declarations, new Set());
        inspectCallbackParameters(context, input, declarations);
        inspectJsxProps(context, input, declarations, resolvedVariables);
      },
    };
  },
});

export default callbackOnPrefix;
