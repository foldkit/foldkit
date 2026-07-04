---
'foldkit': minor
---

Add `restString`, a terminal catch-all route param that captures the raw remaining URL path — slashes and dots included — as a single `string` and round-trips bidirectionally (`/vault/a/b/c.md` ⇄ `{ path: 'a/b/c.md' }`). Where `rest` yields a `NonEmptyArray` of segments, `restString` rejoins the tail into one path string, so file-tree and docs routes can carry a repository-relative path as clean `{ path: S.String }` route data. Exported from `foldkit/route`.
