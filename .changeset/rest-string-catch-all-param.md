---
'foldkit': minor
---

Add `restString`, a terminal catch-all route param that captures the raw remaining URL path, slashes and dots included, as a single `string` and round-trips bidirectionally: `/vault/a/b/c.md` parses into `{ path: 'a/b/c.md' }` and builds back from it. Where `rest` yields a `NonEmptyArray` of segments, `restString` rejoins the tail into one path string, so file-tree and docs routes can carry a repository-relative path as `{ path: S.String }` route data. Printing requires a normalized path, non-empty with no leading, trailing, or repeated slashes; any other value would build a URL that parses back differently, so printing fails with a `ParseError` instead. Exported from `foldkit/route`.
