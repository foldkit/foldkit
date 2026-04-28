# @foldkit/devtools-mcp

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
