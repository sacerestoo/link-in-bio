# grabbin

Link-in-bio service, rebuilt as a [Vite+](https://viteplus.dev) (`vp`) monorepo
for Cloudflare Workers. The previous implementation lives on the `v1` branch
(reference only; see `AGENTS.md`).

- `apps/web`: [vinext](https://github.com/cloudflare/vinext) (Next.js App Router
  on Vite) with a Hono API under `/api/*`, served by one Worker.
- `apps/cron`: a Worker with a daily `scheduled` handler.
- `packages/db` (Drizzle), `packages/auth` (Better Auth + Creem), `packages/ui`
  (shadcn), `packages/shared` (types and schemas).

## Setup

1. Install [Bun](https://bun.sh) 1.4 and Node.js 24 (Vite+ needs `>=22.18`),
   then run `bun install`. This also installs the Git hooks in `.vite-hooks/`.
2. For local secrets, create `apps/web/.dev.vars` (and `apps/cron/.dev.vars` if
   needed) with names from `.env.example`, then run `bun run check:env`. Never
   commit real values.
3. Replace the placeholder Hyperdrive id in both `wrangler.jsonc` files before
   the first deploy.

## Scripts

- `bun run dev` starts the web app (vinext + Hono) on <http://127.0.0.1:5173>;
  `bun run dev:cron` starts the cron Worker.
- `bun run check` generates Worker types, runs `vp check` (format, lint, type
  check) and `check:architecture` (layout rules and dependency-cruiser).
- `bun run check:fix` formats the code.
- `vp run -r build | test | lint | typecheck` runs a task in every package.
- `bun run verify` runs everything CI runs.
- `bun run --cwd packages/db db:generate` / `db:migrate` manage migrations.
- `bun run --cwd apps/web deploy` / `bun run --cwd apps/cron deploy` deploy a
  Worker. Nothing deploys on push.
