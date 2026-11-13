export type AstNode = {
  type: string;
  start: number;
  end: number;
  range: [number, number];
  [key: string]: unknown;
};

export function getName(identifier: unknown): string | undefined {
  if (!isAstNode(identifier)) return undefined;
  if (identifier.type === "Identifier" || identifier.type === "JSXIdentifier") {
    return getString(identifier, "name");
  }

  if (identifier.type === "Literal")
    return String(getField(identifier, "value"));
  return undefined;
}

export function containsJsx(node: unknown): boolean {
  let found = false;
  visit(node, (child) => {
    if (child.type === "JSXElement" || child.type === "JSXFragment") {
      found = true;
    }
  });
  return found;
}

export function visit(
  node: unknown,
  callback: (node: Readonly<AstNode>) => void,
): void {
  if (Array.isArray(node)) {
    const children: unknown[] = node;
    for (const child of children) visit(child, callback);
    return;
  }

  if (!isAstNode(node)) return;
  callback(node);

  for (const [key, value] of Object.entries(node)) {
    if (key !== "parent" && key !== "loc" && key !== "range") {
      visit(value, callback);
    }
  }
}

export function isAstNode(value: unknown): value is AstNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    "start" in value &&
    typeof value.start === "number" &&
    "end" in value &&
    typeof value.end === "number" &&
    "range" in value &&
    Array.isArray(value.range)
  );
}

export function getField(node: Readonly<AstNode>, key: string): unknown {
  return node[key];
}

export function getChild(node: unknown, key: string): AstNode | undefined {
  if (!isAstNode(node)) return undefined;
  const value = getField(node, key);
  return isAstNode(value) ? value : undefined;
}

export function getChildren(
  node: unknown,
  key: string,
): ReadonlyArray<Readonly<AstNode>> {
  if (!isAstNode(node)) return [];
  const value = getField(node, key);
  return Array.isArray(value) ? value.filter((item) => isAstNode(item)) : [];
}

export function getString(
  node: Readonly<AstNode> | undefined,
  key: string,
): string | undefined {
  if (!node) return undefined;
  const value = getField(node, key);
  return typeof value === "string" ? value : undefined;
}
