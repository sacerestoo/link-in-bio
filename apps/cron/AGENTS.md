# apps/cron

- A plain Cloudflare Worker: `src/index.ts` exports `scheduled`; jobs live in
  `src/jobs.ts`. The weekly schedule is `triggers.crons` in `wrangler.jsonc`:
  `0 7 * * SUN` (07:00 UTC Sunday, 16:00 Asia/Seoul).
- Put local settings in `.env.local` using names from `apps/cron/.env.example`.
- May import `@grabbin/db`; never imports `apps/web`.
- Test a run locally: `vp build`, then
  `bunx wrangler dev --config dist/grabbin_cron/wrangler.json --test-scheduled`
  and request `/cdn-cgi/handler/scheduled?cron=0+7+*+*+SUN`.
