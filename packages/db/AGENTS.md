# packages/db

- Server-only. Importable only from `apps/server/src/**` and `apps/cron/src/**`.
- `src/` holds only `client.ts`, `schema/` and `migrations/`
  (`check:architecture`). Tests live in `__tests__/` beside `src/`.
- Each table or enum lives in a flat `src/schema/<domain>.ts` (no barrel), and
  `client.ts` imports it and spreads it into the exported `schema` passed to
  `drizzle()`.
- Domain data access belongs in `apps/server/src/services/<domain>.service.ts`.
- `bun run db:generate` / `db:migrate` (from this directory) load `DATABASE_URL`
  from the repo-root `.env.local`; migrations are applied before merging, never
  by a deploy.
