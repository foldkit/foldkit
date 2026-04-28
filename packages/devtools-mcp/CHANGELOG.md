# @foldkit/devtools-mcp

## 0.2.0

### Minor Changes

- e8f9c69: Make DevTools state inspection agent-friendly. `foldkit_get_model` now accepts an optional `path` to narrow the response to a subtree (dot-string anchored at `root`, matching `SerializedEntry.changedPaths`) and `expand` to control summarization. By default the response is summarized: arrays collapse to `{ _summary, length, sample: [head, last] }`, deeply nested records collapse to `{ _summary, keys }`, and long strings collapse to `{ _summary, length, head }` so a full Model snapshot fits inside an agent's context window. A path miss returns an error listing the keys available at the deepest segment that resolved, so an agent can refine in one follow-up call.

  A new `foldkit_get_model_at` tool snapshots historical Model state at an absolute history index. Pass `index: N - 1` to read the Model just before message `N`. For the initial Model, use `foldkit_get_init` (which also returns the names of Commands returned from `init`).

  `foldkit_get_message` no longer carries `modelBefore` / `modelAfter` snapshots. Each entry's `changedPaths` already answers the common "what did this message change?" question. To inspect the literal Model values around an entry, call `foldkit_get_model_at` with `index - 1` and `index`. This is a wire-format change to `ResponseMessage`; bumping `@foldkit/devtools-mcp` in lockstep.

- 937661e: Expose everything Foldkit DevTools shows to AI agents through MCP. The DevTools panel surfaces three pieces of context the wire protocol previously omitted: the synthetic init row (initial Model and Commands returned from `init`), the submodel chain extracted from `Got*Message` wrappers (so a parent can identify which child Message originated a dispatch), and runtime-level state like pause status and history bounds. Each is now first-class on the wire and bound to a dedicated MCP tool.

  What's new on `@foldkit/devtools-mcp`:
  - `foldkit_get_init` snapshots the recorded initial Model and the names of Commands returned from the application's `init` function. Equivalent to clicking the "init" row in the DevTools panel.
  - `foldkit_get_runtime_state` returns a snapshot of the runtime's DevTools state: `currentIndex`, `startIndex`, `totalEntries`, `isPaused`, `maybePausedAtIndex`, and `hasInitModel`. Useful for understanding what `foldkit_list_messages` and `foldkit_get_message` will see and detecting whether the runtime is paused at a replayed snapshot.

  What's new on the wire protocol (`foldkit/devtools-protocol`):
  - `SerializedEntry` carries two additional fields: `submodelPath` (wrapper tags from outer to inner when the entry came up through a Submodel chain, otherwise an empty array) and `maybeLeafTag` (`Some` with the innermost child Message tag when one exists, `None` otherwise).
  - New `RequestGetInit` / `ResponseInit` carrying `maybeModel` and the init `commandNames`.
  - New `RequestGetRuntimeState` / `ResponseRuntimeState` carrying the fields described above.

  The submodel path extraction logic is now shared between the in-browser DevTools overlay and the wire serializer, so both surfaces always agree on what counts as a Submodel chain.

### Patch Changes

- Updated dependencies [e8f9c69]
- Updated dependencies [937661e]
  - foldkit@0.78.0

## 0.1.2

### Patch Changes

- bbe2a03: Stop publishing the runtime's Message Schema as JSON Schema in the DevTools wire protocol. `RuntimeInfo.maybeMessageSchema` is removed; agents discover Message shape by reading the application's source instead. Dispatch still works the same: the runtime decodes the payload against the live `Message` Schema and returns a clean error on mismatch. Only the upfront introspection hint is gone.

  This avoids a class of `JSONSchema.make` failures triggered by schema constructs like `OptionFromSelf`, `instanceOf`, and other shapes without a default JSON Schema. Foldkit's UI components and `Url` use those constructs internally, so any app wrapping them via the Submodel pattern was either crashing or losing dispatch validation. The simpler protocol sidesteps the whole annotation grind.

  The `Url` and `File.File` JSON Schema annotations added in the unreleased work, and the bridge's `Either.try` safety net around `JSONSchema.make`, are removed in the same change since their only purpose was to make the JSON Schema generation succeed.

- Updated dependencies [9c59ada]
- Updated dependencies [bbe2a03]
  - foldkit@0.77.0

## 0.1.1

### Patch Changes

- a7576fc: Document that the MCP server only sees a runtime while the app is open in a browser tab. The browser bridge runs inside the app, so closing the tab removes the runtime from `foldkit_list_runtimes`.
- 15d77a6: Broaden the `foldkit` peer dependency from `^0.76.0` to `^0` so future foldkit minor releases don't trigger an unwanted major version cascade in dependent packages. The repo's `version-packages` script now resets these peer dep ranges back to broad form after `changeset version` runs, preventing the narrowing that was causing `onlyUpdatePeerDependentsWhenOutOfRange` to fire on every minor.
- Updated dependencies [c5d56cb]
  - foldkit@0.76.1

## 0.1.0

### Minor Changes

- 6426adb: Add DevTools MCP support so AI agents (Claude Code, Codex, Cursor, Windsurf, anything that speaks MCP) can connect to a running Foldkit app. Agents read the current Model, list and inspect Message history, replay to past states, and dispatch Messages into the runtime. The runtime's own Message Schema is published as JSON Schema so the agent discovers exactly what it can dispatch, and every payload is validated against the Schema before reaching the update loop.

  ## Migration

  The `devtools` config field on `Runtime.makeProgram` is now `devTools` (capital T). Type `DevtoolsConfig` is now `DevToolsConfig`.

  ```diff
   Runtime.makeProgram({
  -  devtools: { position: 'BottomRight' },
  +  devTools: { position: 'BottomRight' },
   })
  ```

  If you import the type directly:

  ```diff
  -import type { DevtoolsConfig } from 'foldkit'
  +import type { DevToolsConfig } from 'foldkit'
  ```

  ## What's new
  - **`foldkit/devtools-protocol`** (new entry point) exposes the typed `Request`/`Response`/`Event` Schemas and a browser-side WebSocket bridge that streams DevTools store updates to the relay.
  - **`DevToolsConfig.Message`** is a new optional field. When set to your app's `Message` Schema, the runtime publishes it as JSON Schema to the agent and validates every dispatched payload against it before reaching the update loop. Without it, dispatch is rejected; the read-only tools still work.
  - **`@foldkit/vite-plugin`** accepts a new `devToolsMcpPort` option. When set, the plugin opens a WebSocket relay on that port that forwards traffic between connected browser tabs and any external MCP client. Without it, HMR behavior is unchanged. The relay only runs at dev time; production builds never include it.
  - **`@foldkit/devtools-mcp`** is a new package: an MCP server that runs as a Node child process spawned by your AI agent. Run `npx @foldkit/devtools-mcp init` in your project root to register it. See [foldkit.dev/ai/mcp](https://foldkit.dev/ai/mcp) for the full guide.
  - **`create-foldkit-app`** scaffolds new projects with `@foldkit/devtools-mcp` installed as a dev dependency, a `.mcp.json` registering the server, and a `vite.config.ts` that passes `devToolsMcpPort: 9988` to the Foldkit plugin.

### Patch Changes

- Updated dependencies [6426adb]
  - foldkit@0.76.0
