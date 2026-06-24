---
'foldkit': minor
---

Add `schemaSegment` to `foldkit/route`. It captures a URL segment and decodes it
through an Effect `Schema`, so the route value carries the schema's decoded type
rather than a bare `string` or `number`. Branded ids, refined strings, and
string-literal unions round-trip: `schemaSegment` decodes when parsing a URL and
encodes when building one. The schema's encoded form must be a single segment
string. Use `rest` for values that span multiple segments and `query` for values
in the query string.
