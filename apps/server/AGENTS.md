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
- Keep domain coordination in `src/services/`; put database operations in
  `packages/db/src/repositories/<domain>.ts`. Page routes call page repository
  functions directly; do not add a `pages.service.ts` layer.

## Route permissions

Keep row ownership checks in server data access: filter user-owned rows by the
authenticated session's user ID. Current routes:

- `GET /v1/health`: no permission; returns service status only.
- `GET /v1/pages/me`: signed-in session; read only the page whose `userId`
  matches the session user.
- `PATCH /v1/pages/:handle`: signed-in session; update only the page whose
  handle matches the path and whose `userId` matches the session user. Profile
  image keys must point to an uploaded object in that user's R2 prefix and pass
  the configured image type and size checks.
- `POST /v1/pages/:handle/image-upload`: signed-in session; issue a short-lived
  R2 presigned PUT URL only for the session user's page and an allowed image
  type and size.
- `POST /v1/pages/handle`: no permission; public lookup returns only whether the
  handle is available.
- `GET /v1/auth/session`: signed-in session; return only the current user's
  session and subscriptions (`referenceId` matches the user ID).
- `ALL /v1/auth/*`: Better Auth owns these endpoints. Public sign-in, sign-up,
  verification and OAuth callbacks have no existing-row owner check; signed
  Creem webhooks authenticate with the provider signature. Authenticated
  account, session and billing operations must stay scoped to the current
  session. Checkout and portal identity come from the session. Creem cancel,
  retrieve and search endpoints are disabled.
