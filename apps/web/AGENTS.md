# apps/web

- `app/` holds Next.js route files and `lib/` holds app wiring such as settings.
  The Worker entry is `worker.ts`, set as `main` in `wrangler.jsonc`; it wraps
  vinext's App Router handler with Sentry.
- `/v1/*` requests go through the `SERVER` service binding to `apps/server`. API
  controllers and auth wiring live in that Worker.
- `lib/api-client.ts` imports the server Hono app type only; browser requests
  still use `/v1/*` on the web origin.
- `lib/env.ts` validates web settings. Server settings are in
  `apps/server/src/lib/env.ts`.
- Local dev: `vp dev` from here (or `bun run dev` at the root) on
  http://localhost:3000. Put local settings in `apps/web/.env.local`
  (gitignored), names from `apps/web/.env.example`; server settings go in
  `apps/server/.env.local`.
