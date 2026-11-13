import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import boundaryPlugin from "../boundary-rules.ts";

RuleTester.describe = (name, callback): void => {
  void describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});
const rules = boundaryPlugin.rules;
const helpers =
  "import { jsonResponse, parseInput, readJson } from '@/shared/lib/contract';";
const contracts =
  "import { createItemInput, itemOutput } from '@/features/items/contracts';";

tester.run("no-raw-body-read", rules["no-raw-body-read"], {
  valid: [
    `${helpers}${contracts} export async function POST(request) { const input = await readJson(createItemInput, request); return jsonResponse(itemOutput, input); }`,
    "const value = JSON.stringify(data);",
  ],
  invalid: [
    {
      code: "export async function POST(request) { const body = await request.json(); return body; }",
      errors: [{ messageId: "read" }],
    },
    {
      code: "export async function POST(request) { return await request.formData(); }",
      errors: [{ messageId: "read" }],
    },
    {
      code: "export function GET() { return Response.json({ ok: true }); }",
      errors: [{ messageId: "respond" }],
    },
    {
      code: "export function GET() { return NextResponse.json(rows); }",
      errors: [{ messageId: "respond" }],
    },
  ],
});

tester.run(
  "contract-from-contracts-module",
  rules["contract-from-contracts-module"],
  {
    valid: [
      `${helpers}${contracts} const input = await readJson(createItemInput, request);`,
      `${helpers} import * as items from '@/features/items/contracts'; jsonResponse(items.itemOutput, row);`,
      "import { readJson } from './local'; readJson(schema, request);",
      {
        code: `${helpers} import { createItemInput } from './contracts'; parseInput(createItemInput, raw);`,
        filename: "/repo/features/items/actions.ts",
      },
      {
        code: `${helpers} import { createItemInput } from '../contracts'; parseInput(createItemInput, raw);`,
        filename: "/repo/features/items/ui/form.tsx",
      },
      {
        code: `${helpers} import { createItemInput } from '../../features/items/contracts'; readJson(createItemInput, request);`,
        filename: "/repo/app/api/route.ts",
      },
    ],
    invalid: [
      {
        code: `${helpers} import { createItemInput } from './contracts'; parseInput(createItemInput, raw);`,
        filename: "/repo/features/items/ui/form.tsx",
        errors: [{ messageId: "source" }],
      },
      {
        code: `${helpers} import { createItemInput } from '@/shared/contracts'; parseInput(createItemInput, raw);`,
        errors: [{ messageId: "source" }],
      },
      {
        code: `${helpers} import { createItemInput } from '@/features/items/forms/contracts'; parseInput(createItemInput, raw);`,
        errors: [{ messageId: "source" }],
      },
      {
        code: `${helpers} import * as v from 'valibot'; const input = await readJson(v.object({}), request);`,
        errors: [{ messageId: "source" }],
      },
      {
        code: `${helpers} const schema = makeSchema(); parseInput(schema, value);`,
        errors: [{ messageId: "source" }],
      },
      {
        code: `${helpers} import { user } from '@/db/schema/auth'; jsonResponse(user, row);`,
        errors: [{ messageId: "source" }],
      },
    ],
  },
);

tester.run("server-action-input", rules["server-action-input"], {
  valid: [
    `'use server'; ${helpers}${contracts} export async function createItem(raw) { const input = parseInput(createItemInput, raw); return input.name; }`,
    `'use server'; ${helpers}${contracts} export const renameItem = async (raw) => { const input = parseInput(createItemInput, raw); return input; };`,
    "'use server'; export async function signOut() { await clear(); }",
  ],
  invalid: [
    {
      code: "export async function save() {}",
      errors: [{ messageId: "directive" }],
    },
    {
      code: "'use server'; export async function save(input) { await db.insert(items).values(input); }",
      errors: [{ messageId: "unvalidated" }],
    },
    {
      code: `'use server'; ${helpers}${contracts} export async function save(raw) { parseInput(createItemInput, raw); return raw.name; }`,
      errors: [{ messageId: "unvalidated" }],
    },
    {
      code: "'use server'; export async function save({ name }) { return name; }",
      errors: [{ messageId: "pattern" }],
    },
    {
      code: "'use server'; export function save() {}",
      errors: [{ messageId: "notAsync" }],
    },
    {
      code: "'use server'; export const limit = 10;",
      errors: [{ messageId: "export" }],
    },
  ],
});

tester.run("contract-explicit-pick", rules["contract-explicit-pick"], {
  valid: [
    "import * as v from 'valibot'; export const itemOutput = v.pick(createSelectSchema(item), ['id', 'name']);",
    "import { pick } from 'valibot'; export const input = pick(createInsertSchema(item), ['name']);",
  ],
  invalid: [
    {
      code: "export const itemOutput = createSelectSchema(item);",
      errors: [{ messageId: "pick" }],
    },
    {
      code: "const base = createInsertSchema(item); export const input = v.pick(base, ['name']);",
      errors: [{ messageId: "pick" }],
    },
    {
      code: "import * as v from 'valibot'; export const itemOutput = v.omit(v.pick(createSelectSchema(item), ['id', 'secret']), ['secret']);",
      errors: [{ messageId: "omit" }],
    },
  ],
});

tester.run("no-re-export", rules["no-re-export"], {
  valid: [
    "import { user } from '@/db/schema/auth'; export const users = [user];",
    "export function helper() {}",
  ],
  invalid: [
    {
      code: "export * from './schema/auth';",
      errors: [{ messageId: "reExport" }],
    },
    {
      code: "export { Button } from './button';",
      errors: [{ messageId: "reExport" }],
    },
    {
      code: "export { default } from '@/features/auth/ui/auth-form';",
      errors: [{ messageId: "reExport" }],
    },
  ],
});

it("registers the boundary rules", () => {
  expect(Object.keys(rules)).toEqual([
    "no-raw-body-read",
    "contract-from-contracts-module",
    "server-action-input",
    "contract-explicit-pick",
    "no-re-export",
  ]);
});
