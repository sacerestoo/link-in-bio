import { describe, expect, it } from "vite-plus/test";
import {
  findClientServerOnlyPaths,
  type CruiseModule,
  type ModuleKind,
} from "../client-boundary.ts";

const runtime = (resolved: string): CruiseModule["dependencies"][number] => ({
  resolved,
  dependencyTypes: ["local", "aliased-tsconfig"],
});

const graph: readonly CruiseModule[] = [
  {
    source: "features/auth/ui/form.tsx",
    dependencies: [runtime("features/auth/session.ts")],
  },
  { source: "features/auth/session.ts", dependencies: [runtime("auth.ts")] },
  {
    source: "auth.ts",
    dependencies: [runtime("node_modules/server-only/index.js")],
  },
  {
    source: "features/auth/ui/button.tsx",
    dependencies: [runtime("features/auth/actions.ts")],
  },
  { source: "features/auth/actions.ts", dependencies: [runtime("auth.ts")] },
  {
    source: "features/auth/ui/typed.tsx",
    dependencies: [
      { resolved: "auth.ts", dependencyTypes: ["local", "type-only"] },
    ],
  },
];

const kinds: Readonly<Record<string, ModuleKind>> = {
  "features/auth/ui/form.tsx": "client",
  "features/auth/ui/button.tsx": "client",
  "features/auth/ui/typed.tsx": "client",
  "features/auth/actions.ts": "server-functions",
};

describe("findClientServerOnlyPaths", (): void => {
  it("reports client modules that reach server-only through runtime imports", (): void => {
    expect(
      findClientServerOnlyPaths(
        graph,
        (source): ModuleKind => kinds[source] ?? "plain",
      ),
    ).toEqual([
      "Client module features/auth/ui/form.tsx reaches server-only code: features/auth/ui/form.tsx -> features/auth/session.ts -> auth.ts.",
    ]);
  });

  it("skips unresolved imports instead of reading files that do not exist", (): void => {
    const unresolved: readonly CruiseModule[] = [
      {
        source: "features/auth/ui/form.tsx",
        dependencies: [
          {
            resolved: "./core/exec.ts",
            dependencyTypes: ["unknown"],
            couldNotResolve: true,
          },
        ],
      },
      { source: "./core/exec.ts", dependencies: [], couldNotResolve: true },
    ];
    expect(
      findClientServerOnlyPaths(unresolved, (source): ModuleKind => {
        if (source === "./core/exec.ts") throw new Error("read " + source);
        return source === "features/auth/ui/form.tsx" ? "client" : "plain";
      }),
    ).toEqual([]);
  });
});

describe("client and server type paths", (): void => {
  it("allows a type-only path from client code to a server module", (): void => {
    expect(
      findClientServerOnlyPaths(
        [
          {
            source: "features/auth/ui/typed.tsx",
            dependencies: [
              { resolved: "auth.ts", dependencyTypes: ["local", "type-only"] },
            ],
          },
          {
            source: "auth.ts",
            dependencies: [runtime("node_modules/server-only/index.js")],
          },
        ],
        (source): ModuleKind =>
          source === "features/auth/ui/typed.tsx" ? "client" : "plain",
      ),
    ).toEqual([]);
  });
});
