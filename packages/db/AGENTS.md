# packages/db

- Server-only. Importable only from `apps/server/src/**` and `apps/cron/src/**`.
- `src/` holds `client.ts`, `schema/`, `repositories/` and `migrations/`
  (`check:architecture`). Tests live in `__tests__/` beside `src/`.
- Each table or enum lives in a flat `src/schema/<domain>.ts` (no barrel), and
  `client.ts` imports each schema and spreads it into the exported schema passed
  to `drizzle()`.
- Put domain database operations in flat `src/repositories/<domain>.ts` files.
  Repository functions return the value their callers use, such as an
  availability boolean when a query only checks whether a row exists.
- `bun run db:generate` / `db:migrate` (from this directory) load `DATABASE_URL`
  from the repo-root `.env.local`; migrations are applied before merging, never
  by a deploy.
