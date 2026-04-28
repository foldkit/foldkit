---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Make DevTools state inspection agent-friendly. `foldkit_get_model` now accepts an optional `path` to narrow the response to a subtree (dot-string anchored at `root`, matching `SerializedEntry.changedPaths`) and `expand` to control summarization. By default the response is summarized: arrays collapse to `{ _summary, length, sample: [head, last] }`, deeply nested records collapse to `{ _summary, keys }`, and long strings collapse to `{ _summary, length, head }` so a full Model snapshot fits inside an agent's context window. A path miss returns an error listing the keys available at the deepest segment that resolved, so an agent can refine in one follow-up call.

A new `foldkit_get_model_at` tool snapshots historical Model state at an absolute history index. Pass `index: N - 1` to read the Model just before message `N`. For the initial Model, use `foldkit_get_init` (which also returns the names of Commands returned from `init`).

`foldkit_get_message` no longer carries `modelBefore` / `modelAfter` snapshots. Each entry's `changedPaths` already answers the common "what did this message change?" question. To inspect the literal Model values around an entry, call `foldkit_get_model_at` with `index - 1` and `index`. This is a wire-format change to `ResponseMessage`; bumping `@foldkit/devtools-mcp` in lockstep.
