# Mobile Friendliness Audit

_Started 2026-05-17 10:09 UTC_

---

## User

Recursive mobile-friendliness pass over this entire site. Keep going until every page is done.

## Discover

Enumerate every route from the router config (routes.tsx / app/ / pages/ / router.ts). Write the list to MOBILE_AUDIT.md at repo root: `[ ]` pending, `[x]` done, `[!]` blocked. This makes the run resumable — always pick up at the first `[ ]`.

## For each pending route

1. Open the page component(s) and any shared layout/nav it uses.
2. Fix every checklist failure below.
3. Mark the route `[x]` in MOBILE_AUDIT.md. If a fix lived in a shared component, mark every other route that consumes it `[x]` too.

## Checklist

- Viewport meta present: `<meta name="viewport" content="width=device-width, initial-scale=1">`
- No fixed widths or overflow that would cause horizontal scroll at 320px
- Interactive elements ≥ 44×44px
- Body text ≥ 16px (prevents iOS input zoom)
- Inputs have correct `type` + `inputmode` + `autocomplete`
- Desktop nav collapses to hamburger/drawer below `md`
- Tables: horizontal scroll wrapper OR stacked cards below `md`
- Modals: full-screen on mobile, close button thumb-reachable
- Images: `max-width: 100%; height: auto`
- Sticky/fixed elements respect `env(safe-area-inset-*)`
- Forms single-column on mobile
- Hover-only interactions have a tap equivalent
- Padding/gaps scale down on mobile

## Rules

- Mobile-first: mobile is the base, `md:` / `lg:` are overrides
- Reuse existing breakpoint tokens and shared components — fix shared components once
- Mobile fixes only, no unrelated refactors
- Don't break desktop

## Assistant

_[tool: local_ls]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: local_grep]_

_[tool: local_grep]_

_[tool: local_read]_

_[tool: local_grep]_

_[tool: local_read]_

_[tool: local_read]_

_[tool: update_todos]_

Good — I have everything I need. Now I'll plan, write the audit manifest, copy the source files, and inject the full mobile CSS pass.

_[tool: write_file]_

_[tool: local_copy_to_project]_

Now copy `index.html` into the project, then inject the mobile CSS block.

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: run_script]_

_[tool: run_script]_

_[tool: run_script]_

