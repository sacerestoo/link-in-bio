import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type Fixture = Readonly<{
  root: string;
  write: (path: string, contents?: string) => void;
}>;

const roots: string[] = [];

export const createFixture = (prefix: string): Fixture => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return {
    root,
    write: (path, contents = "export {};\n"): void => {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), contents);
    },
  };
};

export const removeFixtures = (): void => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
};
