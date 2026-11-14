import type { OxlintOverride } from "vite-plus/lint";
import {
  applicationSourceGlobs,
  architectureDirectories,
} from "../architecture/paths.ts";

const { app, controllers, features, cron, db, ui } = architectureDirectories;

export const nextAppJsPlugins = [
  { name: "next-app", specifier: "./tooling/lint/next-app-rules.ts" },
  { name: "boundary", specifier: "./tooling/lint/boundary-rules.ts" },
] as const;

// Every rule from @next/eslint-plugin-next (eslint-config-next/core-web-vitals)
// has an oxlint port, so the Next.js checks run in `vp lint` without ESLint.
export const nextjsRules = {
  "nextjs/google-font-display": "error",
  "nextjs/google-font-preconnect": "error",
  "nextjs/inline-script-id": "error",
  "nextjs/next-script-for-ga": "error",
  "nextjs/no-assign-module-variable": "error",
  "nextjs/no-async-client-component": "error",
  "nextjs/no-before-interactive-script-outside-document": "error",
  "nextjs/no-css-tags": "error",
  "nextjs/no-document-import-in-page": "error",
  "nextjs/no-duplicate-head": "error",
  "nextjs/no-head-element": "error",
  "nextjs/no-head-import-in-document": "error",
  "nextjs/no-html-link-for-pages": "error",
  "nextjs/no-img-element": "error",
  "nextjs/no-page-custom-font": "error",
  "nextjs/no-script-component-in-head": "error",
  "nextjs/no-styled-jsx-in-document": "error",
  "nextjs/no-sync-scripts": "error",
  "nextjs/no-title-in-document-head": "error",
  "nextjs/no-typos": "error",
  "nextjs/no-unwanted-polyfillio": "error",
} satisfies NonNullable<OxlintOverride["rules"]>;

type RestrictedImport = Readonly<{
  name: string;
  message: string;
  allowTypeImports?: boolean;
}>;

type RestrictedPattern = Readonly<{
  group: string[];
  message: string;
}>;

const databaseBoundaryMessage =
  "packages/db is server-only: import it only from apps/server/src/** or apps/cron/src/**. Web pages and feature UI reach data through the server API.";

// The database layer: the workspace package and the drivers behind it.
export const databaseImports = ["@grabbin/db", "drizzle-orm", "pg"] as const;

export const restrictedImports = [
  {
    name: "lucide-react",
    message:
      "Import each icon from lucide-react/icons/<name>; the package root pulls every icon into the module graph.",
    allowTypeImports: true,
  },
  {
    name: "drizzle-orm/pg-core",
    message:
      "Define tables, enums and other pg-core objects in packages/db/src/schema/<domain>.ts.",
  },
  ...databaseImports.map((name) => ({
    name,
    message: databaseBoundaryMessage,
  })),
  {
    name: "drizzle-valibot",
    message:
      "Derive request and response schemas in apps/web/features/<name>/contracts.ts with v.pick.",
  },
] as const satisfies readonly RestrictedImport[];

const restrictedPatterns = [
  {
    group: databaseImports.flatMap((name) => [`${name}/*`, `${name}/**`]),
    message: databaseBoundaryMessage,
  },
] as const satisfies readonly RestrictedPattern[];

export function restrictedImportsRule(
  allowed: readonly string[] = [],
): ["error", { paths: RestrictedImport[]; patterns: RestrictedPattern[] }] {
  const allowsDatabase = databaseImports.every((name) =>
    allowed.includes(name),
  );
  return [
    "error",
    {
      paths: restrictedImports.filter(({ name }) => !allowed.includes(name)),
      patterns: allowsDatabase
        ? []
        : restrictedPatterns.map(({ group, message }) => ({
            group: [...group],
            message,
          })),
    },
  ];
}

export const nextAppWebPlugins = ["nextjs"] as const;

export const nextAppWebRules = {
  ...nextjsRules,
} satisfies NonNullable<OxlintOverride["rules"]>;

export const nextAppRules = {
  // `import "server-only"` marks modules that must never reach a client bundle.
  "import/no-unassigned-import": ["error", { allow: ["server-only"] }],
  "eslint/no-restricted-imports": restrictedImportsRule(),
  "eslint/no-restricted-globals": [
    "error",
    {
      name: "fetch",
      message:
        "Call Route Handlers from features/<name>/api.ts and parse the response with readJson(contract, response). Server Components read data directly instead of fetching their own Route Handlers.",
    },
  ],
  "next-app/client-directive-placement": "error",
  "next-app/server-directive-placement": "error",
  "next-app/no-inline-server-action": "error",
  "next-app/no-success-flag-effect": "error",
  "boundary/contract-from-contracts-module": "error",
  "boundary/contract-explicit-pick": "error",
} satisfies NonNullable<OxlintOverride["rules"]>;

export const nextAppOverrides = [
  {
    files: [`${app}/**`],
    rules: {
      "next-app/route-module-exports": "error",
      "next-app/static-segment-config": "error",
    },
  },
  {
    files: applicationSourceGlobs,
    rules: {
      "boundary/no-re-export": "error",
      "import/max-dependencies": [
        "error",
        { max: 10, ignoreTypeImports: true },
      ],
    },
  },
  {
    files: [
      `${app}/providers.tsx`,
      `${app}/**/error.tsx`,
      `${app}/**/global-error.tsx`,
      `${features}/*/ui/**`,
      `${ui}/**`,
    ],
    rules: { "next-app/client-directive-placement": "off" },
  },
  {
    files: [`${features}/*/actions.ts`],
    rules: {
      "next-app/server-directive-placement": "off",
      "boundary/server-action-input": "error",
    },
  },
  {
    files: [
      `${app}/**/route.ts`,
      `${controllers}/**`,
      `${features}/*/actions.ts`,
      `${features}/*/api.ts`,
      "apps/web/proxy.ts",
    ],
    rules: { "boundary/no-raw-body-read": "error" },
  },
  {
    // Client code calls Route Handlers from api.ts; Hono and cron call external
    // services directly.
    files: [
      `${features}/*/api.ts`,
      `${architectureDirectories.server}/**`,
      `${controllers}/**`,
      `${cron}/**`,
    ],
    rules: { "eslint/no-restricted-globals": "off" },
  },
  {
    // Server and cron are the only apps allowed to import data.
    files: ["apps/server/src/**", `${cron}/**`],
    rules: {
      "eslint/no-restricted-imports": restrictedImportsRule(databaseImports),
    },
  },
  {
    // packages/db itself: sources, tests and drizzle.config.ts.
    files: ["packages/db/**"],
    rules: {
      "eslint/no-restricted-imports": restrictedImportsRule(databaseImports),
    },
  },
  {
    files: [`${db}/schema/*.ts`],
    rules: {
      "eslint/no-restricted-imports": restrictedImportsRule([
        ...databaseImports,
        "drizzle-orm/pg-core",
      ]),
    },
  },
  {
    files: [`${features}/*/contracts.ts`],
    rules: {
      "eslint/no-restricted-imports": restrictedImportsRule([
        "drizzle-valibot",
      ]),
    },
  },
] satisfies OxlintOverride[];
