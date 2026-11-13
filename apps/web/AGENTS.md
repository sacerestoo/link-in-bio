# apps/web

- `app/`: Next.js App Router routes only. `features/<domain>/`: feature code,
  with client UI in `features/<domain>/ui/`. `server/`: Hono API, auth and
  database access. `worker/index.ts`: the Worker entry.
- Only `server/**` may import `@grabbin/db`. Pages and features reach data
  through server modules or `/api/*`.
- `server/env.ts` is the only place that reads Worker settings.
- Local dev: `vp dev` from here (or `bun run dev` at the root). Put local
  secrets in `apps/web/.dev.vars` (gitignored), names from `.env.example`.
