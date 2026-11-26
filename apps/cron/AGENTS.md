# apps/cron

- A plain Cloudflare Worker: `src/index.ts` exports `scheduled`; jobs live in
  `src/jobs.ts`. The schedule is `triggers.crons` in `wrangler.jsonc`: daily at
  `0 6 * * *` (06:00 UTC, 15:00 Asia/Seoul), with weekly media cleanup at
  `0 7 * * SUN` (07:00 UTC Sunday).
- Put local settings in `.env.local` using names from `apps/cron/.env.example`.
- May import `@grabbin/db`; never imports `apps/web`.
- Test a run locally: `vp build`, then
  `bunx wrangler dev --config dist/grabbin_cron/wrangler.json --test-scheduled`
  and request `/cdn-cgi/handler/scheduled?cron=0+6+*+*+*`.
