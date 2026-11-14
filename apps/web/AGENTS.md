# apps/web

- `app/` holds Next.js route files. `controllers/` holds Hono controllers,
  `services/` holds web domain services and `lib/` holds app wiring such as
  settings and auth. The Worker entry is `worker.ts`, set as `main` in
  `wrangler.jsonc`; it wraps vinext's App Router handler with Sentry.
- `/api/*` is served by `app/api/[[...route]]/route.ts`. It is the only file
  allowed under `app/api/`, creates the root Hono app, and registers domain
  controllers from `controllers/*.controller.ts`.
- `lib/auth.ts` wires the auth package to the web database. Pages call the web
  API for data.
- `lib/env.ts` validates web settings. The catch-all route reads Worker bindings
  directly because it creates the root Hono app outside a Hono context.
- Local dev: `vp dev` from here (or `bun run dev` at the root) on
  http://localhost:3000. Put local settings in `apps/web/.env.local`
  (gitignored), names from `apps/web/.env.example`.
