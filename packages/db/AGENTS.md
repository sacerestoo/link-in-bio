# packages/db

- Server-only. Importable only from `apps/web/lib/auth.ts` and
  `apps/cron/src/**`.
- `src/` holds only `client.ts`, `schema/`, `queries/` and `migrations/`
  (`check:architecture`). Tests live in `__tests__/` beside `src/`.
- Each table or enum lives in a flat `src/schema/<domain>.ts` (no barrel), and
  `client.ts` imports it and spreads it into the exported `schema` passed to
  `drizzle()`.
- Domain query functions go in `src/queries/<domain>.ts` and take the `Database`
  as their first argument.
- `bun run db:generate` / `db:migrate` (from this directory) read
  `DATABASE_URL`; migrations are applied before merging, never by a deploy.
