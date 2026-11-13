import { describe, expect, it } from "vite-plus/test";
import { lintFixture } from "../lint-fixture.ts";

const profiles = {
  react: true,
  vitePlus: true,
  tanstackQuery: true,
  nextApp: true,
} as const;

const contract = `import { pick } from "valibot";
import { createInsertSchema } from "drizzle-valibot";
import { items } from "@/db/schema/items";

export const createItemInput = pick(createInsertSchema(items), ["name"]);
`;

const files = {
  "packages/db/src/schema/items.ts":
    'import { pgTable, text } from "drizzle-orm/pg-core";\n\nexport const items = pgTable("items", { name: text("name") });\n',
  "apps/web/features/items/contracts.ts": contract,
  "apps/web/features/items/model.ts":
    'import { pgTable } from "drizzle-orm/pg-core";\nimport { createSelectSchema } from "drizzle-valibot";\n\nexport const model = [pgTable, createSelectSchema];\n',
  "apps/web/lib/env.ts": "export const mode = process.env.NODE_ENV;\n",
  "packages/ui/src/lib/mode.ts": "export const mode = process.env.NODE_ENV;\n",
  "packages/db/drizzle.config.ts":
    "export const url = process.env.DATABASE_URL;\n",
  "apps/web/features/items/ui/region.tsx":
    'import { env } from "cloudflare:workers";\n\nexport const region = env;\n',
  "apps/web/features/items/api.ts":
    'export const loadItems = async (): Promise<Response> => fetch("/api/items");\n',
  "apps/web/features/items/hooks.ts":
    'export const loadItems = async (): Promise<Response> => fetch("/api/items");\n',
  "apps/web/features/items/ui/item-photo.tsx":
    'export default function ItemPhoto() {\n  return <img src="/item.png" alt="Item" />;\n}\n',
  "apps/web/app/api/items/route.ts":
    "export async function POST(request: Request): Promise<Response> {\n  return Response.json(await request.json());\n}\n",
  "packages/ui/src/lib/polyfill.ts":
    'import "valibot";\n\nexport const ready = true;\n',
  "apps/web/features/items/actions.ts":
    '"use server";\n\nimport { parseInput } from "@/shared/lib/contract";\nimport { createItemInput } from "./contracts";\n\nexport const createItem = async (raw: unknown): Promise<string> => {\n  const input = parseInput(createItemInput, raw);\n  return input.name;\n};\n',
  "packages/db/src/client.ts":
    'import "server-only";\n\nexport const client = {};\n',
  "apps/web/app/api/[[...route]]/route.ts":
    'import { Hono } from "hono";\nimport { env } from "cloudflare:workers";\nconst app = new Hono();\nexport const GET = (request: Request) => app.fetch(request, env);\n',
  "apps/web/controllers/auth.controller.ts":
    'import { createDatabase } from "@grabbin/db";\nexport const authController = createDatabase;\n',
  "apps/web/lib/auth.ts":
    'import { createDatabase } from "@grabbin/db";\nexport const service = createDatabase;\n',
  "apps/cron/src/jobs.ts":
    'import { createDatabase } from "@grabbin/db";\n\nexport const database = createDatabase;\n',
  "apps/web/app/page.tsx":
    'import { createDatabase } from "@grabbin/db";\n\nexport const database = createDatabase;\n',
  "packages/ui/src/components/leak.tsx":
    'import { schema } from "@grabbin/db";\n\nexport const leak = schema;\n',
  "packages/auth/src/leak.ts":
    'import { profile } from "@grabbin/db/schema/profile";\n\nexport const leak = profile;\n',
  "packages/shared/src/leak.ts":
    'import { eq } from "drizzle-orm";\n\nexport const leak = eq;\n',
} as const satisfies Record<string, string>;

const codes = lintFixture(files, profiles);
const codesFor = (path: keyof typeof files): ReadonlySet<string> =>
  codes.get(path) ?? new Set();

describe("env access wiring", (): void => {
  it("limits direct env reads to env.ts and config files", (): void => {
    expect(codesFor("packages/ui/src/lib/mode.ts")).toContain(
      "env-access(no-direct-env)",
    );
    expect(codesFor("apps/web/features/items/ui/region.tsx")).toContain(
      "env-access(no-direct-env)",
    );
    expect(codesFor("apps/web/lib/env.ts")).not.toContain(
      "env-access(no-direct-env)",
    );
    expect(codesFor("apps/web/app/api/[[...route]]/route.ts")).not.toContain(
      "env-access(no-direct-env)",
    );
    expect(codesFor("packages/db/drizzle.config.ts")).not.toContain(
      "env-access(no-direct-env)",
    );
  });
});

describe("lint config wiring", (): void => {
  it("accepts a feature contract imported by relative path", (): void => {
    expect(codesFor("apps/web/features/items/actions.ts")).not.toContain(
      "boundary(contract-from-contracts-module)",
    );
  });

  it("keeps pgTable in db/schema and drizzle-valibot in contracts", (): void => {
    expect(codesFor("apps/web/features/items/model.ts")).toContain(
      "eslint(no-restricted-imports)",
    );
    expect(codesFor("packages/db/src/schema/items.ts")).not.toContain(
      "eslint(no-restricted-imports)",
    );
    expect(codesFor("apps/web/features/items/contracts.ts")).not.toContain(
      "eslint(no-restricted-imports)",
    );
  });

  it("limits fetch to feature api modules", (): void => {
    expect(codesFor("apps/web/features/items/hooks.ts")).toContain(
      "eslint(no-restricted-globals)",
    );
    expect(codesFor("apps/web/features/items/api.ts")).not.toContain(
      "eslint(no-restricted-globals)",
    );
  });

  it("runs Next.js and boundary rules on web code", (): void => {
    expect(codesFor("apps/web/features/items/ui/item-photo.tsx")).toContain(
      "next(no-img-element)",
    );
    expect(codesFor("apps/web/app/api/items/route.ts")).toContain(
      "boundary(no-raw-body-read)",
    );
  });

  it("allows only the server-only side-effect import", (): void => {
    expect(codesFor("packages/ui/src/lib/polyfill.ts")).toContain(
      "import(no-unassigned-import)",
    );
    expect(codesFor("packages/db/src/client.ts")).not.toContain(
      "import(no-unassigned-import)",
    );
  });
});

describe("database boundary wiring", (): void => {
  it("allows packages/db only in web auth setup and apps/cron", (): void => {
    expect(codesFor("apps/web/lib/auth.ts")).not.toContain(
      "eslint(no-restricted-imports)",
    );
    expect(codesFor("apps/cron/src/jobs.ts")).not.toContain(
      "eslint(no-restricted-imports)",
    );
    expect(codesFor("apps/web/controllers/auth.controller.ts")).toContain(
      "eslint(no-restricted-imports)",
    );
  });

  it("rejects packages/db, its subpaths, and drivers everywhere else", (): void => {
    for (const path of [
      "apps/web/app/page.tsx",
      "packages/ui/src/components/leak.tsx",
      "packages/auth/src/leak.ts",
      "packages/shared/src/leak.ts",
    ] as const) {
      expect(codesFor(path)).toContain("eslint(no-restricted-imports)");
    }
  });
});
