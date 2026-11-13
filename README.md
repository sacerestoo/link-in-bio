# grabbin

Link-in-bio service, rebuilt as a [Vite+](https://viteplus.dev) (`vp`) monorepo
for Cloudflare Workers. The previous implementation lives on the `v1` branch
(reference for UI copy, layout and visual design only; see `AGENTS.md`).

- `apps/web`: [vinext](https://github.com/cloudflare/vinext) (Next.js App Router
  on Vite) with a Hono API under `/api/*` (via one catch-all route handler),
  served by one Worker.
- `apps/cron`: a Worker with a `scheduled` handler, daily at 06:00 UTC (15:00
  KST).
- `packages/db` (Drizzle), `packages/auth` (Better Auth + Creem), `packages/ui`
  (shadcn), `packages/shared` (types and schemas).

## Setup

1. Install [Bun](https://bun.sh) 1.4 and Node.js 24 (Vite+ needs `>=22.18`),
   then run `bun install`. This also installs the Git hooks in `.vite-hooks/`.
2. For local settings, create `apps/web/.env.local` (and `apps/cron/.dev.vars`
   if needed) with names from `.env.example`, then run `bun run check:env`.
   Never commit real values.
3. The web and cron Workers already use the existing `grabbin` Hyperdrive config
   for deployment. Local Wrangler development connects directly to Supabase
   Local on `127.0.0.1:54322`.

## Scripts

- `bun run dev` starts the web app (vinext + Hono) on <http://localhost:3000>;
  `bun run dev:cron` starts the cron Worker.
- `bun run check` generates Worker types, runs `vp check` (format, lint, type
  check) and `check:architecture` (layout rules and dependency-cruiser).
- `bun run check:fix` applies safe lint fixes and formats the code. Run
  `bun run verify` afterward to check for remaining issues.
- `vp run -r build | test | lint | typecheck` runs a task in every package.
- `bun run verify` runs everything CI runs.
- `bun run --cwd packages/db db:generate` / `db:migrate` manage migrations.
- `bun run --cwd apps/web deploy` / `bun run --cwd apps/cron deploy` deploy a
  Worker. Nothing deploys on push.
