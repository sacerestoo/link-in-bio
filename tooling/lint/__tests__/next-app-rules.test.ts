import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, expect, it } from "vite-plus/test";
import nextAppPlugin from "../next-app-rules.ts";

RuleTester.describe = (name, callback): void => {
  void describe(name, callback);
};
RuleTester.it = (name, callback): void => {
  it(name, callback);
};

const tester = new RuleTester({
  languageOptions: { parserOptions: { lang: "tsx" } },
});
const rules = nextAppPlugin.rules;

tester.run("route-module-exports", rules["route-module-exports"], {
  valid: [
    {
      code: "export const metadata = {}; export const dynamic = 'force-dynamic'; export default function Page() { return null; }",
      filename: "app/sign-in/page.tsx",
    },
    {
      code: "export const { GET, POST } = handler; export const runtime = 'edge';",
      filename: "app/api/auth/[...all]/route.ts",
    },
    {
      code: "'use client'; export default function Error() { return null; }",
      filename: "app/error.tsx",
    },
    {
      code: "export type Props = { id: string }; export default function Layout() { return null; }",
      filename: "app/layout.tsx",
    },
    {
      code: "export function helper() {}",
      filename: "features/auth/ui/page-header.tsx",
    },
  ],
  invalid: [
    {
      code: "export function helper() {} export default function Page() { return null; }",
      filename: "app/page.tsx",
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: "export const loader = async () => ({}); export default function Page() { return null; }",
      filename: "app/dashboard/page.tsx",
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: "export const title = 'x';",
      filename: "app/page.tsx",
      errors: [{ messageId: "missingDefault" }, { messageId: "unexpected" }],
    },
    {
      code: "export default function handler() {}",
      filename: "app/api/items/route.ts",
      errors: [{ messageId: "routeDefault" }],
    },
    {
      code: "export * from './other';",
      filename: "app/api/items/route.ts",
      errors: [{ messageId: "unexpected" }],
    },
    {
      code: "export default function Error() { return null; }",
      filename: "app/error.tsx",
      errors: [{ messageId: "clientRequired" }],
    },
  ],
});

tester.run("static-segment-config", rules["static-segment-config"], {
  valid: [
    {
      code: "export const dynamic = 'force-dynamic'; export const revalidate = false; export const preferredRegion = ['iad1'];",
      filename: "app/page.tsx",
    },
    {
      code: "export const dynamic = mode;",
      filename: "features/auth/ui/form.tsx",
    },
  ],
  invalid: [
    {
      code: "export const dynamic = mode;",
      filename: "app/page.tsx",
      errors: [{ messageId: "literal" }],
    },
    {
      code: "export const revalidate = 60 * 5;",
      filename: "app/blog/layout.tsx",
      errors: [{ messageId: "literal" }],
    },
  ],
});

tester.run("client-directive-placement", rules["client-directive-placement"], {
  valid: ["export default function Page() { return null; }", "'use strict';"],
  invalid: [
    {
      code: "'use client'; export default function Page() { return null; }",
      errors: [{ messageId: "placement" }],
    },
  ],
});

tester.run("server-directive-placement", rules["server-directive-placement"], {
  valid: ["export async function save() {}"],
  invalid: [
    {
      code: "'use server'; export async function save() {}",
      errors: [{ messageId: "placement" }],
    },
  ],
});

tester.run("no-inline-server-action", rules["no-inline-server-action"], {
  valid: ["async function save() { await write(); }"],
  invalid: [
    {
      code: "export default function Page() { async function save() { 'use server'; await write(); } return save; }",
      errors: [{ messageId: "inline" }],
    },
    {
      code: "const save = async () => { 'use server'; };",
      errors: [{ messageId: "inline" }],
    },
  ],
});

tester.run("no-success-flag-effect", rules["no-success-flag-effect"], {
  valid: [
    "useEffect(() => { refresh(); }, []);",
    "if (mutation.isSuccess) refresh();",
  ],
  invalid: [
    {
      code: "useEffect(() => { if (mutation.isSuccess) router.push('/'); }, [mutation.isSuccess]);",
      errors: [{ messageId: "success" }],
    },
    {
      code: "React.useLayoutEffect(() => { if (wasSuccessful) refresh(); }, [wasSuccessful]);",
      errors: [{ messageId: "success" }],
    },
  ],
});

it("registers the Next app rules", () => {
  expect(Object.keys(rules)).toEqual([
    "route-module-exports",
    "static-segment-config",
    "client-directive-placement",
    "server-directive-placement",
    "no-inline-server-action",
    "no-success-flag-effect",
  ]);
});
