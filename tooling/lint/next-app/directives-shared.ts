import type { defineRule } from "vite-plus/lint/plugins";
import { getChildren, getString } from "../naming/ast-utils.ts";

export type RuleContext = Parameters<
  NonNullable<Parameters<typeof defineRule>[0]["create"]>
>[0];

export function fileDirectives(program: unknown): string[] {
  const directives: string[] = [];
  for (const statement of getChildren(program, "body")) {
    const directive = getString(statement, "directive");
    if (statement.type !== "ExpressionStatement" || directive === undefined) {
      break;
    }
    directives.push(directive);
  }
  return directives;
}
