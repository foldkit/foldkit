---
'foldkit': minor
'@foldkit/devtools-mcp': minor
---

Expose everything Foldkit DevTools shows to AI agents through MCP. The DevTools panel surfaces three pieces of context the wire protocol previously omitted: the synthetic init row (initial Model and Commands returned from `init`), the submodel chain extracted from `Got*Message` wrappers (so a parent can identify which child Message originated a dispatch), and runtime-level state like pause status and history bounds. Each is now first-class on the wire and bound to a dedicated MCP tool.

What's new on `@foldkit/devtools-mcp`:

- `foldkit_get_init` snapshots the recorded initial Model and the names of Commands returned from the application's `init` function. Equivalent to clicking the "init" row in the DevTools panel.
- `foldkit_get_runtime_state` returns a snapshot of the runtime's DevTools state: `currentIndex`, `startIndex`, `totalEntries`, `isPaused`, `maybePausedAtIndex`, and `hasInitModel`. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see and detecting whether the runtime is paused at a replayed snapshot.

What's new on the wire protocol (`foldkit/devtools-protocol`):

- `SerializedEntry` carries two additional fields: `submodelPath` (wrapper tags from outer to inner when the entry came up through a Submodel chain, otherwise an empty array) and `maybeLeafTag` (`Some` with the innermost child Message tag when one exists, `None` otherwise).
- New `RequestGetInit` / `ResponseInit` carrying `maybeModel` and the init `commandNames`.
- New `RequestGetRuntimeState` / `ResponseRuntimeState` carrying the fields described above.

The submodel path extraction logic is now shared between the in-browser DevTools overlay and the wire serializer, so both surfaces always agree on what counts as a Submodel chain.
