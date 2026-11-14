# grabbin

Codex reads this file and the nested `AGENTS.md` files in `apps/*` and
`packages/*`. Follow the nearest one as well as this one.

## The v1 branch

- `v1` on origin is the previous grabbin (link-in-bio) implementation, frozen at
  the commit `main` pointed to before this rebuild. It is read-only reference:
  do not merge, rebase onto, or cherry-pick from it, and never push to it.
- From `v1`, copy only three things:
  - UI copy and text (labels, headings, messages, placeholders);
  - layout and element placement;
  - visual design (colors, spacing, typography, sizes, states).
- Everything else is designed again from scratch in this repository: features,
  responsibilities, module boundaries, data flow and architecture. Do not port
  v1's code structure, APIs, state handling or data model, even when v1 has
  working code for it. There is no data migration from v1.
- Read v1 without checking it out:
  - `git fetch origin v1` to update the reference;
  - `git ls-tree -r --name-only origin/v1 -- <dir>` to find files;
  - `git show origin/v1:<path>` to read one file;
  - `git grep <pattern> origin/v1 -- <dir>` to search.

## Workspace layout

Vite+ (`vp`) monorepo on Bun workspaces (isolated linker), Node `>=22.18`.

| Path              | Role                                                                  |
| ----------------- | --------------------------------------------------------------------- |
| `apps/web`        | vinext (Next.js App Router on Vite) + Hono under `/api/*`, one Worker |
| `apps/cron`       | Cloudflare Worker, `scheduled` daily at 06:00 UTC (15:00 KST)         |
| `packages/db`     | Drizzle schema, client and queries. Server-only                       |
| `packages/auth`   | Better Auth + Creem factory. Takes its database adapter from callers  |
| `packages/ui`     | shadcn components, `cn`, hooks and the Tailwind stylesheet            |
| `packages/shared` | Types and valibot schemas shared by apps and packages                 |
| `tooling/`        | Lint plugins, architecture checks and their tests                     |

- Add a workspace package only by also adding it to
  `tooling/architecture/project.ts`; `bun run check:architecture` rejects
  unapproved packages, stray `package.json` files and extra config files.
- Each workspace package defines its own `lint`, `test` and `typecheck` scripts
  (and `build`, `dev`, `typegen` for apps), so `vp run -r <task>` reaches all of
  them. Shared lint and format settings live only in the root `vite.config.ts`;
  never add a `lint` or `fmt` block to a package config.
- Declare every workspace import in that package's `package.json`
  (`"@grabbin/x": "workspace:*"`). Bun's isolated linker leaves undeclared
  imports unresolved, and dependency-cruiser fails on an unresolved `@grabbin/*`
  import.

## Import boundaries

- `packages/db` (and `drizzle-orm`, `pg`) may be imported only from
  `apps/web/lib/auth.ts` and `apps/cron/src/**`. Pages, feature UI,
  `packages/ui`, `packages/auth` and `packages/shared` reach data through the
  web API.
- `packages/ui` must never import `packages/db`, `packages/auth`, or app code.
- `packages/auth` builds Better Auth from settings and a database adapter that
  `apps/web/lib/auth.ts` creates; it never imports `packages/db`.
- `packages/shared` imports no other workspace code. Packages never import
  `apps/*`; `apps/web` and `apps/cron` never import each other.
- Inside `apps/web`: `app/` holds only Next.js route and metadata files; only
  `app/` imports `app/`; features do not import other features; feature UI never
  imports `packages/db` or `packages/auth`.

## vinext and Workers

- Write standard Next.js App Router code under `apps/web/app/`. Check vinext's
  docs before relying on a Next.js feature it may not support yet.
- `apps/web/wrangler.jsonc` `main` points at `vinext/server/fetch-handler`,
  vinext's Worker entry (it resolves to the App Router handler). `/api/*`
  reaches the Hono app created in `apps/web/app/api/[[...route]]/route.ts`,
  which exports GET/POST/PUT/PATCH/DELETE/OPTIONS as `handleApiRequest`.
- Put domain Hono routers in `apps/web/controllers/<domain>.controller.ts` and
  domain services in `apps/web/services/`. The catch-all `route.ts` creates the
  root Hono app and registers controllers with `.route()`.
  `bun run check:architecture` rejects any other file under `apps/web/app/api/`,
  so feature route handlers are not allowed.
- The catch-all route reads Worker bindings from `cloudflare:workers` because it
  creates the root Hono app outside a Hono context; controllers use `c.env`.
- Bindings and plain vars live in each app's `wrangler.jsonc`.
  `vp run -r typegen` writes `worker-configuration.d.ts` (gitignored) from it.
- Read settings only through `readWebEnv()` (`apps/web/lib/env.ts`) or
  `readCronEnv()` (`apps/cron/src/env.ts`). The `env-access/no-direct-env` rule
  rejects `process.env`, `import.meta.env` and `cloudflare:workers` `env`
  elsewhere, except `apps/web/app/api/[[...route]]/route.ts`, `*.config.ts` and
  `tooling/`.
- Keep fake examples next to their use: Neon Local and Drizzle Kit settings in
  the root `.env.example`, web settings in `apps/web/.env.example`, and cron
  settings in `apps/cron/.env.example`. Put real local values in the matching
  `.env.local` file. Never copy `NEON_API_KEY` into an app env file.
- To add an app setting, update its env schema and matching `.env.example`; for
  a plain Worker value, also update `wrangler.jsonc` vars. Local settings go in
  matching `.env.local` files. Production values belong in the GitHub
  `production` environment as `WEB_ENV_JSON` and `CRON_ENV_JSON`. The Deploy job
  checks them against every key in each Worker `.env.example` and its schema,
  then loads secrets with `wrangler secret bulk`. `bun run check:env` fails when
  schemas and examples drift. Never commit a real secret.

## Code conventions

- Type aliases, interfaces, and generic type parameters must use PascalCase.
- Before declaring a type, look for an existing type and reuse or compose it.
  For an external API without a suitable exported type, infer it from the API,
  such as `ReturnType<typeof createAuth>`.
- Keep trivial one-use wrappers inline. Extract a function when it is shared,
  names a meaningful operation, or owns non-trivial behavior.
- Preserve the route and state owner the request names. Before adding a route,
  query parameter, prop, helper, or second lookup, confirm the flow needs it.
- No re-export barrels in app code; packages expose modules through their
  `package.json` `exports` map instead of `index.ts` barrels.

## Static enforcement

Every rule below fails `bun run check` (pre-commit, pre-push and CI). Add a rule
here only with its enforcer and a test that proves it catches a violation.

| Rule                                                                                             | Enforcer                                                                                                 | Test                                              |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/db`, `drizzle-orm`, `pg` only from web auth setup and cron                             | oxlint `no-restricted-imports` (`tooling/lint/next-app.ts`) and dependency-cruiser                       | `lint-config.test.ts`, `dependency-rules.test.ts` |
| `packages/ui` never imports `packages/db`, `packages/auth`, or app code                          | dependency-cruiser `ui-not-to-database`, `ui-only-to-shared` + oxlint                                    | `dependency-rules.test.ts`                        |
| Packages never import apps; apps never import each other; `shared` imports no workspace code     | dependency-cruiser                                                                                       | `dependency-rules.test.ts`                        |
| Every `@grabbin/*` import resolves (declared dependency)                                         | dependency-cruiser `workspace-imports-must-resolve`                                                      | `dependency-rules.test.ts`                        |
| Approved workspace packages, root folders, one config file per expected path                     | `tooling/architecture/check.ts`                                                                          | `check.test.ts`                                   |
| `pgTable`/`pgEnum` only in `packages/db/src/schema/<domain>.ts`; each registered in `client.ts`  | oxlint (`drizzle-orm/pg-core`) and `tooling/next-app/db-schema.ts`                                       | `lint-config.test.ts`, `db-schema.test.ts`        |
| Contracts derive from tables only in `features/<domain>/contracts.ts`, with `pick`               | oxlint (`drizzle-valibot`), `boundary/contract-explicit-pick`, `boundary/contract-from-contracts-module` | `boundary-rules.test.ts`                          |
| No raw body reads in routes, Hono routes, actions, `api.ts`, `proxy.ts`                          | `boundary/no-raw-body-read`                                                                              | `boundary-rules.test.ts`, `lint-config.test.ts`   |
| Server action args pass through `parseInput(contract, arg)`                                      | `boundary/server-action-input`                                                                           | `boundary-rules.test.ts`                          |
| No re-export barrels                                                                             | `boundary/no-re-export`                                                                                  | `boundary-rules.test.ts`                          |
| Route modules export only Next.js names, with literal segment config                             | `next-app/route-module-exports`, `next-app/static-segment-config`                                        | `next-app-rules.test.ts`                          |
| `app/` holds only route and metadata files; kebab segments; no `_private`; one `proxy.ts`        | `tooling/next-app/route-files.ts`                                                                        | `route-files.test.ts`                             |
| `app/api/` holds only `[[...route]]/route.ts` (the Hono handler); no other API route handlers    | `tooling/next-app/route-files.ts`                                                                        | `route-files.test.ts`                             |
| `"use client"`/`"use server"` only at the top; no inline server actions; no success-flag effects | `next-app/*` rules                                                                                       | `next-app-rules.test.ts`                          |
| Server-only modules import `server-only`; no `"use client"` module reaches them                  | `checkServerOnlyMarkers`, `tooling/next-app/client-boundary.ts`                                          | `client-boundary.test.ts`                         |
| Env reads only in app `env.ts`, the API route, `*.config.ts` and `tooling/`                      | `env-access/no-direct-env`                                                                               | `env-access.test.ts`, `lint-config.test.ts`       |
| `fetch` only in `features/<domain>/api.ts`, the web API route, `apps/cron/src/**`                | oxlint `no-restricted-globals`                                                                           | `lint-config.test.ts`                             |
| Naming (PascalCase types, hook names, kebab files), no `.js` sources, test file names            | `codebase/*`, `react-codebase/*`, `testing/*`, `unicorn/filename-case`                                   | `naming/__tests__`, `testing.test.ts`             |
| Next.js core-web-vitals, React Compiler and TanStack Query rules                                 | oxlint `nextjs`, `react`, `@tanstack/query`, `query/*`                                                   | `query.test.ts`                                   |
| Type errors anywhere                                                                             | `vp check` (type-aware lint with `typeCheck`) and `vp run -r typecheck`                                  | —                                                 |

Reviewed by hand: whether a picked field set is right for a contract, whether an
action's authorization is correct, and whether a new route, helper or lookup is
needed.

## Promise failure handling

- Await or return a Promise so its caller can handle failure. Do not leave a
  Promise rejection without an owner.
- Handle failures at the boundary that can respond. User-triggered failures must
  show useful feedback and must not continue success-only actions.
- Catch only to report, recover, or convert an error.
- `void` only marks a Promise as intentionally detached; it does not handle
  failure.

## Bug fixes

- Never guess at a bug's cause. Reproduce it in the real app (browser for UI,
  `curl` for `/api/*`, `wrangler dev --test-scheduled` for cron), fix it from
  evidence, then verify the same reproduction again.

## Commit checks

- Keep commit hooks enabled. Do not use `VP_GIT_HOOKS=0`, `HUSKY=0`, or
  `git commit --no-verify` to get a commit through.
- If a hook fails, fix its formatting, lint, type, or architecture errors, then
  retry the commit.
- Pushing `main` must not deploy by itself; deploys are an explicit step.
