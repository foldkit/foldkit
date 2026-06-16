# @foldkit/devtools-mcp

## 0.12.0

### Minor Changes

- fcc7a94: Bump Effect to `4.0.0-beta.83` (from `4.0.0-beta.78`). Foldkit's peer dependencies now require `effect@4.0.0-beta.83` and `@effect/platform-browser@4.0.0-beta.83`.

  Consumers should align their Effect packages to `4.0.0-beta.83` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.83 @effect/platform-browser@4.0.0-beta.83
  pnpm add -D @effect/vitest@4.0.0-beta.83
  ```

### Patch Changes

- 7487083: Bump the `ws` dependency from ^8.20.0 to ^8.21.0.

## 0.11.1

### Patch Changes

- 5a059e7: Sort imports so `@`-scoped packages land in a trailing group after unscoped
  third-party imports. Internal formatting only; no API or behavior change.

## 0.11.0

### Minor Changes

- 88a3b8b: Add Model-anchored history queries to the DevTools MCP server. `foldkit_list_messages` gains `changed_paths_match` (server-side filtering by changed Model paths, where patterns compare segment by segment for the length of the shorter side and `*` matches one segment) and `from_end` (read the latest entries without discovering the total count first). New `foldkit_count_messages_by_tag` returns a tag histogram with no payloads for cheap reconnaissance before paging detail. New `foldkit_diff_models` returns a path-level Model diff between two history indices, each side reported as `Present` with a summarized value or `Absent` when the path does not exist there. `foldkit_get_model_at`, `foldkit_diff_models`, and `foldkit_replay_to_keyframe` now reject indices the runtime cannot answer for, returning the readable bounds, instead of silently resolving the wrong Model from a fallback keyframe. Patterns not anchored at `root` are rejected with a clear error rather than silently matching nothing. The history diff now records removed record keys and truncated array elements as changed paths.

## 0.10.1

### Patch Changes

- 127e9f5: Update the README and CLI install instructions to reference `Runtime.makeApplication` instead of the renamed `Runtime.makeProgram`.

## 0.10.0

### Minor Changes

- 575b2ff: Bump Effect to `4.0.0-beta.78` (from `4.0.0-beta.66`). Foldkit's peer dependencies now require `effect@4.0.0-beta.78` and `@effect/platform-browser@4.0.0-beta.78`.

  beta.68 removed `Random.nextUUIDv4`, so the browser examples that generate UUIDs now use the platform-backed `Crypto` service's `randomUUIDv4`. Behavior is unchanged apart from UUIDs now coming from cryptographic platform randomness.

  Consumers should align their Effect packages to `4.0.0-beta.78` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.78 @effect/platform-browser@4.0.0-beta.78
  pnpm add -D @effect/vitest@4.0.0-beta.78
  ```

## 0.9.1

### Patch Changes

- 7b1286a: Update README documentation links to the new section-prefixed docs URLs.

## 0.9.0

### Minor Changes

- f1d8c31: Republished against foldkit 0.102.0. No source change to the MCP server itself, but foldkit's perf overhaul and Submodel boundary restructure (see foldkit changelog) reshape the runtime that devtools-mcp talks to over the DevTools protocol. Pin foldkit and @foldkit/devtools-mcp together: this version of devtools-mcp expects foldkit 0.102.0 or later.

## 0.8.1

### Patch Changes

- 52765a9: Refresh the README to match recent functionality: capability bullets now mention Mount lifecycle and `Message` Schema discovery, and the tools table reflects that `foldkit_get_init` returns init Mounts, that `foldkit_list_messages` entries carry Commands and Mounts with their declared args, and that `foldkit_get_model_at` cross-references init Commands and Mounts.

## 0.8.0

### Minor Changes

- 8cfa966: Add `foldkit_get_message_schema`, a new DevTools MCP tool that lets agents discover the exact shape of every Message variant the runtime accepts without reading the application source.

  The tool exposes the runtime's Message Schema as a JSON Schema document derived from `DevToolsConfig.Message` via `Schema.toJsonSchemaDocument`. Two call modes keep responses small even for production-scale Message unions:
  - **No argument** returns a flat variant index. Each entry carries the variant's `_tag`, its payload field names, and which payload fields are themselves tagged-union shapes the agent will need to pick a variant for.
  - **`variant_tag` as a dot-separated path** (e.g. `"GotMobileMenuDialogMessage.GotAnimationMessage"`) walks the path through each variant's single tagged-union payload field and returns the JSON Schema narrowed along the chain. Discriminated unions deeper than the path collapse to `{ "_summary": "union", "variants": [...] }` placeholders so the response stays compact at every depth. Agents extend the path to drill further.

  Submodel Messages recurse correctly. `S.Option` fields render as `anyOf` of the `Some` and `None` tag shapes; apps using the JSON-boundary codec `S.OptionFromNullishOr(T)` instead see the field as nullable `anyOf: [T, null]` and should dispatch the bare value or `null` rather than a tagged envelope. The `definitions` block is kept across narrowing so `$ref` targets still resolve, and any discriminated unions it carries (e.g. a shared union annotated with an `identifier`) are collapsed to the same `_summary` placeholder shape. The path walker does not resolve `$ref` indirection itself; agents that need to step through a shared union look it up in `definitions` by name and use the placeholder's variant list. Fields with no JSON representation, like `S.instanceOf(File)`, render as `{ type: 'null' }`; those variants can't be dispatched via MCP because their values live in browser memory. When the app hasn't configured a Message Schema, the response is `maybeResult: None`. The same fallback applies when the schema contains exotic AST nodes that `Schema.toJsonSchemaDocument` rejects at derivation time (symbol-keyed structs, symbol-indexed records, tuples with post-rest elements); the bridge guards the call so a failing schema logs a warning rather than crashing the bridge.

  No application changes required.

## 0.7.0

### Minor Changes

- f10dffc: Bump Effect to `4.0.0-beta.66` (from `4.0.0-beta.64`). Foldkit's peer dependencies now require `effect@4.0.0-beta.66` and `@effect/platform-browser@4.0.0-beta.66`.

  beta.66 tightened `Effect.gen`'s `Yieldable` constraint, so an internal call site in `ManagedResource.tag` that yielded a raw `Option` now bridges through `Effect.fromOption`. Behavior is unchanged.

  Consumers should align their Effect packages to `4.0.0-beta.66` exactly during the v4 beta window:

  ```bash
  pnpm add effect@4.0.0-beta.66 @effect/platform-browser@4.0.0-beta.66
  pnpm add -D @effect/vitest@4.0.0-beta.66
  ```

## 0.6.2

### Patch Changes

- 61026c8: Fix `foldkit_dispatch_message` arriving at the browser runtime as a JSON string. The tool's `message` input was typed as `S.Unknown`, which generates a JSON Schema entry with no `type` constraint. MCP hosts that consult the input schema (Claude Code, Cursor, etc.) default to stringifying arguments without a `type: "object"` hint, so the entire Message object was relayed through the bridge as a JSON-encoded string and rejected at the runtime decode step. Typing the field as `S.Record(S.String, S.Unknown)` keeps the runtime decode authoritative while emitting `type: "object"` for MCP clients.

## 0.6.1

### Patch Changes

- dbfb1ec: Bump Effect to `4.0.0-beta.64` (from `4.0.0-beta.59`) across the workspace, and replace the hand-rolled fallback cascade in `route/parser.ts:oneOf` with `Effect.firstSuccessOf`, which was reintroduced in beta.61 ([effect-smol#2120](https://github.com/Effect-TS/effect-smol/pull/2120)).

  Consumers should align their `effect`, `@effect/platform-browser`, `@effect/platform-node`, and `@effect/vitest` pins to `4.0.0-beta.64`.

  ```bash
  pnpm add effect@4.0.0-beta.64
  pnpm add -D @effect/platform-browser@4.0.0-beta.64 @effect/platform-node@4.0.0-beta.64 @effect/vitest@4.0.0-beta.64
  ```

  Behavior is unchanged. The `oneOf` route parser still tries each parser in order and returns the first success (or the last failure if all fail).

## 0.6.0

### Minor Changes

- 5eff785: Take Mount args as data in `Mount.define`.

  `Mount.define` is now a curried call. The first call binds the name and result Message schemas (and optionally an args Schema record); the second binds the factory, or a factory builder when args are declared. The returned Definition is callable to produce a `MountAction`: pass the declared args, or call with no args for argless Mounts.

  Each Mount instance carries its args as a field, and the runtime surfaces that field through:
  - **The DevTools Mounts tab**: each Mount renders as a tag at the top of its row with the declared args as a data tree below (chevrons for nested fields). Argless Mounts show only the name.
  - **The MCP wire protocol** consumed by `@foldkit/devtools-mcp`: `SerializedEntry.mountStartNames` / `mountEndNames` and `ResponseInit.mountStartNames` are replaced by `mountStarts` / `mountEnds: Array<{ name: string; args: Option<Record<string, unknown>> }>`.
  - **`Scene.Mount` matchers** (`expectHas`, `expectExact`, `expectEnded`, `resolve`, `resolveAll`): each now accepts either a Mount Definition (matches by name; existing lax behavior) or a Mount instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that some Mount with this identity is rendered; pass an instance when the test should verify the args the runtime captured.

  ```ts
  // Lax: matches any AnchorPopover, regardless of args
  Scene.Mount.expectHas(AnchorPopover)

  // Strict: only matches AnchorPopover({ buttonId: 'cart-button', anchor })
  Scene.Mount.expectHas(AnchorPopover({ buttonId: 'cart-button', anchor }))
  ```

  Failure messages now show the args the runtime captured alongside the args expected, so a wrong-args mismatch reads `AnchorPopover {"buttonId":"settings-button","anchor":{...}}` vs `AnchorPopover {"buttonId":"cart-button","anchor":{...}}` rather than just `AnchorPopover`.

  ## Migration

  ### Argless Mounts

  ```ts
  // Before
  const FocusInput = Mount.define('FocusInput', CompletedFocusInput)
  const focusInput = FocusInput(element =>
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) element.focus()
      return { message: CompletedFocusInput(), cleanup: Function.constVoid }
    }),
  )

  // At the call site:
  OnMount(focusInput)
  ```

  ```ts
  // After
  const FocusInput = Mount.define(
    'FocusInput',
    CompletedFocusInput,
  )(element =>
    Effect.sync(() => {
      if (element instanceof HTMLInputElement) element.focus()
      return { message: CompletedFocusInput(), cleanup: Function.constVoid }
    }),
  )

  // At the call site:
  OnMount(FocusInput())
  ```

  The camelCase factory (`focusInput`) goes away. The PascalCase Definition (`FocusInput`) is now the thing you call directly with `()`.

  ### Mounts that previously closed over values

  If your old Mount captured values via closure:

  ```ts
  // Before
  const AnchorPopover = Mount.define('AnchorPopover', CompletedAnchorPopover)
  const anchorPopover = (buttonId: string, anchor: AnchorConfig) =>
    AnchorPopover(element =>
      Effect.sync(() => {
        const cleanup = anchorSetup({ buttonId, anchor })(element)
        return { message: CompletedAnchorPopover(), cleanup }
      }),
    )

  // At the call site:
  OnMount(anchorPopover(buttonId, anchor))
  ```

  declare those values as Schema-typed args:

  ```ts
  // After
  const AnchorPopover = Mount.define(
    'AnchorPopover',
    { buttonId: S.String, anchor: AnchorConfig },
    CompletedAnchorPopover,
  )(
    ({ buttonId, anchor }) =>
      element =>
        Effect.sync(() => {
          const cleanup = anchorSetup({ buttonId, anchor })(element)
          return { message: CompletedAnchorPopover(), cleanup }
        }),
  )

  // At the call site:
  OnMount(AnchorPopover({ buttonId, anchor }))
  ```

  Only values that vary per render should become args. Module-level constants stay in lexical scope. The factory is two-stage when args are declared: the first stage receives the args record, the second receives the live `Element` handle.

  ### Submodel patterns

  `Mount.mapMessage` still preserves both name and args through wrapping, so threading a child module's Mount up to the parent Message continues to work unchanged at sites like:

  ```ts
  OnMount(Mount.mapMessage(FocusUsernameInput(), toParentMessage))
  ```

  ### `@foldkit/devtools-mcp` consumers

  The wire shape changed:

  ```diff
  - SerializedEntry.mountStartNames: Array<string>
  - SerializedEntry.mountEndNames: Array<string>
  + SerializedEntry.mountStarts: Array<{ name: string; args: Option<Record<string, unknown>> }>
  + SerializedEntry.mountEnds: Array<{ name: string; args: Option<Record<string, unknown>> }>
  - ResponseInit.mountStartNames: Array<string>
  + ResponseInit.mountStarts: Array<{ name: string; args: Option<Record<string, unknown>> }>
  ```

  Reading the previous string: pull `mount.name`. Reading the new args data: read `mount.args` as `Option<Record<string, unknown>>` (`None` for argless Mounts, `Some(record)` when args were declared).

  ### Tests

  Existing `Scene.Mount` calls keep working, since passing a Definition still matches by name (lax). To strengthen a test, pass a Mount instance instead of the Definition:

  ```ts
  // Lax (old, still works)
  Scene.Mount.expectHas(AnchorPopover)

  // Strict (new, locks in the args)
  Scene.Mount.expectHas(AnchorPopover({ buttonId: 'cart-button', anchor }))
  ```

  Use the strict form when the args carry meaning for the test's claim.

## 0.5.1

### Patch Changes

- 61dc3fb: Bump `ws` to `^8.20.0`.

## 0.5.0

### Minor Changes

- 24b09e2: Take Command args as data in `Command.define`.

  `Command.define` is now a curried call. The first call binds the name and result Message schemas (and optionally an args Schema record); the second binds the Effect, or an effect builder when args are declared. The returned Definition is callable to produce a Command instance: pass the declared args, or call with no args for argless Commands.

  Each Command instance carries its args as a field, and the runtime surfaces that field through:
  - **OpenTelemetry span attributes**: the args record is attached to the span wrapping the Command's Effect.
  - **The DevTools Commands tab**: each Command renders as a tag at the top of its row with the declared args as a data tree below (chevrons for nested fields). Argless Commands show only the name.
  - **The MCP wire protocol** consumed by `@foldkit/devtools-mcp`: `SerializedEntry.commandNames` and `ResponseInit.commandNames` are replaced by `commands: Array<{ name: string; args: Option<Record<string, unknown>> }>`.
  - **`Story.Command` / `Scene.Command` matchers** (`expectHas`, `expectExact`, `resolve`, `resolveAll`): each now accepts either a Command Definition (matches by name; existing lax behavior) or a Command instance (matches by name AND structural-equal args; new strict behavior). Pass a Definition when the test only cares that the Command was dispatched; pass an instance when the test should verify the args the runtime captured.

  ```ts
  // Lax: matches any FetchWeather, regardless of args
  Scene.Command.expectExact(FetchWeather)

  // Strict: only matches FetchWeather({ zipCode: '90210' })
  Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
  ```

  Failure messages now show the args dispatched alongside the args expected, so a wrong-args mismatch reads `FetchWeather {"zipCode":"99999"}` vs `FetchWeather {"zipCode":"90210"}` rather than just `FetchWeather`.

  ## Migration

  ### Argless Commands

  ```ts
  // Before
  const LockScroll = Command.define('LockScroll', CompletedLockScroll)
  const lockScroll = LockScroll(
    Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())),
  )

  // At the call site:
  return [model, [lockScroll]]
  ```

  ```ts
  // After
  const LockScroll = Command.define(
    'LockScroll',
    CompletedLockScroll,
  )(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))

  // At the call site:
  return [model, [LockScroll()]]
  ```

  The camelCase factory (`lockScroll`) goes away. The PascalCase Definition (`LockScroll`) is now the thing you call directly with `()`.

  ### Commands that previously closed over values

  If your old Command captured values via closure:

  ```ts
  // Before
  const FetchWeather = Command.define(
    'FetchWeather',
    SucceededFetchWeather,
    FailedFetchWeather,
  )
  const fetchWeather = (zipCode: string) =>
    FetchWeather(
      Effect.gen(function* () {
        // ...uses zipCode via closure...
      }),
    )

  // At the call site:
  return [model, [fetchWeather('90210')]]
  ```

  declare those values as Schema-typed args:

  ```ts
  // After
  const FetchWeather = Command.define(
    'FetchWeather',
    { zipCode: S.String },
    SucceededFetchWeather,
    FailedFetchWeather,
  )(({ zipCode }) =>
    Effect.gen(function* () {
      // ...uses zipCode from the destructured args...
    }),
  )

  // At the call site:
  return [model, [FetchWeather({ zipCode: '90210' })]]
  ```

  Only values that vary per dispatch should become args. Module-level constants stay in lexical scope. Runtime dependencies stay where they live: app-wide ones in `Resources`, model-driven ones in `ManagedResources`, anything else as a service tag on the Effect's context channel. The Effect pulls them all with `yield*`.

  ### Submodel patterns

  `Command.mapEffect` still preserves both name and args through wrapping, so Submodel chains via `Got*Message` continue to work unchanged. No edits needed at sites like:

  ```ts
  childCommands.map(
    Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
  )
  ```

  ### `@foldkit/devtools-mcp` consumers

  The wire shape changed:

  ```diff
  - SerializedEntry.commandNames: Array<string>
  + SerializedEntry.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
  - ResponseInit.commandNames: Array<string>
  + ResponseInit.commands: Array<{ name: string; args: Option<Record<string, unknown>> }>
  ```

  Reading the previous string: pull `command.name`. Reading the new args data: read `command.args` as `Option<Record<string, unknown>>` (`None` for argless Commands, `Some(record)` when args were declared).

  ### Tests

  Existing `Story.Command` / `Scene.Command` calls keep working, since passing a Definition still matches by name (lax). To strengthen a test, pass a Command instance instead of the Definition:

  ```ts
  // Lax (old, still works)
  Scene.Command.expectExact(FetchWeather)

  // Strict (new, locks in the args)
  Scene.Command.expectExact(FetchWeather({ zipCode: '90210' }))
  ```

  Use the strict form when the args carry meaning for the test's claim.

### Patch Changes

- Updated dependencies [24b09e2]
  - foldkit@0.88.0

## 0.4.0

### Minor Changes

- 7525227: Mount lifecycle is now surfaced in DevTools and Scene tests, and the Scene + Story test APIs are reorganised into per-kind namespaces.

  **Tests.** `Scene` tracks pending mounts walked from the rendered VNode tree and requires explicit acknowledgement before the scene finishes, mirroring how Commands are resolved. The Command and Mount steps are now grouped into `Scene.Command` and `Scene.Mount` namespaces (and `Story.Command` for Story tests):

  ```ts
  // Commands (was Scene.resolve / Story.resolve)
  Scene.Command.resolve(definition, resultMessage)
  Scene.Command.resolveAll(...resolvers)
  Scene.Command.expectHas(...definitions)
  Scene.Command.expectExact(...definitions)
  Scene.Command.expectNone()

  // Mounts (new)
  Scene.Mount.resolve(definition, resultMessage)
  Scene.Mount.resolveAll(...resolvers)
  Scene.Mount.expectHas(...definitions)
  Scene.Mount.expectExact(...definitions)
  Scene.Mount.expectNone()
  ```

  The previous flat API (`Scene.resolve`, `Scene.resolveAll`, `Scene.expectHasCommands`, `Scene.expectExactCommands`, `Scene.expectNoCommands`, and the parallel `Story.*` set) is removed. Two new subpath exports let test code import the namespaces directly:

  ```ts
  import { Command, Mount } from 'foldkit/scene'
  import { Command } from 'foldkit/story'
  ```

  (Story has no `Mount` namespace because Story tests do not render the view.)

  Mount tracking semantics: pending mounts persist across re-renders so resolving does not re-pend them. A mount that disappears from the tree is silently dropped to mirror real unmount semantics. Same-named mounts coexisting in the tree are disambiguated by an occurrence index, so two open instances of the same component don't collide.

  **DevTools.** A new `MountTracker` Context.Service is provided during render so the snabbdom `OnMount` insert/destroy hooks emit lifecycle events to the runtime synchronously. The runtime drains the buffer after each render and attaches the names to the history entry that caused the render. The DevTools overlay grows a new **Mounts** inspector tab listing the Mounts that fired and unmounted for the selected entry. Init-time mount activity attaches to the synthetic init entry.

  **Protocol** (breaking for any external DevTools wire-format consumer): `SerializedEntry` gains `mountStartNames` and `mountEndNames`; `ResponseInit` gains `mountStartNames`. The in-tree `@foldkit/devtools-mcp` is updated.

  **Component Mount exports.** UI components now export their Mount definitions so consumer Scene tests can acknowledge them: `PopoverAnchor`, `PopoverBackdropPortal`, `TooltipAnchor`, `MenuAnchor`, `MenuFocusItemsOnMount`, `MenuBackdropPortal`, `ListboxAnchor`, `ListboxFocusItemsOnMount`, `ListboxBackdropPortal`, `ComboboxAnchor`, `ComboboxAttachPreventBlur`, `ComboboxAttachSelectOnFocus`, `ComboboxBackdropPortal`. Existing Scene tests that render any of these components now need a corresponding `Scene.Mount.resolve` step.

### Patch Changes

- Updated dependencies [7525227]
  - foldkit@0.84.0

## 0.3.0

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
