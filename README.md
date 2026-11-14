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
2. Copy the root `.env.example` to `.env.local`. Put Neon Local's API key,
   project ID, `dev` branch ID, runtime role password and `DATABASE_URL` there,
   then run `bun run db:local` to start the local proxy on `127.0.0.1:15433`.
   Create `app_runtime` on each Neon branch before applying migrations, with
   login access and no elevated role memberships. The owner connection in
   `DATABASE_URL` and the local Neon Local alias use the owner role. They are
   for migrations and local development. Configure production Hyperdrive to
   connect as `app_runtime` before deployment.
3. Copy `apps/web/.env.example` to `apps/web/.env.local` and, if needed,
   `apps/cron/.env.example` to `apps/cron/.env.local`. Run `bun run check:env`;
   never commit real values.

## Scripts

- `bun run dev` starts the web app (vinext + Hono) on <http://localhost:3000>;
  `bun run dev:cron` starts the cron Worker.
- `bun run check` generates Worker types, runs `vp check` (format, lint, type
  check) and `check:architecture` (layout rules and dependency-cruiser).
- `bun run check:fix` applies safe lint fixes and formats the code. Run
  `bun run verify` afterward to check for remaining issues.
- `vp run -r build | test | lint | typecheck` runs a task in every package.
- `bun run verify` runs everything CI runs, including Wrangler dry-runs for both
  built Workers.
- `bun run check:prod-keys` checks the production deployment settings without
  printing their values. Set `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `WEB_ENV_PRODUCTION` and `CRON_ENV_PRODUCTION` in the GitHub `production`
  environment. Each secret uses dotenv format and must contain real values for
  every key in the matching Worker `.env.example`. The deploy workflow checks
  the names, blank values and env schema before building or deploying. The root
  `.env.local` is for Neon Local and is never deployed.
- `bun run --cwd packages/db db:generate` / `db:migrate` manage migrations.
- `bun run --cwd apps/web deploy` / `bun run --cwd apps/cron deploy` deploy a
  Worker. Nothing deploys on push.
