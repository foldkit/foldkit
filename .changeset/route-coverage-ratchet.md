---
'foldkit': minor
---

Add `Coverage`, a zero-dependency `foldkit/test` helper that asserts every route has at least one behavioral Scene. `Coverage.everyRouteHasAScene({ routeSource, testDir, knownDebt })` reads the route registry straight from the `r(...)` declarations in `route.ts`, scans co-located test files for a `describe('route:<Tag>', ...)` marker, and hard-errors on any uncovered route except those in a `knownDebt` set that only shrinks. Covering a route forces its removal from the set (a stale entry is itself an error), so coverage can never silently regress. `Coverage.audit(...)` exposes the same computation as a pure report. Depends only on vitest plus `node:fs`/`node:path`.
