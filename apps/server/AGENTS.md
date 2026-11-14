# apps/server

- A Cloudflare Worker that owns the Hono API, Better Auth setup and database
  access. `src/app.ts` composes Hono controllers from `src/controllers/`.
- The web Worker forwards `/v1/*` through its `SERVER` service binding. Keep
  `workers_dev` disabled so this API is reached through the binding.
- `src/lib/env.ts` validates server settings. Put local values in `.env.local`
  using the names in `.env.example`.
- Run the Worker on `http://localhost:3001`; its dev port is fixed.
- `packages/auth` builds Better Auth from settings and a database adapter from
  this app; it does not connect to the database itself.
- Only `apps/server/src/**` and `apps/cron/src/**` may import `@grabbin/db`.
