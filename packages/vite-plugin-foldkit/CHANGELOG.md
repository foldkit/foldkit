# @foldkit/vite-plugin

## 0.4.1

### Patch Changes

- 283f7ac: Fix a per-dispatch latency regression on apps with large Models. The runtime previously called `Schema.toEquivalence(Model)` and `Schema.encodeUnknownSync(Model)` synchronously inside `processMessage` on every dispatch where the model reference changed. Both walk the entire model graph (the structural-equivalence walk has no reference-equality short-circuit at field or element boundaries), so on a model carrying a 10k-item array they cost ~50ms and ~95ms respectively. With both gated only on `currentModel !== nextModel`, every keystroke in a search field whose route lived on the model paid ~140ms of HMR-preservation overhead even with `devTools: false` and `freezeModel: false`.

  The fix drops the structural-equivalence guard (subscribers already dedupe via `Stream.changesWith` on their dependency projections, which is the correct place) and defers the model encoding through a 200ms debounce. A burst of dispatches coalesces into a single encode that runs after the user pauses; a `vite:beforeFullReload` listener flushes the latest pending model synchronously so the plugin still has fresh state before the page reloads. The `PreserveModelMessage` schema gains an optional `isHmrReload` flag the runtime sets to `true` on the flush path, so a fresh entry created during an HMR boundary is correctly marked as eligible for restoration.

  Also fixes a separate latency bug in the message drain loop: `burstStartedAtRef` was reset on every `Effect.forever` iteration, so Command-chained dispatches (each iteration handling a single message) never accumulated enough wall-clock time to exceed `FRAME_BUDGET_MS`, and the runtime never yielded to the browser between batches. A long Command chain would process all messages in one microtask burst with a single render at the end. The drain loop now polls first and only resets the burst timer when `Queue.take` actually blocked (the queue was idle), so the budget accumulates across consecutive batches and the runtime yields once it crosses the 5ms threshold. Cumulative dispatches now visibly stream through the renderer at ~60fps instead of appearing all at once.

- Updated dependencies [283f7ac]
  - foldkit@0.82.8

## 0.4.0

### Minor Changes

- 40f43a9: Foldkit now targets Effect 4. **This is a breaking change.** For Effect 4's own breaking changes (Schema, Stream, Context.Service, etc.), see Effect's release notes.

  ## Upgrade

  ```bash
  pnpm add effect@4.0.0-beta.59 foldkit@latest
  pnpm add -D @foldkit/vite-plugin@latest @foldkit/devtools-mcp@latest
  ```

  Pin `effect` to the exact version foldkit declares (`4.0.0-beta.59`). The pin is intentional during the v4 beta window — letting `effect` drift to a newer beta can break foldkit's runtime until foldkit re-pins.

  ## Foldkit changes

  ### Container element needs an `id`

  The DOM element you pass as `container` to `Runtime.makeProgram` must have a non-empty `id` attribute. `Runtime.run` errors with a clear message if it's missing. Most apps already use `<div id="root"></div>`; if yours doesn't, add an id.

  The id scopes HMR model preservation per-runtime. Foldkit's DevTools overlay manages its own container internally, so it doesn't conflict with your app. If you mount multiple Foldkit runtimes in the same page yourself, give each container a unique id.

  ### `@foldkit/vite-plugin` auto-includes Effect namespaces

  The plugin now adds the full set of `effect/*` namespaces foldkit references to `optimizeDeps.include`. v4 promoted previously nested names (`SchemaIssue`, `SchemaTransformation`, `Result`, `Cause`) to top-level exports that consumers rarely mention by name, and Vite's optimizer scans only your source. Without the force-include, foldkit's transitive imports would be missing from the prebundle and crash at runtime in dev. The plugin handles it transparently — no `optimizeDeps.include` entries needed in your config.

  ### `@foldkit/devtools-mcp` resilience

  The MCP server no longer dies on startup if no Foldkit dev server is running on the relay port. It boots regardless; tool calls return a clear "Not connected to a Foldkit dev server" error string until the relay is reachable. Restarting your dev server no longer requires manually reconnecting the MCP server in your host.

  ### `@foldkit/devtools-mcp` MCP tool registration fixed

  Tool schemas now register correctly with strict MCP hosts (Claude Code, Cursor). Previously the server emitted a wrapper schema that hid `inputSchema.type === "object"` one level too deep, and hosts silently dropped every tool.

  ### `create-foldkit-app` optional flags

  The `--name`, `--example`, and `--package-manager` CLI flags are now optional. Running with no flags drops into an interactive picker for each. Pass any subset of flags to skip the matching prompts.

### Patch Changes

- Updated dependencies [60283c8]
- Updated dependencies [40f43a9]
- Updated dependencies [98519e1]
  - foldkit@0.82.0

## 0.3.2

### Patch Changes

- 7036191: Show a helpful error when the DevTools MCP port is already in use. Previously the relay logged a generic "failed to start" line with the raw `EADDRINUSE` error, which made it hard to tell why an agent could not connect to Foldkit DevTools via MCP. The plugin now explains that another Foldkit project is likely bound to the port, and suggests either stopping that project or setting a different `devToolsMcpPort` in vite config.

  The success log was also moved into the WebSocket server's `listening` event, so "MCP relay listening on ..." no longer prints when the bind ultimately fails.

## 0.3.1

### Patch Changes

- 15d77a6: Broaden the `foldkit` peer dependency from `^0.76.0` to `^0` so future foldkit minor releases don't trigger an unwanted major version cascade in dependent packages. The repo's `version-packages` script now resets these peer dep ranges back to broad form after `changeset version` runs, preventing the narrowing that was causing `onlyUpdatePeerDependentsWhenOutOfRange` to fire on every minor.
- Updated dependencies [c5d56cb]
  - foldkit@0.76.1

## 0.3.0

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

## 0.2.4

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.2.3

### Patch Changes

- 6b6895d: Skip full-reload for file changes outside the module graph (e.g. editor temp files, MCP tool logs) by checking the `modules` array before sending the reload signal.

## 0.2.2

### Patch Changes

- 4b81a10: Update GitHub URL from `devinjameson/foldkit` to `foldkit/foldkit` following org transfer.
