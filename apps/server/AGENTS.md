# apps/server

- A Cloudflare Worker that owns the Hono API, Better Auth setup and database
  access. `src/app.ts` composes Hono routes from `src/http/`.
- The web Worker forwards `/v1/*` through its `SERVER` service binding. Keep
  `workers_dev` disabled so this API is reached through the binding.
- `src/env.ts` validates server settings. Put local values in `.env.local` using
  the names in `.env.example`.
- Run the Worker on `http://localhost:3001`; its dev port is fixed.
- `src/auth.ts` assembles Better Auth configuration and creates an auth instance
  from the current Worker bindings and database connection. Keep the
  configuration units in focused root-level modules such as `src/options.ts`,
  `src/hooks.ts`, and `src/providers.ts`.
- `packages/subscription` provides server-side Creem and subscription
  integrations. It accesses subscription records through Better Auth's adapter
  and does not import the database package.
- Only `apps/server/src/**` and `apps/cron/src/**` may import `@grabbin/db`.
- Keep route coordination in `src/http/`; call database operations through
  `packages/db/src/repositories/<domain>.ts`. Focused external-integration
  helpers belong directly in `src/`. Do not add a service layer.

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
- `GET /v1/metadata`: signed-in session in production; development bypasses
  session auth through middleware. Resolve the URL with `@grabbin/contracts` and
  forward the URL, provider and target to Scrapper.
- `GET /v1/auth/session`: signed-in session; return only the current user's
  session and subscriptions (`referenceId` matches the user ID).
- `ALL /v1/auth/*`: Better Auth owns these endpoints. Public sign-in, sign-up,
  verification and OAuth callbacks have no existing-row owner check; signed
  Creem webhooks authenticate with the provider signature. Authenticated
  account, session and billing operations must stay scoped to the current
  session. Checkout and portal identity come from the session. Creem cancel,
  retrieve and search endpoints are disabled.
