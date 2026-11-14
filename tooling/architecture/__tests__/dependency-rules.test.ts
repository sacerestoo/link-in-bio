import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vite-plus/test";
import { linkDependencyCruiserTypeScript } from "../dependency-cruiser.ts";
import { createFixture, removeFixtures, type Fixture } from "../fixture.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

const sourceRoots = [
  "apps/web/app",
  "apps/server/src",
  "apps/web/features",
  "apps/web/lib",
  "apps/server/src/services",
  "apps/cron/src",
  "packages/db/src",
  "packages/auth/src",
  "packages/ui/src",
  "packages/shared/src",
];

// Workspace imports resolve through tsconfig paths here; in the repository
// they resolve through Bun's node_modules links to the same real paths.
const tsconfig = JSON.stringify({
  compilerOptions: {
    baseUrl: ".",
    paths: {
      "@/*": ["./apps/web/*"],
      "@grabbin/db": ["./packages/db/src/client.ts"],
      "@grabbin/auth": ["./packages/auth/src/index.ts"],
      "@grabbin/server": ["./apps/server/src/app.ts"],
      "@grabbin/ui/*": ["./packages/ui/src/*"],
      "@grabbin/shared/*": ["./packages/shared/src/*"],
    },
  },
});

const cruiseViolations = ({ root }: Fixture): Set<string> => {
  const result = spawnSync(
    join(repositoryRoot, "node_modules/.bin/depcruise"),
    [
      "--config",
      join(repositoryRoot, ".dependency-cruiser.ts"),
      "--ts-config",
      join(root, "tsconfig.json"),
      "--output-type",
      "err",
      ...sourceRoots.filter((path) => existsSync(join(root, path))),
    ],
    { cwd: root, encoding: "utf8" },
  );
  const output = `${result.stdout}${result.stderr}`;
  if (output.includes("missing-tsc-transpiler")) {
    throw new Error(`dependency-cruiser could not load TypeScript:\n${output}`);
  }
  return new Set(
    [...output.matchAll(/error ([a-z-]+):/gu)].map(
      (match): string => match[1] ?? "",
    ),
  );
};

const writeAll = (
  fixture: Fixture,
  files: Readonly<Record<string, string>>,
): void => {
  fixture.write("tsconfig.json", tsconfig);
  for (const [path, contents] of Object.entries(files)) {
    fixture.write(path, contents);
  }
};

beforeAll((): void => {
  linkDependencyCruiserTypeScript(repositoryRoot);
});
afterEach(removeFixtures);

describe("dependency-cruiser database boundary", (): void => {
  it("allows packages/db only from server and apps/cron", (): void => {
    const fixture = createFixture("depcruise-db-allowed-");
    writeAll(fixture, {
      "packages/db/src/client.ts": "export const schema = {};\n",
      "apps/server/src/lib/auth.ts":
        'import { schema } from "@grabbin/db";\nexport const service = schema;\n',
      "apps/cron/src/index.ts":
        'import { schema } from "@grabbin/db";\nexport const job = schema;\n',
    });

    expect(cruiseViolations(fixture)).toEqual(new Set());
  });

  it("rejects packages/db outside server, cron, and packages/db", (): void => {
    const fixture = createFixture("depcruise-db-");
    writeAll(fixture, {
      "packages/db/src/client.ts": "export const schema = {};\n",
      "apps/web/app/page.tsx":
        'import { schema } from "@grabbin/db";\nexport const page = schema;\n',
      "apps/web/lib/api-client.ts":
        'import type { AppType } from "@grabbin/server";\nexport type Client = AppType;\n',
      "apps/server/src/app.ts": "export type AppType = unknown;\n",
      "apps/server/src/controllers/auth.controller.ts":
        'import { schema } from "@grabbin/db";\nexport const authController = schema;\n',
      "packages/ui/src/components/leak.tsx":
        'import { schema } from "@grabbin/db";\nexport const leak = schema;\n',
      "packages/auth/src/index.ts":
        'import { schema } from "@grabbin/db";\nexport const auth = schema;\n',
    });

    expect(cruiseViolations(fixture)).toEqual(
      new Set([
        "database-modules-only-from-configured-boundary",
        "ui-not-to-database",
        "ui-only-to-shared",
        "auth-not-to-web-code",
      ]),
    );
  });
});

describe("dependency-cruiser workspace resolution", (): void => {
  it("rejects a @grabbin/* import that does not resolve", (): void => {
    const fixture = createFixture("depcruise-unresolved-");
    writeAll(fixture, {
      "packages/ui/src/lib/leak.ts":
        'import { schema } from "@grabbin/undeclared";\nexport const leak = schema;\n',
    });

    expect(cruiseViolations(fixture)).toEqual(
      new Set(["workspace-imports-must-resolve"]),
    );
  });
});

describe("dependency-cruiser layering", (): void => {
  it("rejects imports that cross package and app layers", (): void => {
    const fixture = createFixture("depcruise-layers-");
    writeAll(fixture, {
      "apps/web/app/layout.tsx": "export const layout = true;\n",
      "apps/web/lib/env.ts": "export const env = true;\n",
      "packages/shared/src/types/leak.ts":
        'import { cn } from "@grabbin/ui/lib/utils";\nexport const leak = cn;\n',
      "packages/ui/src/lib/utils.ts":
        'import { layout } from "@/app/layout";\nexport const cn = layout;\n',
      "packages/db/src/client.ts":
        'import { cn } from "@grabbin/ui/lib/utils";\nexport const schema = cn;\n',
      "apps/cron/src/index.ts":
        'import { env } from "../../web/lib/env";\nexport const job = env;\n',
      "apps/web/features/auth/ui/form.tsx":
        'import { schema } from "@grabbin/db";\nexport const form = schema;\n',
    });

    expect(cruiseViolations(fixture)).toEqual(
      new Set([
        "packages-not-to-apps",
        "apps-not-to-other-apps",
        "shared-not-to-app-code",
        "database-not-to-web-code",
        "database-modules-only-from-configured-boundary",
        "app-only-from-app",
        "feature-ui-not-to-data-modules",
      ]),
    );
  });
});

describe("dependency-cruiser feature rules", (): void => {
  it("rejects dependencies between feature domains", (): void => {
    const fixture = createFixture("depcruise-features-");
    writeAll(fixture, {
      "apps/web/app/layout.tsx":
        'import { auth } from "@/features/auth/root";\nexport const layout = auth;\n',
      "apps/web/features/auth/root.ts":
        'import { request } from "@/features/requests/root";\nexport const auth = request;\n',
      "apps/web/features/requests/root.ts": "export const request = true;\n",
    });

    expect(cruiseViolations(fixture)).toContain("features-not-to-features");
  });
});

describe("dependency-cruiser orphan rule", (): void => {
  it("rejects feature modules that no app module imports", (): void => {
    const fixture = createFixture("depcruise-orphans-");
    writeAll(fixture, {
      "apps/web/app/layout.tsx": "export const layout = true;\n",
      "apps/web/features/feedback/ui/orphan.tsx": "export {};\n",
    });

    expect(cruiseViolations(fixture)).toContain("no-orphans-in-web-code");
  });
});
