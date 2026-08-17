# @foldkit/vite-plugin

## 0.14.0

### Minor Changes

- da05bfc: Bump Effect to `4.0.0-rc.109` (from `4.0.0-rc.108`). Foldkit's `effect` peer dependency now requires `4.0.0-rc.109`, and `@foldkit/devtools` pins its `@effect/platform-browser` peer dependency to the same version.

  Pin your Effect packages to `4.0.0-rc.109` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.109 @effect/platform-browser@4.0.0-rc.109
  pnpm add -D @effect/vitest@4.0.0-rc.109
  ```

## 0.13.1

### Patch Changes

- ac3a34f: Stop treating page-lifecycle events as a commitment. A page-owning app no longer tears itself down, or reloads itself, on an event the document can survive.

  Fixes an app going permanently blank when the user clicks a download link. `Runtime.run` started the program with `BrowserRuntime.runMain`, which interrupts the runtime on `beforeunload`. Chrome fires `beforeunload` for a click on a download link: it starts a navigation and converts it to a download once it sees the response, so the navigation is abandoned and the document lives on. By then the interrupt had already run the render finalizer, which puts the container element back empty. The file downloaded, the URL never changed, nothing was logged, and the app was gone until a manual reload.

  None of this is specific to Chrome, or to downloads. Browsers fire `beforeunload` when a navigation starts rather than when it commits, so any navigation that does not replace the document leaves the same result. A response that comes back `204 No Content` has the same shape, as does a navigation the user cancels. The download link is the case that was reported.

  `run` now starts the program with a `Runtime.makeRunMain` runner that registers no page-lifecycle interrupt. Error reporting is unchanged. A real navigation still ends the runtime, because the document goes with it.

  **Behavior change:** a page-owning app restored from the browser's back/forward cache no longer reloads the page. The runtime survives the freeze with its Model, its DOM, and its listeners intact, so a back-navigation now returns the app as the user left it, which is what the cache is for. The reload was there to rescue a page the `beforeunload` interrupt had already emptied, and that interrupt is gone. Two things do come back changed: an app that wants fresh data on restore has to ask for it, with a `pageshow` Subscription that dispatches a Message when `persisted` is set, and an app holding its own WebSocket gets it back closed, since the browser closes sockets on the way into the cache.

  One thing goes with the interrupt: a runtime's finalizers, meaning ManagedResource releases and Subscription and Mount teardowns, no longer get a best-effort run when the tab closes or the page navigates away. Nothing promised they would, and upstream calls that interrupt best-effort. An app that flushed state from a release should flush it as the state changes, or from a `pagehide` Subscription.

  The DevTools bridge no longer announces a disconnect on `beforeunload` either. It reported a live app as gone after a download-link click, and the MCP relay ignored that app until the next reload. A page that really goes away closes its Vite HMR socket, and the plugin already prunes the runtime on that close. Because the freeze into the back/forward cache closes that socket too, the bridge now re-announces the connection on a restore, so a resumed app comes back visible to the DevTools MCP tools instead of staying pruned.

  `foldkit` no longer imports `@effect/platform-browser`, so it is dropped from the package's dependencies and from its peer dependencies. Installing `foldkit` no longer asks for it. Apps still need it at the pinned version wherever they use it directly: `@foldkit/devtools` declares it as a peer dependency, and Effect's browser services such as `BrowserKeyValueStore` and `BrowserCrypto` come from it. `@foldkit/vite-plugin` adds `effect/Runtime` to the namespaces it force-includes in Vite's dependency optimizer, so a dev server prebundles what the compiled runtime now references.

## 0.13.0

### Minor Changes

- 3feb9ba: Bump Effect to `4.0.0-rc.108` (from `4.0.0-beta.107`), the first Effect v4 release candidate. Foldkit's peer dependencies now require `effect@4.0.0-rc.108` and `@effect/platform-browser@4.0.0-rc.108`.

  Pin your Effect packages to `4.0.0-rc.108` to match this release. While Effect v4 is in prerelease, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-rc.108 @effect/platform-browser@4.0.0-rc.108
  pnpm add -D @effect/vitest@4.0.0-rc.108
  ```

## 0.12.3

### Patch Changes

- 87e9dbf: Bump Effect to `4.0.0-beta.107` (from `4.0.0-beta.106`). Foldkit's peer dependencies now require `effect@4.0.0-beta.107` and `@effect/platform-browser@4.0.0-beta.107`.

  Pin your Effect packages to `4.0.0-beta.107` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.107 @effect/platform-browser@4.0.0-beta.107
  pnpm add -D @effect/vitest@4.0.0-beta.107
  ```

## 0.12.2

### Patch Changes

- 84050fc: Bump Effect to `4.0.0-beta.106` (from `4.0.0-beta.105`). Foldkit's peer dependencies now require `effect@4.0.0-beta.106` and `@effect/platform-browser@4.0.0-beta.106`.

  Pin your Effect packages to `4.0.0-beta.106` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.106 @effect/platform-browser@4.0.0-beta.106
  pnpm add -D @effect/vitest@4.0.0-beta.106
  ```

## 0.12.1

### Patch Changes

- 40ccffe: Bump Effect to `4.0.0-beta.105` (from `4.0.0-beta.103`). Foldkit's peer dependencies now require `effect@4.0.0-beta.105` and `@effect/platform-browser@4.0.0-beta.105`.

  Pin your Effect packages to `4.0.0-beta.105` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.105 @effect/platform-browser@4.0.0-beta.105
  pnpm add -D @effect/vitest@4.0.0-beta.105
  ```

## 0.12.0

### Minor Changes

- c9b3dd3: Let the Foldkit Vite plugin mount the installed DevTools overlay automatically. Development dependencies stay out of production builds, while a regular dependency makes `show: 'Always'` sufficient to include the overlay in production. Keep `@foldkit/devtools` in generated applications' development dependencies.

  Installing `@foldkit/devtools` is now the whole opt-in: an application that never configured `devTools` gets the overlay in development as soon as the package is present. Set `devTools: false` to turn DevTools off, or uninstall the package to drop the overlay alone.

  This removes `DevToolsConfig.overlay`, the `DevToolsOverlay` export from `foldkit/runtime`, and the bare `overlay` export from `@foldkit/devtools`. Remove the overlay import and configuration field when upgrading. The Vite plugin now owns that integration through `@foldkit/devtools/vite`.

  Upgrade `foldkit`, `@foldkit/vite-plugin`, and `@foldkit/devtools` together. The plugin injects the overlay only when the installed `@foldkit/devtools` exposes `@foldkit/devtools/vite`, so an older copy skips the overlay instead of failing the build. Thanks @artile for the report.

  ## Migration

  Drop the `overlay` import and the `overlay` field. The Vite plugin mounts the overlay whenever `@foldkit/devtools` is installed, so `devTools` now carries configuration alone.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      position: 'BottomLeft',
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      position: 'BottomLeft',
    },
  })
  ```

  An application whose only `devTools` field was `overlay` drops the object entirely and still gets the overlay in development.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: { overlay },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
  })
  ```

  Shipping the overlay in production keeps `show: 'Always'` and moves `@foldkit/devtools` from `devDependencies` to `dependencies`. Dependency placement is the build-time boundary, and `show` controls whether the runtime mounts it.

  ```ts
  // before
  import { overlay } from '@foldkit/devtools'

  const application = Runtime.makeApplication({
    // ...
    devTools: {
      overlay,
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })

  // after
  const application = Runtime.makeApplication({
    // ...
    devTools: {
      show: 'Always',
      mode: { development: 'TimeTravel', production: 'Inspect' },
    },
  })
  ```

  An application that imported `DevToolsOverlay` from `foldkit/runtime` to type its own wiring no longer needs the type.

### Patch Changes

- c947f47: Bump Effect to `4.0.0-beta.103` (from `4.0.0-beta.102`). Foldkit's peer dependencies now require `effect@4.0.0-beta.103` and `@effect/platform-browser@4.0.0-beta.103`.

  Pin your Effect packages to `4.0.0-beta.103` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.103 @effect/platform-browser@4.0.0-beta.103
  pnpm add -D @effect/vitest@4.0.0-beta.103
  ```

  `SchemaIssue.InvalidValue` dropped its `actual` argument in this Effect release and now takes annotations as its only argument. Decode failures for `CalendarDateFromIsoString` and `Url` are migrated to the new signature and carry their detail on the `message` annotation, which is the key the default formatter reads. Those two failures previously passed their detail as `description`, which the formatter ignored, so the messages now read as intended instead of falling back to a generic one. If you construct `SchemaIssue.InvalidValue` in your own schemas, drop the leading `Option` argument and move any detail to `message`.

## 0.11.3

### Patch Changes

- 1aa5a2d: Force-include `effect/Boolean` in the dep optimizer. Foldkit's compiled dist imports the `Boolean` namespace from bare `'effect'`, so a consumer that never names it in their own source got a prebundled `effect.js` without it and crashed at runtime in dev.

## 0.11.2

### Patch Changes

- d16d7f7: Bump Effect to `4.0.0-beta.102` (from `4.0.0-beta.101`). Foldkit's peer dependencies now require `effect@4.0.0-beta.102` and `@effect/platform-browser@4.0.0-beta.102`.

  Pin your Effect packages to `4.0.0-beta.102` to match this release. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.102 @effect/platform-browser@4.0.0-beta.102
  pnpm add -D @effect/vitest@4.0.0-beta.102
  ```

- 0a40d2d: Shut the DevTools MCP relay down when the Vite dev server closes in middleware mode, and keep it alive across a dev server restart. The plugin hung its shutdown off `server.httpServer`, which is null when Vite runs as middleware, so with `devToolsMcpPort` set the relay's WebSocket server stayed bound and held the process open. Under Vitest that showed up as a `close timed out after 10000ms` delay on every run. Restarting a dev server also used to kill the relay for the rest of the session, because Vite binds the replacement server's relay while the server it replaces still owns the port, and the resulting `EADDRINUSE` was reported as a conflict with another project. The relay now retries the bind for a few seconds so the port hands over, and a genuine conflict reports the same message once the retries are spent. Binding runs alongside the HMR bridge rather than ahead of it, so a contended port never delays model preservation. Connected MCP clients are terminated as part of shutdown, so no socket the relay opened outlives the server. The MCP server already reconnects on a dropped connection.

## 0.11.1

### Patch Changes

- 95118d8: Bump Effect to `4.0.0-beta.101` (from `4.0.0-beta.97`). Foldkit's peer dependencies now require `effect@4.0.0-beta.101` and `@effect/platform-browser@4.0.0-beta.101`.

  Pin your Effect packages to `4.0.0-beta.101` to match. While Effect v4 is in beta, pin the exact version rather than a range:

  ```sh
  pnpm add effect@4.0.0-beta.101 @effect/platform-browser@4.0.0-beta.101
  pnpm add -D @effect/vitest@4.0.0-beta.101
  ```

## 0.11.0

### Minor Changes

- 36ae509: Automatic branch identity through an owned differ and view-function branding.

  Foldkit now ships its own differ, forked from snabbdom 3.6.3, with two independent identity axes on every vnode. `key` keeps its one job, matching siblings in dynamic lists. A new framework-managed `identity` field joins the differ's compatibility check exactly where the selector is consulted: when the identity differs, the node is replaced instead of patched, so DOM state (focus, scroll, uncontrolled input values, an open `details` element) no longer bleeds across a logical identity change. Identity never enters the keyed index, and duplicate identities among siblings are harmless because the compatibility check only ever matches compatible vnodes. An explicit key does not override identity: two different view functions sharing a key replace, matching React, where a keyed element of a different component type remounts.

  The Vite plugin brands every function return in application modules with that function's id (module path plus function name) when the returned value is a vnode with no identity yet. Identity therefore attaches at view-function boundaries, where provenance exists at runtime, and never depends on branch syntax: if/else, switch, Effect Match, and ts-pattern all behave identically. Match arms written as inline handlers are covered too, because each handler is its own function. The remaining manual rules are the ones only your data can provide: key dynamic list items by a stable Model identifier, and extract a same-tag inline ternary into named view functions when you want an identity boundary, exactly as in React.

  Builds without the plugin keep the previous positional-plus-key semantics. `create-foldkit-app` ships the plugin by default. The `snabbdom` dependency is gone; the vendored fork lives inside foldkit with its functional changes documented, and a new dependency-free `foldkit/brand` entry hosts the branding helper the plugin injects.

  `@foldkit/ui` and `@foldkit/devtools` now brand their own compiled output at package build time, so their internals carry view-function identity even in consumer apps, where prebuilt dist loads from node_modules beyond the Vite transform's reach. The transform skips already-branded modules. With identity in place everywhere the plugin or the build step reaches, redundant manual branch keys are removed across ui, devtools, the examples, the website, typing-game, and the starter template; the keys that remain are data-borne list and instance keys, which stay yours to write.

  Upgrading an existing app: build with `@foldkit/vite-plugin` (every `create-foldkit-app` project already does; without the plugin everything keeps the previous positional-plus-key behavior, so upgrading is safe either way). Existing manual branch keys and the wrapper elements that exist only to carry them are now redundant and can be deleted whenever convenient. One behavior change to check: a shared key no longer makes two different view functions patch into each other at the same position; they replace, matching React's remount on a changed component type, so if you relied on that continuity, render both states through one view function. `foldkit()` now returns an array of plugins, which `plugins: [foldkit()]` already handles because Vite flattens nested plugin arrays.

  Two kinds of keys stay, and both carry a fact only your data knows. Mapped list items: rows built by one view function are identical to the differ, so key each by its id, `entries.map(entry => h.keyed('li')(entry.id, [], [...]))`, and reordering moves DOM instead of rewriting row contents. And the same situation stretched over time: a detail page renders every article through one `articlePageView(article)` call at the same position, so without a key navigating from one article to the next patches the old page's DOM, scroll position included, into the new one; key the root by what it is showing, `h.keyed('article')(article.slug, ...)`. The keying guide on the website shows both.

### Patch Changes

- 41057af: The view-identity transform no longer un-brands a consumer module whose own path merely contains the `packages/foldkit/` segment (a workspace named `foldkit`, or a vendored fork holding application code). When the installed foldkit package resolves, the plugin's precise package-root gate is authoritative and the coarse path fragment is left to the resolution-failed fallback, so such a module keeps its branch identity instead of silently losing it.

## 0.10.1

### Patch Changes

- 96167d1: Bump Effect to `4.0.0-beta.97` (from `4.0.0-beta.88`). Foldkit's peer dependencies now require `effect@4.0.0-beta.97` and `@effect/platform-browser@4.0.0-beta.97`.

  Consumers should align their Effect packages to `4.0.0-beta.97` exactly during the v4 beta window:

  ```
  pnpm add effect@4.0.0-beta.97 @effect/platform-browser@4.0.0-beta.97
  pnpm add -D @effect/vitest@4.0.0-beta.97
  ```

## 0.10.0

### Minor Changes

- 1795e0e: Bump Effect to `4.0.0-beta.88` (from `4.0.0-beta.83`). Foldkit's peer dependencies now require `effect@4.0.0-beta.88` and `@effect/platform-browser@4.0.0-beta.88`.

  Consumers should align their Effect packages to `4.0.0-beta.88` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.88 @effect/platform-browser@4.0.0-beta.88
  pnpm add -D @effect/vitest@4.0.0-beta.88
  ```

## 0.9.1

### Patch Changes

- 1457f17: Clarify the DevTools MCP port-in-use error by reminding users that changing `devToolsMcpPort` requires setting `FOLDKIT_DEVTOOLS_MCP_PORT` to the same value for the MCP server.

## 0.9.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 7487083: Bump the `ws` dependency from ^8.20.0 to ^8.21.0.

## 0.8.3

### Patch Changes

- 2eec70f: Dedupe `foldkit` and any installed `@foldkit/ui` / `@foldkit/devtools` to a
  single resolved copy via `resolve.dedupe`. Without this, a bundler can load
  `foldkit` more than once (its subpaths split across pre-bundled and source
  copies, or `@foldkit/ui` resolving its own copy). A duplicate instance gives
  foldkit's Schema and tagged-message constructors separate identities, so decode
  and tag matching fail across the boundary. The optional packages are deduped
  only when the consumer has installed them.

## 0.8.2

### Patch Changes

- 9b8d246: Relax the `vite` peer range to `^7.0.0 || ^8.0.0`. The plugin works with vite 7; the previous `^8.0.0` was stricter than necessary.

## 0.8.1

### Patch Changes

- 5a059e7: Sort imports so `@`-scoped packages land in a trailing group after unscoped
  third-party imports. Internal formatting only; no API or behavior change.

## 0.8.0

### Minor Changes

- 575b2ff: Bump Effect to `4.0.0-beta.78` (from `4.0.0-beta.66`). Foldkit's peer dependencies now require `effect@4.0.0-beta.78` and `@effect/platform-browser@4.0.0-beta.78`.

  beta.68 removed `Random.nextUUIDv4`, so the browser examples that generate UUIDs now use the platform-backed `Crypto` service's `randomUUIDv4`. Behavior is unchanged apart from UUIDs now coming from cryptographic platform randomness.

  Consumers should align their Effect packages to `4.0.0-beta.78` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.78 @effect/platform-browser@4.0.0-beta.78
  pnpm add -D @effect/vitest@4.0.0-beta.78
  ```

## 0.7.0

### Minor Changes

- f1d8c31: Republished against foldkit 0.102.0. No source change to the plugin itself, but foldkit's exact-pinned peer dependency means consumers must install matching versions. Pin foldkit and @foldkit/vite-plugin together: this version of @foldkit/vite-plugin expects foldkit 0.102.0 or later.

## 0.6.0

### Minor Changes

- f10dffc: Bump Effect to `4.0.0-beta.66` (from `4.0.0-beta.64`). Foldkit's peer dependencies now require `effect@4.0.0-beta.66` and `@effect/platform-browser@4.0.0-beta.66`.

  beta.66 tightened `Effect.gen`'s `Yieldable` constraint, so an internal call site in `ManagedResource.tag` that yielded a raw `Option` now bridges through `Effect.fromOption`. Behavior is unchanged.

  Consumers should align their Effect packages to `4.0.0-beta.66` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.66 @effect/platform-browser@4.0.0-beta.66
  pnpm add -D @effect/vitest@4.0.0-beta.66
  ```

## 0.5.2

### Patch Changes

- e81110d: Pre-bundle `effect/Scope` so dev mode does not crash on foldkit internals that reference `Scope.Scope` in Effect signatures.

## 0.5.1

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.5.0

### Minor Changes

- 61dc3fb: Drop Vite 7 from peer dependencies. The plugin now requires Vite ^8.0.0; consumers on Vite 7 must upgrade.

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
