import { afterEach, describe, expect, it } from "vite-plus/test";
import { createFixture, removeFixtures } from "../../architecture/fixture.ts";
import {
  checkNextAppShape,
  checkServerOnlyMarkers,
  type NextAppConfig,
} from "../route-files.ts";

const config: NextAppConfig = {
  appDirectory: "app",
  appRootFiles: ["providers.tsx", "globals.css"],
  proxyFile: "proxy.ts",
  apiDirectory: "app/api",
  generatedDirectories: ["node_modules"],
};

const validAppFiles = [
  "app/layout.tsx",
  "app/providers.tsx",
  "app/globals.css",
  "app/global-error.tsx",
  "app/favicon.ico",
  "app/(marketing)/page.tsx",
  "app/items/[itemId]/page.tsx",
  "app/[orgSlug]/feedback/[feedbackId]/page.tsx",
  "app/[orgSlug]/dashboard/changelog/[changelogId]/page.tsx",
  "app/items/[itemId]/opengraph-image.tsx",
  "app/docs/[[...slug]]/page.tsx",
  "app/@modal/default.tsx",
  "app/sitemap.ts",
  "proxy.ts",
] as const;

afterEach(removeFixtures);

describe("checkNextAppShape app/api", (): void => {
  it("rejects route handlers after API extraction", (): void => {
    const { root, write } = createFixture("next-app-");
    write("app/api/[[...route]]/route.ts");
    write("app/api/auth/[...all]/route.ts");
    write("app/api/health/route.ts");
    write("app/api/page.tsx");

    const removed = checkNextAppShape(root, config).map(
      (error) => /^Remove (\S+):/u.exec(error)?.[1],
    );
    expect(new Set(removed)).toEqual(
      new Set([
        "app/api/[[...route]]/route.ts",
        "app/api/auth/[...all]/route.ts",
        "app/api/health/route.ts",
        "app/api/page.tsx",
      ]),
    );
    expect(removed).toHaveLength(4);
  });
});

describe("checkNextAppShape", (): void => {
  it("accepts App Router route, metadata, and root files", (): void => {
    const { root, write } = createFixture("next-app-");
    for (const path of validAppFiles) {
      write(path);
    }

    expect(checkNextAppShape(root, config)).toEqual([]);
  });

  it("rejects non-route files, private folders, and bad segment names", (): void => {
    const { root, write } = createFixture("next-app-");
    write("app/items/item-card.tsx");
    write("app/_components/button.tsx");
    write("app/BadItems/page.tsx");
    write("app/items/providers.tsx");

    const errors = checkNextAppShape(root, config);
    expect(errors).toHaveLength(4);
    expect(errors.join("\n")).toMatch(/Rename route segment app\/BadItems/u);
    expect(errors.join("\n")).toMatch(/Move app\/_components out of app\//u);
    expect(errors.filter((error) => error.includes("app/items/"))).toHaveLength(
      2,
    );
  });

  it("rejects a page and route handler in one segment", (): void => {
    const { root, write } = createFixture("next-app-");
    write("app/items/page.tsx");
    write("app/items/route.ts");

    expect(checkNextAppShape(root, config)).toEqual([
      "Split app/items: page.tsx and route.ts cannot share a route segment.",
    ]);
  });

  it("rejects middleware and nested proxy files", (): void => {
    const { root, write } = createFixture("next-app-");
    write("middleware.ts");
    write("features/auth/proxy.ts");

    expect(checkNextAppShape(root, config)).toEqual([
      expect.stringMatching(/^Rename middleware\.ts to proxy\.ts/u),
      "Keep one proxy.ts at the repository root.",
    ]);
  });
});

describe("compound route param names", (): void => {
  it("requires canonical camelCase names", (): void => {
    const { root, write } = createFixture("next-app-");
    write("app/[orgslug]/page.tsx");
    write("app/feedback/[feedbackid]/page.tsx");
    write("app/changelog/[changelogid]/page.tsx");

    expect(checkNextAppShape(root, config)).toEqual([
      "Rename route parameter app/[orgslug] to [orgSlug] to preserve camelCase.",
      "Rename route parameter app/changelog/[changelogid] to [changelogId] to preserve camelCase.",
      "Rename route parameter app/feedback/[feedbackid] to [feedbackId] to preserve camelCase.",
    ]);
  });
});

describe("checkServerOnlyMarkers", (): void => {
  it("requires the server-only import in configured modules", (): void => {
    const { root, write } = createFixture("server-only-");
    write("env.ts", 'import "server-only";\nexport const env = {};\n');
    write("auth.ts", "export const auth = {};\n");

    expect(checkServerOnlyMarkers(root, ["env.ts", "auth.ts"])).toEqual([
      'Add import "server-only" to auth.ts so client bundles fail to import it.',
    ]);
  });
});
