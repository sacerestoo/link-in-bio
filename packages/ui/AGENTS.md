# packages/ui

- Shared shadcn components (`base-nova` style on Base UI), `cn`, hooks and the
  Tailwind stylesheet `src/styles/globals.css`. Copied from foundly's
  `shared/ui`.
- Add components with shadcn from this directory or from `apps/web`
  (`bunx --bun shadcn add <name>`); both write into `src/components/` according
  to `components.json`. Then run `vp check --fix` from the repo root. shadcn
  output imports `lucide-react`; change it to `lucide-react/icons/<name>`, which
  lint requires.
- Import across this package with `@grabbin/ui/...`, the same paths apps use.
- Never import `@grabbin/db`, `@grabbin/auth`, or anything under `apps/`.
  Client-safe types and schemas come from `@grabbin/shared`.
- Keep CSS in `src/styles/`. New app folders that use Tailwind classes need an
  `@source` line in `globals.css`.
