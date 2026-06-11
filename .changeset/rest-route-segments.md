---
'foldkit': minor
---

Add `rest` route parser for capturing all remaining path segments (catch-all routes) as a non-empty array. Rest parsers are terminal: `slash` cannot extend them, and `slash` now preserves terminality when its second parser is terminal. `query` can still follow `rest`.

**Breaking (type-level):** because terminality now survives `slash` composition, chaining more path segments after a parser that embeds `query` no longer compiles. Declare `query` at the end of the route instead.
