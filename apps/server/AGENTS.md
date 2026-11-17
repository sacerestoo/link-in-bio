# apps/server

- A Cloudflare Worker that owns the Hono API, Better Auth setup and database
  access. `src/app.ts` composes Hono routes from `src/routes/`.
- The web Worker forwards `/v1/*` through its `SERVER` service binding. Keep
  `workers_dev` disabled so this API is reached through the binding.
- `src/lib/env.ts` validates server settings. Put local values in `.env.local`
  using the names in `.env.example`.
- Run the Worker on `http://localhost:3001`; its dev port is fixed.
- `src/lib/auth.ts` assembles Better Auth configuration and creates an auth
  instance from the current Worker bindings and database connection. Keep the
  configuration units in `src/lib/auth/` focused on core options, hooks,
  providers, email, and subscriptions.
- `packages/subscription` provides server-side Creem and subscription
  integrations. It accesses subscription records through Better Auth's adapter
  and does not import the database package.
- Only `apps/server/src/**` and `apps/cron/src/**` may import `@grabbin/db`.
