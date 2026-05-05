# foldkit

## 0.82.4

### Patch Changes

- db20a61: Batch view renders to once per animation frame and yield to the browser between long Message bursts. The runtime now coalesces multiple Messages dispatched between frames into a single render and yields to the browser when message processing exceeds a frame budget. Keeps the UI responsive under high-rate inputs (drag, websocket bursts, recursive Commands).

  DevTools: lazy-cache the message list view so re-renders skip work when its inputs are unchanged.

## 0.82.3

### Patch Changes

- 4de27cf: Fix dispatch latency in apps using `devTools: { Message }` as history accumulates.

  `getModelAtIndex(latest)` runs on every dispatch while the inspector follows the latest entry. That call used to replay up to `KEYFRAME_INTERVAL` user updates from the most recent keyframe, calling the consumer's update function plus `deepFreeze` on every step. The cost scaled with both history depth and model size, so every dispatch got progressively slower.

  The store now stamps the post-update model into `StoreState.maybeLatestModel` on every `recordMessage`, and `resolveModel` returns it directly when the requested index is the latest entry. Time-travel still routes through `replayToIndex`.

- 76561ae: Sharpen README intro: lead with confidence over architecture friction instead of bug prevention.

## 0.82.2

### Patch Changes

- da300fb: Fix two DevTools regressions introduced by the Effect 4 migration.

  **1. Hang on every dispatch when Messages carry large payloads.**
  Effect 4 changed `Equal.equals` for plain objects from reference equality to
  structural equality (hash + record compare). `Schema.toEquivalence` falls back
  to `Equal.equals` for `S.Unknown`, so the DevTools overlay's
  `maybeInspectedModel` and `maybeInspectedMessage` fields (typed as
  `S.Option(S.Unknown)`) caused the runtime's per-dispatch `modelEquivalence`
  check to walk the entire user-app Message payload three times per dispatch
  (two hashes plus a record compare). With large payloads the cost manifested
  as a roughly one-second hang on every user interaction.

  The overlay now annotates those fields with reference-equality
  `toEquivalence`, which is the correct semantics for through-traffic snapshots,
  and disables `freezeModel` on the overlay's runtime so `deepFreeze` no longer
  walks the inspected payload either. Both changes are scoped to the overlay;
  user app runtimes are unaffected.

  **2. Arrays in the inspector tree rendered as `[object Object],[object Object],...`**
  Effect 4 narrowed `Predicate.isObject` to exclude arrays (v3 returned `true`
  for arrays; v4 returns `false`). The DevTools tree renderer's `isExpandable`
  check used `Predicate.isObject`, so array values were treated as leaves and
  fell through to `String(value)`. The renderer now uses
  `Predicate.isObjectOrArray`, which is Effect 4's spelling of v3's `isObject`
  behavior.

  **3. Slow tab switching in the inspector when the inspected Model is large.**
  Two compounding issues. First, the inspector's tab group did not pass
  `persistPanels`, so switching tabs unmounted the previous panel's DOM and
  re-mounted the next one from scratch — for a large Model with expanded array
  branches, this meant tearing down and rebuilding thousands of DOM rows per
  tab switch. Second, even with persisted panels, every overlay re-render
  re-invoked each tab's panel-content function, which for the Model tab meant
  a fresh `flattenTree` walk over the full inspected snapshot. The inspector
  now passes `persistPanels: true` (avoiding DOM thrash) and wraps each tab's
  content in `createKeyedLazy` keyed on its actual dependencies (avoiding
  recomputation when those dependencies are reference-equal across renders).

  **4. Slow tree expansion when many sibling rows are visible.**
  `toInspectableValue` (the transform that converts DOM-class instances like
  File / Blob / Date / URL into plain objects for tree rendering) recursed
  through arrays and records via `Array_.map` / `Record.map`, which allocate
  fresh wrappers even when the contents are identical. Every render of the
  inspector tree therefore produced a brand-new tree of references, defeating
  the row-level `lazyTreeNode` cache: each row's `node.value` was a fresh
  reference per render, so `argsEqual` failed on every row and every visible
  row's vnode was rebuilt on every expansion. `toInspectableValue` is now
  memoized by input reference via `WeakMap`, so identical snapshot references
  return identical transformed references and the row lazy actually hits.

- da300fb: Fix `Ui.Disclosure` `persistPanel: true` panel rendering when closed if consumer styles set `display:` on the panel.

  The Disclosure component marked the closed persisted panel with the HTML
  `hidden` attribute, relying on the user-agent stylesheet's `[hidden] {
display: none }` rule. Author CSS like Tailwind's `flex` utility class beats
  the user-agent rule on specificity, so the closed panel could render
  visibly. The Disclosure component now applies inline `display: none` to the
  closed persisted panel in addition to the `hidden` attribute, matching the
  treatment that `Ui.Tabs` received.

- da300fb: Fix `Ui.Tabs` `persistPanels: true` rendering all panels simultaneously when consumer styles set `display:` on the panel.

  The Tabs component marked inactive persisted panels with the HTML `hidden`
  attribute, relying on the user-agent stylesheet's `[hidden] { display: none }`
  rule. Author CSS like Tailwind's `flex` utility class beats the user-agent
  rule on specificity, so all persisted panels rendered at once and stacked
  vertically. The Tabs component now applies inline `display: none` to inactive
  persisted panels in addition to the `hidden` attribute, which beats any
  class-based `display` declaration regardless of consumer CSS.

## 0.82.1

### Patch Changes

- e385643: Bump `happy-dom` devDependency to `^20.0.0` to clear CVE-2025-61927 (VM context escape). Internal test setup only; no impact on installed runtime or types.
- 7b8078a: Fix HMR cold-start spurious "no plugin response" warning. On a fresh page load, `@foldkit/vite-plugin` sends `foldkit:restore-model { id, model: undefined }` to mean "no preserved model." Vite serializes the WS payload via `JSON.stringify`, which drops keys whose value is `undefined`, so the wire became `{"id":"app"}`. The runtime's `RestoreModelMessage` schema declared `model` as a required `Schema.Unknown`, the decode failed, the failure was swallowed, and the runtime hit the 500ms timeout, printing a misleading warning that the plugin wasn't installed. `RestoreModelMessage.model` is now `Schema.optional(Schema.Unknown)`, so the absent key round-trips cleanly.

  Also corrects the warning text itself. When the plugin really is missing, it now references the correct package (`@foldkit/vite-plugin`) and named import (`import { foldkit } from '@foldkit/vite-plugin'`).

## 0.82.0

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

- 60283c8: Refresh package tagline and README intro.
- 98519e1: Fix the install command in the READMEs. `create-foldkit-app` doesn't accept a `--wizard` flag — running with no flags drops into the interactive prompts. `--name`, `--example`, and `--package-manager` remain available as escape hatches that skip the matching prompts.

## 0.81.1

### Patch Changes

- 21a6d30: README: mention Mount alongside Commands, Subscriptions, and ManagedResources, and link the new Map example.

## 0.81.0

### Minor Changes

- 23eb474: Rename misleading Messages in `Ui.Combobox`, `Ui.Listbox`, `Ui.Menu`, and `Ui.Popover` so each name describes what its dispatch site actually observes. All four components emitted `ClosedByTab` from an `OnBlur` handler, which fires for any blur cause (Tab key, outside click, programmatic blur, focus shift). The "ByTab" suffix invented a trigger the handler cannot verify.

  **Breaking.**
  - `Combobox.ClosedByTab` → `Combobox.BlurredInput`
  - `Listbox.ClosedByTab` → `Listbox.BlurredItems`
  - `Menu.ClosedByTab` → `Menu.BlurredItems`
  - `Popover.ClosedByTab` → `Popover.BlurredPanel`

  Update any code that constructed or pattern-matched on the old names. Behavior is unchanged.

- 572baa0: Simplify the `freezeModel` runtime config to `boolean`. The wrapper object and `'Always'` mode have been removed.

  Migration:
  - `freezeModel: { show: 'Development' }` → omit, or `freezeModel: true`
  - `freezeModel: { show: 'Always' }` → no direct replacement; freezing now only runs when Vite HMR is active.
  - `freezeModel: false` → unchanged.

- 1ae56a5: Replace `OnInsert`, `OnInsertEffect`, and `OnDestroy` with a single `OnMount` attribute backed by the new `Mount` module. The `Mount.define` constructor names a mount-time action and constrains the Messages it can dispatch; the wrapped Effect resolves to `{ message, cleanup }`, and the runtime invokes the cleanup automatically when the element unmounts. Cleanup runs immediately if the Effect resolves after the element has already been removed.

  Migration:

  ```ts
  // Before
  import { Function } from 'effect'
  const { OnInsertEffect, OnDestroy } = html<Message>()

  const view = div(
    [
      OnInsertEffect(element => attachWidget(element)),
      OnDestroy(element => detachWidget(element)),
    ],
    [],
  )

  // After
  import { Mount } from 'foldkit'
  import type { MountResult } from 'foldkit/html'

  const MountWidget = Mount.define('MountWidget', CompletedMountWidget)
  const mountWidget = MountWidget(
    (element): Effect.Effect<MountResult<Message>> =>
      Effect.sync(() => ({
        message: CompletedMountWidget(),
        cleanup: () => detachWidget(element),
      })),
  )

  const { OnMount } = html<Message>()
  const view = div([OnMount(mountWidget)], [])
  ```

  For setup that has no cleanup, pass `Function.constVoid`. `Mount.mapMessage` lifts a `MountAction` into a parent's Message universe, mirroring `Command.mapEffect` for the Submodel pattern.

  `Ui.Popover`, `Ui.Listbox`, `Ui.Menu`, `Ui.Tooltip`, and `Ui.Combobox` now expose new lifecycle Messages (`CompletedAnchorMount`, plus `CompletedFocusItemsOnMount` for Listbox and Menu, and `CompletedAttachPreventBlur` / `CompletedAttachSelectOnFocus` for Combobox) that widen the `onAction` callback's Message union. Consumers that pattern-match `onAction` exhaustively need to handle the new variants; consumers that route through `Foo.update(model, message)` are unaffected. The internal `anchorHooks` helper is now `anchorSetup`, which returns its cleanup directly.

## 0.80.0

### Minor Changes

- 5dff4f7: `Ui.Calendar` gains fast navigation for distant dates. The heading is now a button — clicking it switches the calendar to a 3×4 months grid, and clicking the year heading from there switches to a paged 3×4 years grid. Selecting a year drills back to the months grid for that year; selecting a month drills back to the days grid for that month. Prev/next arrows in the years grid page through 12-year windows. Reaching a target year/month now takes 2-3 clicks instead of 60-200 prev-month presses.

  The calendar's `Model` gains a `viewMode: 'Days' | 'Months' | 'Years'` field. New messages: `ClickedHeading`, `SelectedMonth`, `SelectedYear`, `PagedYears`. Keyboard navigation works in all three modes — arrows move within the grid, Enter/Space commits, PageUp/PageDown pages the years window. Escape passes through to outer handlers (in popovered DatePicker contexts, the popover closes on Escape, matching Apple Calendar / Material / shadcn behavior). Selecting a month or year is the way to drill back to the day grid. Standalone consumers that need their own back-out gesture can call the new `Calendar.dropToDays(model)` helper to return any picker mode to Days programmatically.

  **Breaking.** `CalendarAttributes` is now a discriminated union — pattern-match on `_tag` (`'Days' | 'Months' | 'Years'`) with `M.tagsExhaustive` to render each grid. We chose this shape over a "Calendar self-renders months/years grids" approach because each grid has different ARIA semantics, cell shapes, and button handlers; modeling that as a single optional-fields shape would be messy, and the discriminated union matches conventions used elsewhere in foldkit (routes, models, messages). The Days variant keeps the existing fields (`previousMonthButton`, `nextMonthButton`, `headerRow`, `columnHeaders`, `weeks`) plus a new `headingButton` for the click-to-drill heading. The Months variant exposes `cells: ReadonlyArray<MonthCell>` — each cell carries both `label` (full month name) and `shortLabel` (locale-aware abbreviation). The Years variant exposes `cells: ReadonlyArray<YearCell>` plus `previousPageButton` / `nextPageButton`.

  **Removed.** `monthSelect`, `monthOptions`, `yearSelect`, `yearOptions` from `CalendarAttributes`; `SelectedMonthFromDropdown` and `SelectedYearFromDropdown` messages; `monthSelectLabel` and `yearSelectLabel` from `ViewConfig`. These attribute groups were exposed for consumers who wanted a `<select>`-based month/year jumper alongside the prev/next-month buttons, but no consumer in this repo rendered them. The heading-drill flow is the canonical way to jump months and years now, matching Apple Calendar, Material Design, and shadcn DatePicker.

  `Ui.DatePicker` requires no API changes — it composes `Calendar.view` and forwards the new `toCalendarView` shape. Existing DatePicker consumers must update their `toCalendarView` callback to pattern-match on `_tag`. DatePicker also now resets the embedded calendar to Days mode on every open and close, so users always see the day grid when reopening the picker (matching Apple Calendar / Material / shadcn behavior).

## 0.79.0

### Minor Changes

- 7db20d8: `Ui.VirtualList` now supports variable row heights. Pass an optional `itemToRowHeightPx: (item, index) => number` callback on `ViewConfig` and the component sizes each row from the callback and walks cumulative heights to compute the visible slice and spacers. The uniform path is unchanged: omit `itemToRowHeightPx` to keep using `model.rowHeightPx` everywhere.

  Two new exports support programmatic scrolling and slice queries on a variable-height list: `scrollToIndexVariable(model, items, itemToRowHeightPx, index)` mirrors `scrollToIndex` for the variable case, and `visibleWindowVariable(model, items, itemToRowHeightPx, overscan)` mirrors `visibleWindow`. Use the variable functions when rendering with `itemToRowHeightPx`; the uniform functions still apply when rows share a height.

  Variable-height math is O(N) per render, walking `items` once to build a prefix sum. Lists in the 10k-row range fit comfortably inside a 60Hz scroll budget. Prefer the uniform path when row heights are stable.

  Note: restoring `initialScrollTop` on the first measurement of a variable-height list falls back to uniform-height math (using `model.rowHeightPx`) because items aren't reachable from `update`. Call `scrollToIndexVariable` after the first `MeasuredContainer` arrives for an accurate initial scroll on a variable-height list.

## 0.78.0

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

## 0.77.0

### Minor Changes

- 9c59ada: `view` now returns a `Document` instead of `Html`, and the `title` callback on `makeProgram` is gone.

  A `Document` is `{ title, body, canonical?, ogUrl? }`. The runtime applies all four on every render: `document.title` is set from `title`, `<link rel="canonical">` and `<meta property="og:url">` are upserted from `canonical` and `ogUrl` (creating the tags if they're not already in the document head), and `body` is patched into the application container as before. When `canonical` is omitted it defaults to the current URL (origin + pathname + search); when `ogUrl` is omitted it falls back to `canonical`.

  This fixes a bug where Safari's system Share menu would copy the URL the page was originally loaded from rather than the page the user navigated to. `<link rel="canonical">` was static, and Safari reads canonical first when copying a link.

  Migrating an existing app:

  ```ts
  // Before
  import { Html } from 'foldkit/html'

  const view = (model: Model): Html => div([], [...])

  Runtime.makeProgram({
    view,
    title: (model) => `Page ${model.page}`,
    // ...
  })

  // After
  import { Document } from 'foldkit/html'

  const view = (model: Model): Document => ({
    title: `Page ${model.page}`,
    body: div([], [...]),
  })

  Runtime.makeProgram({
    view,
    // title field removed
  })
  ```

  `crash.view` follows the same shape and now returns a `Document` too.

- bbe2a03: Stop publishing the runtime's Message Schema as JSON Schema in the DevTools wire protocol. `RuntimeInfo.maybeMessageSchema` is removed; agents discover Message shape by reading the application's source instead. Dispatch still works the same: the runtime decodes the payload against the live `Message` Schema and returns a clean error on mismatch. Only the upfront introspection hint is gone.

  This avoids a class of `JSONSchema.make` failures triggered by schema constructs like `OptionFromSelf`, `instanceOf`, and other shapes without a default JSON Schema. Foldkit's UI components and `Url` use those constructs internally, so any app wrapping them via the Submodel pattern was either crashing or losing dispatch validation. The simpler protocol sidesteps the whole annotation grind.

  The `Url` and `File.File` JSON Schema annotations added in the unreleased work, and the bridge's `Either.try` safety net around `JSONSchema.make`, are removed in the same change since their only purpose was to make the JSON Schema generation succeed.

## 0.76.1

### Patch Changes

- c5d56cb: Clarify the "DevTools MCP" README bullet to say agents rewind the UI to any past Model, instead of the vaguer "replay to any past state."

## 0.76.0

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

## 0.75.1

### Patch Changes

- ae4fa75: Inject `aria-setsize` (total item count) and `aria-posinset` (1-based logical position) on every rendered `Ui.VirtualList` row, so screen readers announce "row N of total" for the full logical list size, not the smaller count of currently mounted rows.

  Closes the screen-reader gap inherent to virtualization: with only ~10-30 rows in the DOM at any time, the implicit set size from `<li>` children of `<ul>` would otherwise tell assistive tech the list has 12 items even when the real list has 10,000. No consumer wiring required.

  Each row also carries `role="listitem"` explicitly so the list-item semantics survive a `rowElement` override (e.g. consumer passing `rowElement: 'div'`).

## 0.75.0

### Minor Changes

- dddd920: Add `Ui.VirtualList` component. A virtualization primitive for large lists (10k+ rows). Only items inside the viewport plus an overscan buffer are mounted; spacer divs above and below the visible slice keep the scrollbar's apparent total height correct.

  The component owns scroll position, container measurement, and any in-flight programmatic scroll. Items live in the consumer's Model and pass through `ViewConfig.items` on each render, so consumers can swap, filter, sort, or paginate the underlying array freely without sending Messages to the list.

  ```ts
  import * as Ui from 'foldkit/ui'

  const Model = S.Struct({
    list: Ui.VirtualList.Model,
    todos: S.Array(Todo),
  })

  // init: { ..., list: Ui.VirtualList.init({ id: 'todos', rowHeightPx: 40 }) }

  // update GotListMessage: dispatch to Ui.VirtualList.update

  // view:
  Ui.VirtualList.view({
    model: model.list,
    items: model.todos,
    itemToKey: todo => todo.id,
    itemToView: todo => Todo.view(todo),
    className: 'h-96 border rounded',
  })
  ```

  The container element needs a constrained height (via `className` or `attributes`) for virtualization to work. Without it, the container grows to fit children and never scrolls. The component sets only `overflow: auto` inline; pass `overscroll-behavior` (or any other styling) through your `className` or `attributes` if the default browser behavior isn't what you want.

  `Ui.VirtualList.scrollToIndex(model, 500)` returns `[Model, Commands]` for programmatic scrolling. Stale completions are version-cancelled, so rapid successive calls don't fight each other. If `initialScrollTop` is non-zero on `init`, the same Command path applies it the first time the container is measured, so consumers don't need a separate kick.

## 0.74.1

### Patch Changes

- 4b0a552: Adopt TypeScript 6.0 for internal tooling and migrate to Node-native ESM emit. Foldkit, `@foldkit/vite-plugin`, and `create-foldkit-app` now build and typecheck against TypeScript 6.0.2. Foldkit's internal tsconfigs moved from the deprecated `node10` resolution to `NodeNext`, and every relative import inside `packages/foldkit/src` now carries an explicit `.js` suffix. The emitted `dist/` is unchanged in shape but is now directly loadable by Node's ESM resolver — a prerequisite for future terminal/Node runtime support. Published type surfaces are unchanged; downstream projects on TypeScript 5.9+ continue to work.

## 0.74.0

### Minor Changes

- e8df674: Add `freezeModel` runtime config. Foldkit now deep-freezes the Model in development by default, so accidental mutations (e.g. `model.items.push(...)`) throw a `TypeError` at the exact write site with a clear stack trace, instead of silently corrupting state or breaking reference-equality change detection.

  Freezing is scoped to plain objects and arrays. Effect-tagged values (`Option`, `Either`, `DateTime`, `HashSet`, `HashMap`, etc.), `Date`, `Map`, `Set`, and class instances are left untouched because they rely on lazy instance writes for hash memoization. Nested payloads inside an `Option.some` are still frozen.

  Config shape mirrors `devtools` and `slowView`:

  ```ts
  makeProgram({
    // ...
    freezeModel: { show: 'Development' }, // default
    // freezeModel: { show: 'Always' },   // enforce in production too
    // freezeModel: false,                // disable entirely
  })
  ```

  Production builds pay nothing for this feature unless `show: 'Always'` is set.

## 0.73.0

### Minor Changes

- df6a718: Add `Ui.Slider` — a headless numeric range slider for values on a continuous or stepped scale. Follows the WAI-ARIA slider pattern with `role="slider"` on the thumb and keyboard navigation by step (ArrowUp/ArrowDown/ArrowLeft/ArrowRight), larger jumps (PageUp/PageDown), and boundary jumps (Home/End). Pointer drag uses document-level `pointermove` / `pointerup` tracking so the cursor can leave the slider element during a drag; Escape cancels an in-progress drag and restores the pre-drag value.

  ```ts
  Ui.Slider.view({
    model: model.ratingSlider,
    toParentMessage: message => GotSliderMessage({ message }),
    formatValue: value => `${String(value)} of 10`,
    toView: attributes =>
      div(
        [],
        [
          label([...attributes.label], ['Rating']),
          div(
            [...attributes.root],
            [
              div(
                [...attributes.track],
                [div([...attributes.filledTrack], [])],
              ),
              div([...attributes.thumb], []),
            ],
          ),
        ],
      ),
  })
  ```

  Notable design choices:
  - **Min, max, and step live in the Model.** Stored at init time, the update function can compute the next value on every keyboard / pointer event without accessing config. This also lets the drag subscription translate cursor position into a snapped value in a single place.
  - **State is a discriminated union, not a boolean.** `Idle` and `Dragging({ originValue })` replace `isDragging: Boolean` so the pre-drag value is always available for Escape-to-cancel, and impossible states like "not dragging but with an originValue" are unrepresentable.
  - **Thumb and track press are separate Messages.** `PressedThumb` starts a drag without changing the value; `PressedPointer` snaps the value to the cursor and starts a drag, but is a no-op while already `Dragging`. This absorbs the pointerdown bubble from thumb → track so fine-grained sliders (e.g. `step: 0.05`) don't visibly shift when the user clicks the thumb off-center.
  - **Fractional steps snap to the step's decimal precision.** A slider with `step: 0.1` produces clean values (0.1, 0.2, 0.3) instead of floating-point drift (0.30000000000000004). Precision is derived from the step literal via `toString()`.
  - **Subscriptions are exposed, not hidden.** The consumer wires `Ui.Slider.subscriptions.documentPointer` and `documentEscape` through their own `subscriptions`, mirroring the approach used by `Ui.DragAndDrop`. This keeps all document-level listeners visible at the top of the program.
  - **Accessibility.** Thumb is `role="slider"` with `aria-valuemin` / `aria-valuemax` / `aria-valuenow` / `aria-orientation`. When `formatValue` is provided, the formatted string is announced via `aria-valuetext`. By default the thumb is labeled via `aria-labelledby` pointing at the id carried on the `label` attribute group; consumers can override with explicit `ariaLabel` or `ariaLabelledBy`.
  - **OutMessage `ChangedValue`.** Emitted whenever the value actually changes — not on no-op keyboard events at the min/max boundary, and not on `ReleasedDragPointer` (the value was already committed during the drag).

  Also extends `OnPointerDown` with `clientX` / `clientY` so click-to-jump on the track can compute a value from the cursor position without re-reading the pointer event from the DOM. The two new parameters are appended after `timeStamp`, so existing 5-argument callers (Menu, Listbox, DragAndDrop, etc.) continue to work unchanged.

  Horizontal orientation only in v1; range (two-thumb) sliders and tick marks are planned follow-ups.

## 0.72.0

### Minor Changes

- 4b07852: **Breaking**: Renamed `Ui.Transition` to `Ui.Animation` and expanded the contract to cover both CSS transitions and CSS keyframe animations.

  The lifecycle coordinator previously filtered `element.getAnimations()` down to `CSSTransition` instances, so consumers styling enter/leave with `@keyframes` got no completion signal and the state machine hung in `LeaveAnimating` forever. `Task.waitForAnimationSettled` now resolves once every animation on the element has settled (CSS transitions and CSS keyframe animations alike).

  Migration:
  - `Ui.Transition` → `Ui.Animation`
  - `Task.waitForTransitions` → `Task.waitForAnimationSettled`
  - `EndedTransition` Message → `EndedAnimation`
  - `WaitForTransitions` Command → `WaitForAnimationSettled`
  - `AdvancedTransitionFrame` Message → `AdvancedAnimationFrame`
  - Consumer submodel field `transition: Transition.Model` → `animation: Animation.Model`
  - Consumer wrapper Message `GotTransitionMessage` → `GotAnimationMessage`
  - Consumer racing Command `DetectMovementOrTransitionEnd` → `DetectMovementOrAnimationEnd`
  - `./ui/transition` package export path → `./ui/animation`

  State-machine names stay (they describe lifecycle phases, not CSS mechanisms): `TransitionState`, `transitionState`, `TransitionedOut`, and the `data-enter` / `data-leave` / `data-transition` / `data-closed` attributes.

  Leave animations must be finite. `animation-iteration-count: infinite` never fires `animationend` and will hang the state machine in `LeaveAnimating`.

  This also surfaces as a migration concern for existing consumers. A consumer whose animated element carried an unrelated infinite CSS keyframe animation (a spinner, a pulse, etc.) previously worked because only `CSSTransition` instances were awaited on leave. With the broadened contract, the infinite animation is now included in the settlement check. Either make the animation finite or move it to a descendant element so it isn't the animated target itself.

## 0.71.0

### Minor Changes

- 6a4e4a2: Add `Ui.Toast` — a headless stack of transient notifications anchored to a corner of the viewport, parameterized on a user-provided payload schema. Each entry runs its own enter/leave animation via a `Transition.Model` submodel and its own auto-dismiss timer, with pause-on-hover. One container lives at the app root; entries are added dynamically via `Toast.show(model, input)`.

  The component owns only lifecycle and a11y fields — id, variant (drives ARIA role), transition, dismiss timer, hover state. **Content is entirely the consumer's concern:** bind a Toast module to your own payload schema via `Ui.Toast.make(PayloadSchema)`, and the resulting Model, Message, `show`, `view`, and `renderEntry` callback are all typed to your shape.

  ```ts
  const ToastPayload = S.Struct({
    bodyText: S.String,
    maybeLink: S.OptionFromSelf(S.Struct({ href: S.String, text: S.String })),
  })
  export const Toast = Ui.Toast.make(ToastPayload)

  // ...

  Toast.show(model.toast, {
    variant: 'Success',
    payload: {
      bodyText: 'Order shipped',
      maybeLink: Option.some({ href: '/order/abc', text: 'Track' }),
    },
  })
  ```

  Notable design choices:
  - **Parameterized on payload, opinionated only on a11y.** The component reads `variant` (to pick `role="status"` vs `role="alert"`) and the lifecycle fields it owns. It never reads payload. Anything text-level, link-level, interactive, or visual is in the consumer's payload schema and rendered by their `renderEntry`.
  - **Dynamic children.** Toast's Model holds a runtime-varying list of submodel-like entries. Entry IDs come from a monotonic `nextEntryKey` counter in Model, keeping the system fully reproducible without a side-effecting Command.
  - **Headless `renderEntry(entry, handlers)`.** Each entry is wrapped in an `<li>` by the component (with role, hover lifecycle, and transition data attributes); consumers render the inner content and wire `handlers.dismiss` to their close button.
  - **Cancellable auto-dismiss.** Each entry carries `pendingDismissVersion`; hover and manual dismiss bump the version so stale `ElapsedDuration` messages are discarded when they fire. `LeftEntry` reschedules with the fresh version.
  - **Six positions** (TopLeft, TopCenter, TopRight, BottomLeft, BottomCenter, BottomRight) stack toward the anchored edge via CSS flex direction — newest closest to the edge, no manual ordering required. `position` is a `view` prop rather than a Model field, so it can vary per render.
  - **Accessibility.** Container is `role="region"` with `aria-live="polite"`, always mounted so screen readers observe the live region from page load. Entries get `role="status"` for Info/Success and `role="alert"` for Warning/Error.
  - **Focus-based pause deferred.** Foldkit's OnFocus/OnBlur use non-bubbling events, so pausing while a focusable child has focus is not yet supported. Toasts pause on pointer hover only; keyboard users can dismiss manually. Tracked in FOL-202 / FOL-203.

## 0.70.0

### Minor Changes

- 5d8c2db: Add `Ui.Tooltip` — a headless tooltip primitive that opens on hover (after a configurable delay) or keyboard focus, and closes on pointer-leave, blur, Escape, or left-click of the trigger. Reuses the anchor positioning engine shared with `Popover` and `Menu`. Non-interactive panel with `role="tooltip"` and `aria-describedby` on the trigger.

  Notable design choices:
  - `showDelay` accepts any `Duration.DurationInput` (e.g. `300`, `Duration.millis(400)`, `Duration.seconds(1)`). Default is `Duration.millis(500)`.
  - Mouse-click-induced focus does not auto-open; focus from keyboard, touch, or pen does. Mouse-click focus is disambiguated via a recorded pointer type that gets consumed on the next focus event.
  - Left-click on an open tooltip dismisses it — the user is clicking the button for its action, not to keep the tooltip visible. The dismissal sets `isDismissed`, blocking re-opening until the user disengages (leaves or blurs). Same flag handles Escape dismissal.
  - Hover and focus state are preserved truthfully during the dismissed window; the tooltip doesn't lie about its model.
  - `Tooltip.setShowDelay(model, duration)` lets parents adjust the delay at runtime (e.g. for user preferences or reduced-motion settings). Also available as the `ChangedShowDelay` message for direct Submodel delegation.

## 0.69.0

### Minor Changes

- 51f00a1: Add `OnInsertEffect` attribute for Effect-based DOM lifecycle hooks. The callback runs when the element is inserted and returns an `Effect<Message>` that the runtime executes, dispatching the resulting message. This lets consumers integrate third-party DOM libraries (editors, embeds, charts) declaratively — failure handling stays in the Model via Messages instead of imperative DOM mutation. Pairs with the existing `OnInsert` for cases that don't need to produce a Message.

## 0.68.0

### Minor Changes

- 069609e: Add `openUrl(href)` to `foldkit/navigation` — opens a URL in a new browsing context (tab or window, at the browser's discretion) without leaving the current page. Parallels `load(href)` for cases where you want to dispatch an external URL as a Command without navigating away.

## 0.67.0

### Minor Changes

- 6715dc5: Add `isInvalid` and `anyInvalid` tag-only predicates to `FieldValidation`.

  `isInvalid(state)` returns `true` when the state's tag is `Invalid`. Unlike
  `!isValid(rules)(state)`, it does not treat `NotValidated` or `Validating` as
  errors — it's a tag-only predicate that answers "has the user seen a rule
  failure on this field?"

  `anyInvalid(states)` returns `true` when any state in the input has tag
  `Invalid`. Use for "this step/section has errors" affordances, independent
  of rules.

  Together these fill out the state-only quadrant alongside the existing
  rules-aware `isValid(rules)(state)` and `allValid(pairs)`:

  ```ts
  // Rules-aware (needs rules): "is this state acceptable?"
  isValid(rules)(state)
  allValid([[state, rules], ...])

  // Tag-only (no rules): "has the state hit Invalid?"
  isInvalid(state)
  anyInvalid([state, ...])
  ```

  Useful for view-side affordances like red-dot step indicators or border
  colors, where the question is about the state's tag rather than whether
  the rules are currently satisfied.

## 0.66.0

### Minor Changes

- 44cafe3: Redesign `FieldValidation` around a single string-typed field abstraction.

  The module is scoped to form-field edit state: the lifecycle of a value as a
  user types into an input. For validating static data, use Effect Schema
  directly.
  - `makeField(schema, options)` → `makeRules(options)`. The descriptor no longer
    takes a schema; every field has `value: string`. Required-ness is a
    `makeRules` option (`required: message`), not a rule in the list.
  - The four-state union is now exported as `Field` at module level, shared
    across every field. Use `Field` as the type in your Model.
  - State constructors (`NotValidated`, `Validating`, `Valid`, `Invalid`) are
    exported at module level too. Use them to construct states directly
    (e.g. in async validation Commands and initial Model values).
  - Validations (`[predicate, errorMessage]` tuples) are now called `Rule`.
    The array field on `makeRules` options is `rules`, not `validations`.
  - Two new helpers: `isRequired(rules)` for view affordances like rendering a
    `*` on required field labels, and `allValid(pairs)` for form-level submit
    gates that fold across a list of `(state, rules)` pairs.
  - Number validators (`min`, `max`, `between`, `positive`, `nonNegative`,
    `integer`) have been removed. They couldn't be used with the string-only
    `Field`. If you need to validate a number parsed from input, write a custom
    `Rule` that does the parse and the check together.

  ```ts
  import {
    Field,
    Invalid,
    NotValidated,
    Valid,
    allValid,
    email,
    makeRules,
    minLength,
    validate,
  } from 'foldkit/fieldValidation'

  const emailRules = makeRules({
    required: 'Email is required',
    rules: [email('Please enter a valid email')],
  })

  const passwordRules = makeRules({
    required: 'Password is required',
    rules: [minLength(8, 'Must be at least 8 characters')],
  })

  const Model = S.Struct({
    email: Field,
    password: Field,
  })

  // In update (input → state):
  const nextEmail = validate(emailRules)(value)

  // Initial state in Model:
  const initialEmail = NotValidated({ value: '' })

  // Form-level submit gate:
  const canSubmit = allValid([
    [model.email, emailRules],
    [model.password, passwordRules],
  ])

  // Direct construction in async Commands:
  Valid({ value: email })
  Invalid({ value: email, errors: ['Already taken'] })
  ```

  ### Migration
  - **`makeField(S.String, options)`** → `makeRules(options)`.
  - **`type StringField = typeof StringField.Union.Type`**: delete. Import `Field` from `foldkit/fieldValidation` where you need the type.
  - **`StringField.Union` as the Model field type**: replace with `Field`.
  - **`StringField.Valid({ value })` / `.Invalid(...)` / `.Validating(...)` / `.NotValidated(...)`**: use the module-level constructors `Valid({ value })`, `Invalid({...})`, etc.
  - **`FieldValidation.required(message)` as a list item**: remove it from the list, pass `required: message` to `makeRules`.
  - **`FieldValidation.optional(rule)` wrapper**: delete; absence of `required` makes the field optional, and `validate` returns `NotValidated` for empty values automatically.
  - **`StringField.validate(list)(value)` / `.validateAll(list)(value)`**: replace with `validate(rules)(value)` / `validateAll(rules)(value)` (free functions, rules-scoped).
  - **`FieldValidation.init(field)(value)`**: removed. Use `NotValidated({ value })` directly.
  - **Hand-rolled `field._tag === 'Valid'` submit checks**: replace with `allValid(pairs)` for form-level gates or `isValid(rules)(state)` for single fields. Both are rules-aware (required demands `Valid`; optional also accepts `NotValidated`).
  - **`validations` options field**: renamed to `rules`.
  - **`Validation<T>` / `ValidationMessage<T>` types**: renamed to `Rule` / `RuleMessage` (no generic; both fixed to `string`).

### Patch Changes

- 95bd4c5: Fix devtools model-changed indicator inconsistency. The blue circle next to messages was based on referential inequality, while field-level diff dots used structural comparison. Now both indicators are derived from the same diff result, so a message only shows the blue circle when there are actual value changes to display in the model tree.

## 0.65.0

### Minor Changes

- c53dd67: Add `FieldValidation.optional`, a combinator that wraps a string `Validation` so empty strings pass without being checked. Useful for fields that are optional but must be valid when filled in (e.g. an optional email).

  ```ts
  FieldValidation.validate([
    FieldValidation.optional(FieldValidation.email()),
    FieldValidation.optional(FieldValidation.maxLength(100)),
  ])(model.websiteInput)
  ```

- 9b5bcd9: `FileDrop.ReceivedFiles` now carries `NonEmptyArray<File>` instead of `Array<File>`, and a new `FileDrop.DroppedWithoutFiles` Message and OutMessage covers the case where a drop or input-change event fires without files (typically a drag of non-file data like text, URLs, or images from another page).

  Migration: if your parent update handled `ReceivedFiles({ files })` and branched on `Array.isEmptyArray(files)`, move that branch to a new handler for `DroppedWithoutFiles`. The files list in `ReceivedFiles` is now guaranteed non-empty, so you can drop the empty check on the happy path.

- 3f1a877: Add `Task.uuid`, a primitive that generates an RFC 4122 version 4 UUID via `crypto.randomUUID()`. Use it in Commands that need stable identifiers without threading `crypto` calls through consumer code.

### Patch Changes

- e4b67a0: Fix a runtime race that could corrupt the DOM when a synchronous event fired during a patch caused a nested `dispatchSync` to run against a stale VNode reference. Most visible in Chrome when a focused element was removed from the DOM during a render (Chrome fires `blur` synchronously), and specifically reproduced with `Ui.Listbox`: selecting an item closed the list, removing the items container, firing `blur`, which dispatched another message while the outer render was still mid-patch. Symptom was duplicate DOM elements that the outer render did not clean up.

  The render path now sets an internal `isRendering` flag before patching and clears it after. Any `dispatchSync` that lands while the flag is set offers the message to a pending queue (`Queue.unbounded`) instead of kicking off a nested render. The queue is drained at the end of each render, so the nested messages still process in order, just serially rather than re-entrantly.

- 43f84b7: Internal refactor: call `Effect.runSync` directly in the runtime instead of `.pipe(Effect.runSync)`. Purely stylistic; no runtime behavior change.

## 0.64.0

### Minor Changes

- 6d022a9: Add `Ui.FileDrop`, a headless component for file upload zones that accept both drag-and-drop and click-to-browse. Encapsulates the `<label>` + hidden `<input type="file">` composition plus the drag-state machine that every file-upload UI otherwise reimplements.

  FileDrop exposes a `ReceivedFiles` OutMessage carrying `ReadonlyArray<File>` that fires via both paths (drop and input change), so consumers handle one event regardless of how the user brought the files in. The component Model tracks `isDragOver` and exposes it via `data-drag-over` on the root for styling.

  ```ts
  Ui.FileDrop.view({
    model: model.uploader,
    toParentMessage: message => GotFileDropMessage({ message }),
    multiple: true,
    accept: ['application/pdf', '.doc', '.docx'],
    toView: attributes =>
      label(
        [...attributes.root, Class('...')],
        [p([], ['Drop files or click to browse']), input(attributes.input)],
      ),
  })
  ```

  Also in this release:
  - `AllowDrop()`: new html primitive that calls `preventDefault` on `dragover` without dispatching a Message. Use it on drop zones that just need to be valid drop targets (the HTML5 requirement for `drop` to fire) without flooding the update function with per-tick Messages.
  - `OnDragEnter` and `OnDragLeave` now dedupe via an internal per-element target set with a microtask-deferred empty-check, matching the target-tracking pattern used by react-dropzone and @react-aria/dnd. Pruning stale targets on each event self-heals cases where `dragleave` failed to fire; the microtask deferral prevents a transient false "left" when the pointer crosses from the zone's padding onto a child in synchronous-dispatch rendering.

### Patch Changes

- 6d022a9: DevTools state inspector now displays `File`, `Blob`, `Date`, and `URL` instance contents instead of rendering them as empty objects. The useful data on these browser classes lives on prototype getters, which the previous key-enumeration walk couldn't see. The inspector now unwraps them into plain-object views (e.g. `{ name, size, type, lastModified }` for `File`) before flattening the tree, so consumers can see at a glance which file was dropped or which date was selected.

  Scope is intentionally narrow: only the four classes above are handled. `FileList`, `FormData`, `Map`, `Set`, and other collection-shaped builtins still render as empty objects. Extending coverage is one branch per type in `toInspectableValue`.

## 0.63.0

### Minor Changes

- 25e3f32: Add programmatic `open` and `close` helper functions to all UI components
  with open/close semantics. Each returns `[Model, Commands]` directly,
  mirroring the existing `Dialog.close` pattern.
  - Dialog: add `open`
  - Disclosure: add `close`
  - Menu: add `open`, `close`
  - Combobox: add `open`, `close` (single and multi)
  - Listbox: add `open`, `close` (single and multi)

- 88c2c75: Add programmatic setters for `Calendar` and `DatePicker` constraint props — `setMinDate`, `setMaxDate`, `setDisabledDates`, `setDisabledDaysOfWeek`. These allow consumers to update the `minDate`, `maxDate`, `disabledDates`, and `disabledDaysOfWeek` fields after `init()`, which is how cross-field date validation works (e.g. an end date picker whose minimum tracks a start date picker's selection).

  Constraints remain set at init time via `InitConfig` and live in the Model — the new setters update those fields. They do not reconcile the current selection if it falls outside the new constraint range; callers should `clear` or reassign the selection explicitly if their domain requires it.

  ```ts
  GotStartDateMessage: ({ message }) => {
    const [nextStartDate, commands] = Ui.DatePicker.update(model.startDate, message)
    const nextEndDate = Ui.DatePicker.setMinDate(
      model.endDate,
      nextStartDate.maybeSelectedDate,
    )
    return [evo(model, { startDate: () => nextStartDate, endDate: () => nextEndDate }), ...]
  },
  ```

## 0.62.0

### Minor Changes

- 8e0b0ce: Add DatePicker UI component and Popover contentFocus mode.

  DatePicker wraps Calendar in a Popover with focus choreography (opening
  focuses the grid, closing returns focus to the trigger), click-outside
  dismissal, and an optional hidden form input for native form submission.
  Consumers provide the trigger face and calendar grid layout.

  Popover gains a `contentFocus` option that hands focus ownership to the
  consumer — the panel is not focusable and does not close on blur, so the
  consumer must focus a descendant on open. DatePicker uses this to focus
  the calendar grid instead of the panel.

- 6c6da0c: Simplify Calendar and DatePicker init config — replace Option-wrapped
  parameters with plain optional values.
  - `maybeInitialSelectedDate: Option<CalendarDate>` → `initialSelectedDate?: CalendarDate`
  - `maybeMinDate: Option<CalendarDate>` → `minDate?: CalendarDate`
  - `maybeMaxDate: Option<CalendarDate>` → `maxDate?: CalendarDate`

  Remove `ChangedSelectedDate` from DatePicker OutMessage. Date selection
  now goes through the `onSelectedDate` ViewConfig callback instead.
  OutMessage is just `ChangedViewMonth`.

### Patch Changes

- dfdd933: Fix Popover panel never receiving focus on open.

  FocusPanel/FocusItems commands raced the anchor module's async positioning
  pipeline — they called element.focus() while the panel was still
  visibility:hidden, which is a no-op. Focus is now owned entirely by the
  anchor module: after the first computePosition resolves and clears
  visibility, a requestAnimationFrame defers the focus call so the element
  is painted before focus fires. A new focusSelector option lets consumers
  target a descendant (e.g. DatePicker focuses the calendar grid instead of
  the panel).

  Affects Popover, Menu, and DatePicker. Consumers using FocusPanel or
  FocusItems in story test setups should remove the resolve step — these
  commands are no longer dispatched on open.

## 0.61.0

### Minor Changes

- 79a9ce7: Add `Calendar` module for immutable calendar-date math.

  New `foldkit/calendar` module — an immutable `CalendarDate` type modeling the same concept as Java's `LocalDate` and TC39's `Temporal.PlainDate`. No time, no timezone; useful for birthdays, deadlines, form date inputs, and event calendars. The module depends only on `effect` and can be extracted as a standalone library in the future.

  Construction and interop:
  - `make` / `unsafeMake` / `isCalendarDate` type guard
  - `fromDateLocal` / `fromDateInZone` / `toDateLocal` for JavaScript `Date`
  - `CalendarDateFromIsoString` schema transform for JSON and form serialization

  Arithmetic (all binary functions are dual via `Function.dual`, so data-first and pipe-style calls both work):
  - `addDays` / `addMonths` / `addYears` with day-clamping on month overflow (Jan 31 + 1 month → Feb 28/29)
  - `subtractDays` / `subtractMonths` / `subtractYears`
  - `daysUntil` / `daysSince` matching `Temporal.PlainDate.until` / `since`

  Comparison and ordering:
  - `Order` and `Equivalence` exported as named instances for ecosystem interop
  - `isEqual`, `isBefore`, `isAfter`, `isBeforeOrEqual`, `isAfterOrEqual`
  - `min`, `max`, `between({ minimum, maximum })`, `clamp({ minimum, maximum })`

  Calendar info:
  - `dayOfWeek` via Sakamoto's algorithm, returning a `DayOfWeek` tagged literal
  - `isLeapYear`, `daysInMonth`, `firstOfMonth`, `lastOfMonth`
  - `startOfWeek` / `endOfWeek` with configurable first day of week

  Today:
  - `today.local` and `today.inZone(timeZone)` — Effect-based accessors backed by `Clock.currentTimeMillis`, so tests can freeze time via `TestClock`. This is the only impurity boundary in the module; every other function is referentially transparent.

  Locale and formatting:
  - `LocaleConfig` schema and `defaultEnglishLocale` constant
  - `formatLong`, `formatShort`, `formatAriaLabel` pure formatters

- 79a9ce7: Add `Ui.Calendar` component for rendering accessible inline calendar grids.

  New `foldkit/ui/calendar` module — a calendar UI primitive that manages the 2D keyboard navigation state machine and renders an ARIA grid. Designed for standalone inline-calendar use (scheduling UIs, event calendars) and as the foundation for the upcoming DatePicker component.

  Model:
  - Tracks `viewYear`/`viewMonth` (what the grid is showing), `maybeFocusedDate` (keyboard cursor), `maybeSelectedDate` (chosen value), `isGridFocused` (DOM focus state), plus `locale`, `maybeMinDate`, `maybeMaxDate`, `disabledDaysOfWeek`, and `disabledDates` configuration
  - Two distinct "current date" concepts: navigating with arrows never touches selection; commit gestures (click, Enter, Space) move both
  - `init` takes `today`, optional `maybeInitialSelectedDate`, and configuration; view defaults to the month of the selected date or today

  Messages: `ClickedDay`, `PressedKeyOnGrid`, `ClickedPreviousMonthButton`, `ClickedNextMonthButton`, `SelectedMonthFromDropdown`, `SelectedYearFromDropdown`, `FocusedGrid` / `BlurredGrid`, `RefreshedToday`, `CompletedFocusGrid`.

  Selection events use the controlled / uncontrolled callback pattern from Listbox / Combobox / Popover: provide an `onSelectedDate?: (date: CalendarDate) => ParentMessage` callback in the ViewConfig to take control of the event, then call `Calendar.selectDate(model, date)` from your handler to write the selection back to internal state. Omit the callback for uncontrolled mode where Calendar manages `maybeSelectedDate` automatically.

  OutMessage: `ChangedViewMonth({ year, month })` when navigation changes the visible month — useful for inline-calendar consumers loading month-scoped data like holidays or availability. Date selection does NOT go through OutMessage; subscribe via the `onSelectedDate` callback above.

  Keyboard navigation (WAI-ARIA grid pattern):
  - Arrow keys move focus by day (±1) or week (±7)
  - `Home` / `End` jump to start / end of week (based on `locale.firstDayOfWeek`)
  - `PageUp` / `PageDown` move by month
  - `Shift+PageUp` / `Shift+PageDown` move by year
  - `Enter` / `Space` commits the focused date
  - Navigation skips disabled dates with a bounded cap, so fully-disabled ranges don't cause infinite loops

  Configuration:
  - `maybeMinDate` / `maybeMaxDate` — inclusive range constraints
  - `disabledDaysOfWeek` — e.g. `['Saturday', 'Sunday']` to disable weekends
  - `disabledDates` — explicit array of disabled dates (holidays, blackout days)
  - `locale` — `LocaleConfig` from `foldkit/calendar`, defaults to `defaultEnglishLocale`

  View:
  - `view` builds ARIA attribute groups (`grid`, `row`, `gridcell`, `columnheader`) plus derived data (6×7 grid of dates, rotated column headers, month/year dropdown options, formatted heading text) and delegates layout to a `toView` callback
  - `lazy` memoizes the view for stable renders
  - `focusGrid(id)` builds a command that focuses the grid container — intended for parent components like DatePicker that hand off focus after opening

  Also extracted named constants for Gregorian cycle arithmetic in `foldkit/calendar/arithmetic.ts` (`MONTHS_PER_YEAR`, `DAYS_PER_YEAR`, `YEARS_PER_ERA`, `DAYS_PER_ERA`, `EPOCH_DAY_OFFSET`). No behavior change, clearer Howard Hinnant algorithm references.

## 0.60.0

### Minor Changes

- c7191f0: Add `Ui.Combobox.selectItem` and `Ui.Combobox.Multi.selectItem` helpers, mirroring the equivalents on `Ui.Listbox`. Use these in domain-event handlers when a combobox uses `onSelectedItem` to intercept selection. Single-select takes `(model, item, displayText)` because Combobox tracks the selected item and its display text separately. Multi-select takes `(model, item)` since it only tracks the toggled items.
- c7191f0: Add `Ui.Listbox.Multi.selectItem` helper, mirroring `Ui.Listbox.selectItem` for single-select. Use this in domain-event handlers when a multi-select listbox uses `onSelectedItem` to intercept selection — it returns the next listbox state with the item toggled in or out of the selection.
- c7191f0: **Breaking**: renamed `Ui.Transition.Hidden` to `Ui.Transition.Hid`. The Message convention is verb-first past-tense events describing what happened (`Showed`, `Clicked`, `Submitted`), and `Hidden` is the past participle of hide — grammatically mismatched with its sibling `Showed`. `Hid` is the correct past simple form.

  Migration: replace `Ui.Transition.Hidden()` with `Ui.Transition.Hid()` at every call site. TypeScript will surface any remaining references as errors.

## 0.59.0

### Minor Changes

- a486514: Complete Scene's AccName 1.2 "text alternative from native host language" coverage and expand the implicit role map.

  `Scene.role(tag, { name })` now resolves accessible names from every native-host source in the W3C AccName 1.2 spec:
  - `img.alt` and `area.alt`
  - `input[type="image"].alt`
  - `input[type="submit|button|reset"].value`
  - `<fieldset>` → text of its `<legend>` child
  - `<figure>` → text of its `<figcaption>` child
  - `<table>` → text of its `<caption>` child

  The implicit role map was extended with common elements that previously matched nothing: `p` (paragraph), `hr` (separator), `dialog`, `main`, `aside` (complementary), `fieldset`/`details` (group), `figure`, `output` (status), `progress` (progressbar), `meter`, `summary` (button), `tr` (row), `td` (cell). `input[type="image|button"]` now correctly map to role `button`.

  Edge cases from the ARIA-in-HTML spec are now handled:
  - `<img alt="">` has role `presentation`, not `img`.
  - `<a>` and `<area>` without an `href` have role `generic`, not `link`.
  - `<th scope="row">` has role `rowheader`; otherwise `columnheader`.

  Context-sensitive landmark roles are now resolved by walking the ancestor chain:
  - `<header>` has role `banner` unless it descends from `<article>`, `<aside>`, `<main>`, `<nav>`, or `<section>`, in which case it's `generic`.
  - `<footer>` has role `contentinfo` under the same conditions.
  - `<section>` has role `region` when it has an accessible name (via `aria-label`, `aria-labelledby`, or `title`); otherwise `generic`.

### Patch Changes

- 314f132: Fix `label(For(id), ...)` so the `for` attribute actually reaches the DOM.

  The `For` attribute handler was routing through snabbdom's `props` module with the key `for`, which told snabbdom to run `element.for = value`. `HTMLLabelElement` has no `for` property — the reflected DOM property is `htmlFor` — so the assignment silently created a JS expando and no `for=""` attribute was ever emitted on the rendered label. Every Foldkit form using `label([For(id)], ...)` was missing its label↔control association, so assistive tech and axe-core could not resolve accessible names from the label.

  The handler now routes through `htmlFor`, which snabbdom assigns as a real DOM property and which reflects to the `for` HTML attribute.

## 0.58.0

### Minor Changes

- 438005c: Add File module for file upload support.

  New `foldkit/file` module exports an opaque `File` type, metadata accessors (`name`, `size`, `mimeType`), and Effects for file selection and reading — all mirroring Elm's `elm/file` package design:
  - `File.select(accept)` and `File.selectMultiple(accept)` open the native file picker and resolve with the selected files.
  - `File.readAsText(file)`, `File.readAsDataUrl(file)`, and `File.readAsArrayBuffer(file)` wrap the browser `FileReader` API.
  - `FileReadError` tagged error for reader failures.

  Two new event attributes in the `foldkit/html` module for use with form file inputs and drag-and-drop zones:
  - `OnFileChange` decodes `event.target.files` for `<input type="file">` elements.
  - `OnDropFiles` decodes `event.dataTransfer.files` on drop events and calls `preventDefault`.

  Two new scene test helpers in `foldkit` (`Scene.changeFiles` and `Scene.dropFiles`) for asserting file upload flows in scene tests. Both helpers throw a clear error when applied to an element whose change or drop handler was registered via `OnChange`/`OnDrop` instead of the file-aware variant, preventing silent misuse that would otherwise dispatch the wrong message with an empty value.

  `Scene.role('img', { name })` now resolves `alt` attributes as the accessible name, matching the W3C AccName 1.2 "text alternative from native host language" step. Previously Scene only resolved `aria-labelledby`, `aria-label`, `<label for>`, text content, and `title`, so images required `Scene.altText` as a workaround.

## 0.57.0

### Minor Changes

- 2019063: Add deep submodel filtering to DevTools. The message filter now recursively unwraps nested `Got*Message` wrappers, so submodels at any depth appear in the filter dropdown. Each filter level displays the tag one level deeper than the selected submodel, giving distinct views at each nesting depth. Also fixes the filter button hover state when the listbox is open, and fixes a listbox bug where closing via pointer down would reset state needed by the subsequent click handler.
- 23a1e3e: Refactor all animated UI components to use Transition Submodel

  Dialog, Popover, Menu, Listbox, and Combobox now hold a `Transition.Model` submodel and delegate animation lifecycle to `Transition.update`. Transition emits `StartedLeaveAnimating` OutMessage so parents provide the leave-phase command — Dialog uses `defaultLeaveCommand`, while Popover/Menu/Listbox/Combobox race button/input movement detection against transition end via `DetectMovementOrTransitionEnd`.

  **Breaking changes across all animated components:**
  - Model field `transitionState` replaced with `transition: Transition.Model`
  - Messages removed: `AdvancedTransitionFrame`, `EndedTransition`
  - Message added: `GotTransitionMessage`
  - Commands removed: `RequestFrame`, `WaitForTransitions`
  - `TransitionState` re-exports removed

  Additional per-component removals:
  - Popover: `DetectedButtonMovement` message removed
  - Menu: `DetectedButtonMovement` message removed
  - Listbox: `DetectedButtonMovement` message removed
  - Combobox: `DetectedInputMovement` message removed

  Transition module changes:
  - OutMessage added: `StartedLeaveAnimating` — emitted when leave advances to `LeaveAnimating`; parent must provide the leave wait command
  - New export: `defaultLeaveCommand` — creates the standard `WaitForTransitions` command for parents that don't need custom leave behavior
  - New export: `TransitionState` — the state schema, previously only re-exported through individual components
  - `ViewConfig.toParentMessage` removed — the Transition view is purely presentational and never dispatched Messages
  - `lazy` signature simplified from `(model, toParentMessage, content) => Html` to `(model, content) => Html`

  **Migration:** Replace any direct references to removed exports with their Transition module equivalents. Handle `GotTransitionMessage` instead of `AdvancedTransitionFrame`/`EndedTransition`/`DetectedButtonMovement`/`DetectedInputMovement`. Access transition state via `model.transition.transitionState` instead of `model.transitionState`. Remove `toParentMessage` from Transition `view`/`lazy` call sites.

### Patch Changes

- 43a08bb: Fix lazy memoization to invalidate when dispatch context changes. Previously, lazy and keyedLazy could return stale cached VNodes when the dispatch context differed between calls, causing event handlers to reference an outdated dispatch function.

## 0.56.0

### Minor Changes

- 057df1c: Add click/doubleClick event bubbling, Scene.pointerDown/pointerUp steps, and RegExp support for role name matching in Scene tests.
  - `Scene.click` and `Scene.doubleClick` now bubble to the nearest ancestor with a handler when the target element has none, mirroring browser event propagation.
  - `Scene.pointerDown(target, options?)` and `Scene.pointerUp(target, options?)` simulate pointer events with configurable `pointerType`, `button`, `screenX`, and `screenY`.
  - `Scene.role('option', { name: /PM/ })` now accepts `RegExp` for flexible accessible name matching.

## 0.55.0

### Minor Changes

- cbdf4b9: Add missing HTML attributes, events, and ARIA properties

  Global attributes: Contenteditable, Draggable, Accesskey, Translate, Inert, Popover, Popovertarget, Popovertargetaction

  Element-specific attributes: Colspan, Rowspan, Scope, Headers, Span, Start, Reversed, CiteAttr, Datetime, Wrap, List, FormAttr, LabelAttr, ContentAttr, Charset, HttpEquiv, Srcset, Sizes, Loading, Decoding, Fetchpriority, Crossorigin, Referrerpolicy, Integrity, Hreflang, Ping, Sandbox, Allow, Srcdoc, Autoplay, Controls, Loop, Muted, Poster, Preload, Playsinline, Formaction, Formmethod, Formnovalidate, Formtarget, Formenctype, High, Low, Optimum, Usemap, Ismap

  Events: OnContextMenu, OnDragStart, OnDrag, OnDragEnd, OnDragEnter, OnDragLeave, OnDragOver, OnDrop, OnTouchStart, OnTouchEnd, OnTouchMove, OnTouchCancel, OnAnimationStart, OnAnimationEnd, OnAnimationIteration, OnTransitionEnd, OnLoad, OnError, OnPlay, OnPause, OnEnded, OnTimeUpdate, OnVolumeChange, OnSelect

  ARIA: AriaAtomic, AriaAutocomplete, AriaColcount, AriaColindex, AriaColspan, AriaDescription, AriaDetails, AriaFlowto, AriaKeyshortcuts, AriaLevel, AriaOwns, AriaPlaceholder, AriaPosinset, AriaReadonly, AriaRelevant, AriaRowcount, AriaRowindex, AriaRowspan, AriaSetsize, AriaValuemax, AriaValuemin, AriaValuenow, AriaValuetext

## 0.54.0

### Minor Changes

- f572dc0: Fix `resolveAll` mapper parameter typed as `unknown` instead of inferring from the Command definition's result Message type. Uses a mapped tuple type to infer `ResultMessage` per resolver, matching `resolve`'s behavior. Rename `ResolverPair` to `Resolver` and extract shared cascading resolution logic to `internal.ts`.

  Migration: replace `Story.ResolverPair` / `Scene.ResolverPair` with `Story.Resolver` / `Scene.Resolver`.

### Patch Changes

- 25a8582: Fix `Scene.text` exact match failing on text nodes with sibling elements. When a text node is a direct child of an element alongside other element children, exact matching now checks individual text nodes instead of only the parent's combined textContent.

## 0.53.0

### Minor Changes

- a22c43d: Add submodel drill-in filter to DevTools. When an app uses Submodels, a dropdown filter appears above the message list letting you scope the view to a single submodel's messages. Filtered messages show the inner message tag and the inspector unwraps the outer `Got*Message` envelope automatically.

## 0.52.0

### Minor Changes

- 95c5451: Change `Story.resolveAll` and `Scene.resolveAll` from a single array argument to variadic rest params.

  Before: `resolveAll([[Definition, Message], [Definition, Message]])`
  After: `resolveAll([Definition, Message], [Definition, Message])`

## 0.51.0

### Minor Changes

- 6c4c657: Add `Transition` UI component for coordinating CSS enter/leave animations. Manages the animation lifecycle via a state machine and data attributes (`data-closed`, `data-enter`, `data-leave`, `data-transition`), with double-rAF timing and Web Animations API completion detection. Sends a `TransitionedOut` OutMessage when the leave animation completes. Supports `animateSize` for smooth height animation via CSS grid (`grid-template-rows: 0fr → 1fr`).
- ce90e6e: Add `expectHasCommands`, `expectExactCommands`, and `expectNoCommands` to Scene, aligning its API with Story. Extract shared command assertion logic to internal helpers to eliminate duplication between Scene and Story.

## 0.50.0

### Minor Changes

- 8b84dbf: Add per-pair message mapper support to `Story.resolveAll` and `Scene.resolveAll`. Each pair in the array can now include an optional third element — a mapper function — matching the same signature as `resolve`'s third argument. This lets tests resolve multiple child Commands in a batch without expanding into individual `resolve` calls.

## 0.49.1

### Patch Changes

- 9eb28ce: Fix `Story.expectExactCommands` always failing due to reference equality on arrays

## 0.49.0

### Minor Changes

- c584588: Rename Story Command assertion helpers for clarity:
  - `Story.expectHasCommand(definition)` → `Story.expectHasCommands(...definitions)` — now accepts one or more Command definitions and asserts all are present among pending Commands
  - `Story.expectCommands(...definitions)` → `Story.expectExactCommands(...definitions)` — same behavior, clearer name

  Migration:

  ```ts
  // Before
  Story.expectHasCommand(FetchWeather)
  Story.expectCommands(FetchWeather, SaveBoard)

  // After
  Story.expectHasCommands(FetchWeather)
  Story.expectExactCommands(FetchWeather, SaveBoard)
  ```

## 0.48.0

### Minor Changes

- 3d9cac6: Rename `OnDblClick` to `OnDoubleClick` to follow the never-abbreviate convention. Remove `Scene.childView` — test submodel views through the root update/view instead of in isolation.
- 42a3af1: Replace `Story.tap` with focused assertion helpers: `Story.model` for Model assertions, `Story.expectHasCommand` / `Story.expectCommands` / `Story.expectNoCommands` for Command assertions, and `Story.expectOutMessage` / `Story.expectNoOutMessage` for OutMessage assertions. Remove `message` from the public `StorySimulation` type.

  Migrate from `Story.tap`:
  - `Story.tap(({ model }) => { ... })` → `Story.model(model => { ... })`
  - `Story.tap(({ commands }) => { expect(commands[0]?.name).toBe(Foo.name) })` → `Story.expectHasCommand(Foo)`
  - `Story.tap(({ commands }) => { expect(commands).toHaveLength(0) })` → `Story.expectNoCommands()`
  - `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.some(Foo())) })` → `Story.expectOutMessage(Foo())`
  - `Story.tap(({ outMessage }) => { expect(outMessage).toEqual(Option.none()) })` → `Story.expectNoOutMessage()`

### Patch Changes

- 1f2ffc7: Fix Dialog visibility during devtools time travel. The view now sets the native `.open` property and positioning styles directly, so the dialog renders correctly from the model alone without depending on Commands having run.

## 0.47.1

### Patch Changes

- 2d10076: Restore the custom propsModule that resets removed DOM properties. Snabbdom's built-in propsModule only sets new properties — it never cleans up old ones that disappeared between renders, so `disabled` persists on the DOM element even after `Disabled(true)` is removed from the attribute array. This was incorrectly reverted in 0.47.0.

## 0.47.0

### Minor Changes

- ff6d14f: `Dialog.lazy` now takes `panelContent` as a dynamic third argument instead of capturing it in the static closure. This fixes a bug where `panelContent` was frozen at creation time, causing stale VNode data (e.g. `Disabled(true)` persisting after model changes).

  Also reverts the custom `propsModule` introduced in 0.46.0 — the root cause was `Dialog.lazy` caching stale content, not snabbdom's property cleanup.

  **Migration:** Move `panelContent` from the config object to the call site:

  ```ts
  // Before
  const dialogView = Dialog.lazy({ panelContent: myContent, panelClassName: '...' })
  dialogView(model.dialog, toParentMessage)

  // After
  const dialogView = Dialog.lazy({ panelClassName: '...' })
  dialogView(model.dialog, toParentMessage, myContent)
  ```

## 0.46.1

### Patch Changes

- 97654fd: Track managed DOM properties per-element via WeakMap instead of relying on the old vnode's data for cleanup. This makes property reset (e.g. `disabled → false`) work regardless of whether snabbdom patches or recreates the element.

## 0.46.0

### Minor Changes

- e72bd7f: Scene testing parity fixes:
  - Add `Scene.all.label(text)` — the multi-match counterpart to `Scene.label`. Finds every element whose accessible label matches via the same four resolution strategies (`aria-label`, `<label for="id">`, nested `<label>`, `aria-labelledby`) and deduplicates. Closes a gap where the docs referenced `Scene.all.label` but it was never implemented.
  - Backfill three Vitest matchers that previously only worked in the `Scene.expect(...).to*()` chain form: `toBeEmpty`, `toBeVisible`, `toHaveId`.
  - `expect(element).toHaveText(/regex/)` and `toContainText(/regex/)` now accept `RegExp`, matching the chain form.

  `toHaveAccessibleName` and `toHaveAccessibleDescription` remain chain-only because they need the root VNode tree to resolve `aria-labelledby` / `aria-describedby` id references — a tree the bare Vitest matchers don't receive.

- e72bd7f: Add three new assertions to `Scene.expect(...)`: `toBeEmpty()` (element has no text or child nodes) and `toHaveId(id)`. Also introduce `Scene.expectAll(locatorAll)` for multi-match assertions, with `toHaveCount(n)` and `toBeEmpty()` (count is 0). `expectAll` respects `Scene.inside` scopes — matches are resolved relative to the active scope.
- e72bd7f: `Scene.click` now mirrors browser semantics more closely:
  - Clicking a submit button (`<button>` with no type or `type="submit"`, `<input type="submit">`, `<input type="image">`) with no click handler of its own falls through to the `submit` handler of the nearest ancestor `<form>`. Tests can now click the submit button directly instead of reaching past it to the form.
  - Clicking an element marked as disabled (`disabled` prop/attribute, or `aria-disabled="true"`) throws a clear error instead of silently invoking its click handler. Disabled elements don't dispatch click events in the browser, so tests shouldn't either.

- e72bd7f: Add more Scene interactions and assertions for RTL/Playwright parity. New interactions: `Scene.doubleClick`, `Scene.hover`, `Scene.focus`, `Scene.blur`, and `Scene.change` (dispatches `OnChange`, useful for `<select>`). `Scene.toHaveText` and `Scene.toContainText` now accept a `RegExp` in addition to a string. New assertions: `.toBeVisible()` (element is not hidden via `hidden`, `aria-hidden`, or `display: none`), `.toHaveAccessibleName(name)`, and `.toHaveAccessibleDescription(description)` — both resolve `aria-labelledby`/`aria-describedby` references against the full render tree.
- e72bd7f: Add `Scene.inside(parent, ...steps)` — a step-scoping primitive for Scene tests. Every Locator referenced by the nested steps resolves within the parent's subtree, so a block of assertions or interactions can share a scope without repeating `Scene.within(parent, …)` on every line. Composes with nested `Scene.inside` via `Scene.within`. Existing `Scene.within` is unchanged — use it for one-off scoped locators; use `Scene.inside` when two or more steps share a scope.
- e72bd7f: Add multi-match Locators and filter combinators to the Scene testing API. `Scene.all` exposes `role`, `text`, `placeholder`, `altText`, `title`, `testId`, `displayValue`, and `selector` factories — each returns a `LocatorAll` that resolves to every matching VNode. Convert to a single `Locator` via `Scene.first`, `Scene.last`, or `Scene.nth(n)`. Narrow a `LocatorAll` via `Scene.filter({ has, hasNot, hasText, hasNotText })`, which keeps entries that do (or don't) contain a matching descendant or substring. Matches Playwright's filter/nth semantics — use it for list rows, repeated buttons, or anywhere you need to pick the Nth of many.
- e72bd7f: Expand `Scene.role(...)` / `getByRole(...)` options to match RTL semantics. In addition to `name`, the options object now accepts `level` (heading level, from `aria-level` or `h1`–`h6`), `checked` (`boolean | 'mixed'`), `selected`, `pressed` (`boolean | 'mixed'`), `expanded`, and `disabled`. State filters read from the corresponding ARIA attributes (`aria-checked`, `aria-selected`, `aria-pressed`, `aria-expanded`, `aria-disabled`) with fallback to the native props (`checked`, `selected`, `disabled`) where appropriate.
- e72bd7f: Add RTL-parity locators to the Scene testing API: `Scene.altText`, `Scene.title`, `Scene.testId`, and `Scene.displayValue` (plus their underlying `getByAltText`, `getByTitle`, `getByTestId`, `getByDisplayValue` query functions). These match the React Testing Library queries of the same names — useful for finding images by `alt` text, elements by `title` tooltip, elements by `data-testid`, and form controls by their current value.
- e72bd7f: Add `foldkit/test/vitest` subpath export with a `setup()` helper that registers Foldkit's Scene matchers with Vitest and augments `Assertion<T>` with their types. Replaces the ~24 lines of `expect.extend` + `declare module 'vitest'` boilerplate every consumer had to copy into their `vitest-setup.ts`:

  ```ts
  // vitest-setup.ts
  import { setup } from 'foldkit/test/vitest'

  setup()
  ```

### Patch Changes

- feefe33: Replace snabbdom's built-in propsModule with a custom one that resets removed DOM properties. Snabbdom's propsModule only sets new properties and never cleans up old ones, so properties like `disabled` persist on the DOM element even after being removed from the attribute array. This caused event listeners (e.g. `OnClick`) that replaced a property (e.g. `Disabled`) at the same index to silently fail.

## 0.45.0

### Minor Changes

- 4ed2508: Switch Ui.Input, Ui.Textarea, and Ui.Select label association from aria-labelledby to the standard label[for] → input[id] pattern. Remove the now-unused labelId export from all three components. Add aria-labelledby reverse lookup to getByLabel so it resolves elements whose aria-labelledby points to a label with matching text.

## 0.44.0

### Minor Changes

- 7618151: Add Scene for feature-level testing through the view. Scene complements Story — where Story tests the update function by sending Messages directly, Scene tests features by clicking buttons, typing into inputs, and pressing keys. Includes a CSS selector query engine (find, findAll, text, attr), accessible locators (getByRole, getByText, getByPlaceholder, getByLabel), a callable Locator type for interaction targeting (role, placeholder, label, selector), inline assertion steps (Scene.expect(locator).toExist(), .toHaveText(), .toContainText(), .toHaveAttr(), etc.), interaction steps (click, submit, type, keydown), and custom Vitest matchers (toHaveText, toContainText, toHaveClass, toHaveAttr, toHaveStyle, toHaveValue, toBeDisabled, toBeEnabled, toBeChecked, toHaveHook, toHaveHandler, toExist, toBeAbsent).

### Patch Changes

- f44cc49: Make Scene.type and Scene.keydown dual for data-last piping. Both interactions now accept a single-argument form that returns a function waiting for the target, enabling pipe composition with locators: `pipe(Scene.label('Email'), Scene.type('alice@example.com'))`.

## 0.43.2

### Patch Changes

- ea6be4e: Improve DevTools performance with large models by replacing Schema.equivalence with reference equality for the isModelChanged flag, computing model diffs eagerly at record time instead of on-demand during inspection, and gating the store subscription on panel visibility to skip work when DevTools is closed.

## 0.43.1

### Patch Changes

- 91fbde2: Fix arrow key navigation requiring two presses and tab-close not working in Listbox, Menu, and Popover. Arrow keys now delegate to the items keydown handler when the component is already open. Focus moves to the items container via the anchor `focusAfterPosition` option, which fires after the first position computation clears `visibility: hidden` — necessary because browsers ignore `.focus()` on hidden elements.
- e8002e7: Preserve activationTrigger on close instead of resetting to Keyboard. Refactor query-sync example to use onSelectedItem callbacks instead of matching on internal SelectedItem messages.

## 0.43.0

### Minor Changes

- 9ce1b33: Add Ui.DragAndDrop component with four-state drag state machine (Idle, Pending, Dragging, KeyboardDragging), document-level pointer and keyboard subscriptions, collision detection, ghost element positioning, and draggable/droppable attribute helpers.

  Add subscription equivalence and readDependencies support: subscriptions can now provide a custom `equivalence` to control when dependency changes restart the stream, and `dependenciesToStream` receives a `readDependencies` callback for reading the latest dependencies without retriggering.

### Patch Changes

- 1c9e18d: Fix DevTools model tree expansion and diff highlighting bugs. Add Snabbdom keys to tree nodes so the virtual DOM correctly reuses elements when expanding/collapsing, and replace reference-identity array diffing with positional comparison that recurses into items to find specific changed fields.

## 0.42.0

### Minor Changes

- e061e16: Add optional `title` config to `makeProgram` for declarative `document.title` management. The function receives the current Model and is called after every render, keeping the browser tab title in sync with application state.
- 321dac6: Rename `toMessage` to `toParentMessage` across all UI component `ViewConfig` types and the test module. The new name makes the semantics unambiguous — it always maps a child module's Message to the immediate parent's Message type, regardless of nesting depth.
- 13afdac: Add optional domain-event callbacks to all UI components, separating user-meaningful events from internal plumbing in `toParentMessage`. Backwards compatible — when omitted, existing behavior is unchanged.

  **RadioGroup:** `onSelected(value, index)` with narrowed generic type, `select()` helper, `SelectedOption` value export
  **Tabs:** `onTabSelected(index)`, `selectTab()` helper
  **Dialog:** `onClosed()`, `close()` helper
  **Menu:** `onSelectedItem(index)`, `selectItem()` helper
  **Listbox:** `onSelectedItem(value)` (single + multi), `selectItem()` helper
  **Popover:** `onOpened()`, `onClosed()`, `open()` and `close()` helpers
  **Disclosure:** `onToggled()`, `toggle()` helper
  **Combobox:** `onSelectedItem(value)` (single + multi), `SelectedItem` value export

  Previously type-only message constructors (`SelectedOption`, `TabSelected`, `SelectedItem`, `Opened`, `Closed`, `Toggled`) are now exported as values for programmatic use with `update()` and helper functions.

### Patch Changes

- 79b5198: Export Command definitions and their result Message constructors from all UI components, enabling consumers to resolve Commands in `Test.story`. Affects Dialog, Menu, Popover, Combobox, Listbox, Disclosure, Tabs, and RadioGroup.

## 0.41.0

### Minor Changes

- d3844f2: Add Commands tab to DevTools inspector. The third tab shows Command definition names returned by update for the selected Message. Init Command names are now recorded and displayed when inspecting the init entry.
- 5331993: Consolidate `makeElement` and `makeApplication` into a single `makeProgram` function. The presence of a `routing` config determines whether the program has URL routing. Rename `BrowserConfig` to `RoutingConfig` and the `browser` config key to `routing`.

  **Migration:**
  - `Runtime.makeElement(config)` → `Runtime.makeProgram(config)`
  - `Runtime.makeApplication(config)` → `Runtime.makeProgram(config)`
  - `browser: { onUrlRequest, onUrlChange }` → `routing: { onUrlRequest, onUrlChange }`
  - `Runtime.BrowserConfig` → `Runtime.RoutingConfig`
  - `Runtime.ElementInit` → `Runtime.ProgramInit`
  - `Runtime.ApplicationInit` → `Runtime.RoutingProgramInit`
  - `Runtime.ElementConfigWithFlags` → `Runtime.ProgramConfigWithFlags`
  - `Runtime.ElementConfigWithoutFlags` → `Runtime.ProgramConfig`
  - `Runtime.ApplicationConfigWithFlags` → `Runtime.RoutingProgramConfigWithFlags`
  - `Runtime.ApplicationConfigWithoutFlags` → `Runtime.RoutingProgramConfig`

### Patch Changes

- 7f57617: Update README example links to point to foldkit.dev website pages and add Testing to the "What Ships With Foldkit" section.

## 0.40.0

### Minor Changes

- a53c46d: Add `foldkit/test` — a testing module for Foldkit programs. Six functions:
  - `Test.story` — run a test story for an update function, throw on unresolved Commands
  - `Test.with` — set the initial Model for a story
  - `Test.message` — send a Message (throws if Commands from a previous step are unresolved)
  - `Test.resolve` — resolve one Command inline with its result (throws if the Command isn't pending; accepts an optional `toParentMessage` mapper for Submodel testing)
  - `Test.resolveAll` — resolve many Commands inline with cascading support
  - `Test.tap` — assert on model, message, commands, outMessage

  Also requires result Message schemas on `Command.define`:

  ```ts
  Command.define('FetchWeather', SucceededFetchWeather, FailedFetchWeather)
  ```

### Patch Changes

- e2b52fe: Export `Field` interface as named return type for `makeField`, improving IDE hover tooltips

## 0.39.0

### Minor Changes

- 9f89bfa: Replace `Command.make` with `Command.define` — a branded `CommandDefinition` that is the only way to create Commands. Definitions are PascalCase constants that carry type-level identity (literal name, `CommandDefinitionTypeId` brand). Access the name via `.name` on the definition.

  **Breaking:** `Command.make` is removed. Replace all usages:

  ```ts
  // Before
  const fetchWeather = (city: string) =>
    Effect.gen(function* () { ... }).pipe(
      Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
      Command.make('FetchWeather'),
    )

  // After
  const FetchWeather = Command.define('FetchWeather')

  const fetchWeather = (city: string) =>
    FetchWeather(
      Effect.gen(function* () { ... }).pipe(
        Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
      ),
    )
  ```

- a0fed13: Renamed `depsToStream` to `dependenciesToStream` in the Subscription type and `makeSubscriptions` API to follow the project convention of using full, unabbreviated names.

  **Migration:**

  ```diff
  - depsToStream: (dependencies) => ...
  + dependenciesToStream: (dependencies) => ...
  ```

- 88f7b7a: Rename all Completed/Succeeded/Failed Messages to verb-first order

  All Message prefixes now use verb-first naming that mirrors the corresponding Command name. This makes Command-to-Message pairs instantly recognizable: Command `LockScroll` → Message `CompletedLockScroll`.

  **Breaking changes — UI component Messages:**
  - `CompletedDialogShow` → `CompletedShowDialog`
  - `CompletedDialogClose` → `CompletedCloseDialog`
  - `CompletedItemsFocus` → `CompletedFocusItems`
  - `CompletedButtonFocus` → `CompletedFocusButton`
  - `CompletedScrollLock` → `CompletedLockScroll`
  - `CompletedScrollUnlock` → `CompletedUnlockScroll`
  - `CompletedInertSetup` → `CompletedSetupInert`
  - `CompletedInertTeardown` → `CompletedTeardownInert`
  - `CompletedItemClick` → `CompletedClickItem`
  - `CompletedFocusAdvance` → `CompletedAdvanceFocus`
  - `CompletedPanelFocus` → `CompletedFocusPanel`
  - `CompletedInputFocus` → `CompletedFocusInput`
  - `CompletedTabFocus` → `CompletedFocusTab`
  - `CompletedOptionFocus` → `CompletedFocusOption`

  **Migration:** Update all references to the old names.

### Patch Changes

- 2f72c9a: Remove unused `Class` import in tabs test file.

## 0.38.0

### Minor Changes

- f07aea6: Subscriptions emit Stream<Message> instead of Stream<Command<Message>>

  Subscription streams now emit Messages directly. For subscription callbacks with side effects (like `event.preventDefault`), use `Stream.mapEffect`.

  **Breaking changes:**
  - `dependenciesToStream` returns `Stream<Message>` instead of `Stream<Command<Message>>`
  - Remove Effect wrappers from subscription stream emissions

  **Migration:**

  ```ts
  // Before:
  Stream.map(() => Effect.succeed(Ticked()))

  // After:
  Stream.map(Ticked)
  ```

## 0.37.0

### Minor Changes

- 9a682d8: Add names to Commands

  Command is now a struct with `name` and `effect` fields. Create Commands with `Command.make` (dual — data-first or data-last). Transform Commands with `Command.mapEffect` (also dual). Both `make` and `mapEffect` are re-exported from `foldkit` via the `Command` namespace.

  **Breaking changes:**
  - `Command<T>` is a struct `{ readonly name: string; readonly effect: Effect<T> }`, not `Effect<T>`
  - Commands must be created with `Command.make`, not bare Effects

  **New features:**
  - `Command.make(name, effect)` — creates a named Command
  - `Command.mapEffect(command, f)` — transforms the Effect, preserving the name
  - Runtime traces Command execution via `Effect.withSpan`

  **Migration:**
  1. Import: `import { Command } from 'foldkit'`
  2. Wrap every bare Effect returned as a Command in `Command.make`:

     ```ts
     // Before:
     Task.focus(selector).pipe(Effect.as(CompletedButtonFocus()))
     // After:
     Task.focus(selector).pipe(
       Effect.as(CompletedButtonFocus()),
       Command.make('FocusButton'),
     )
     ```

  3. Replace `Effect.map` on Commands with `Command.mapEffect` for Submodel Command mapping:

     ```ts
     // Before:
     commands.map(command =>
       Effect.map(command, message => GotChildMessage({ message })),
     )
     // After:
     commands.map(
       Command.mapEffect(Effect.map(message => GotChildMessage({ message }))),
     )
     ```

## 0.36.3

### Patch Changes

- c6e7349: Replace `requestAnimationFrame` with `Effect.suspend` in all DOM tasks (`focus`, `showModal`, `closeModal`, `clickElement`, `scrollIntoView`, `advanceFocus`) so they execute within the same browser task as the user gesture, fixing mobile input focus. Fix dialog backdrop not covering full viewport on iOS Safari during toolbar animations by adding `min-height: 100vh` and removing unnecessary `overflow: hidden`.

## 0.36.2

### Patch Changes

- 99320f2: Add `focusSelector` option to `Task.showModal` and thread it through `Ui.Dialog` so dialogs can focus an element in the same animation frame as `show()`, fixing focus on mobile browsers that ignore `focus()` outside the user-gesture call stack.

## 0.36.1

### Patch Changes

- a589a5f: Fix DevTools staying interactive above showModal() dialogs by switching Task.showModal to use show() with focus trapping and Escape key handling
- 214854a: Fix DevTools rendering behind search dialog backdrop by adding a z-index to the shadow DOM host element
- 758f1a5: Skip dialog Escape handler when event is already handled by a child element
- 6d41dca: Fix spurious input events triggered by unconditional value/checked/selected/open property patching during re-render
- 5a56fa5: Fix focus trap selector to respect tabindex="-1" on natively-focusable elements

## 0.36.0

### Minor Changes

- ea72be3: Replace `errorView` with grouped `crash` config containing `view` and `report`

  **Breaking changes:**
  - `errorView` config field removed — use `crash: { view }` instead
  - `crash.view` receives `CrashContext<Model, Message>` (with `error`, `model`, and `message` fields) instead of a bare `Error`

  **New features:**
  - `crash.report` callback for side effects (e.g. Sentry) — runs before `crash.view` renders, receives the same `CrashContext`
  - `CrashContext` and `CrashConfig` types exported from `foldkit`

  **Migration:**

  ```ts
  // Before
  makeElement({
    errorView: error => myErrorView(error),
  })

  // After
  makeElement({
    crash: {
      view: ({ error }) => myErrorView(error),
      report: ({ error, model, message }) => {
        Sentry.captureException(error, { extra: { model, message } })
      },
    },
  })
  ```

- 7795644: Replace `slowViewThresholdMs` with `slowView` config object supporting `show`, `thresholdMs`, and `onSlowView`. The `onSlowView` callback receives a `SlowViewContext` with the current model, triggering message, duration, and threshold — replacing the previous `SlowViewInfo` which only had timing data. Rename `VisibilityShow` to `Visibility`. Refactor `DevtoolsConfig` to use `false` instead of `show: 'Never'`, eliminating impossible states.

### Patch Changes

- c3efb50: Make vite-plugin-foldkit optional for local development. The runtime now falls back to a cold start with a helpful console warning if the plugin is missing, instead of silently showing a blank screen.

## 0.35.2

### Patch Changes

- 85303cc: Improve declaration file readability by adding explicit type annotations to component Message unions. `go to definition` now shows clean `typeof` references instead of expanded `CallableTaggedStruct` generics.

## 0.35.1

### Patch Changes

- d6bf6c9: Remove unused Flags schema destructuring and rename internal flags binding for clarity in makeRuntime.

## 0.35.0

### Minor Changes

- 9220d0c: Narrow generic type parameters in RadioGroup `view` signatures so typed values flow through `toMessage` callbacks without requiring consumer-side decoding. `OptionConfig.value` and the `SelectedOption` message in `toMessage` now carry the `RadioOption` generic instead of widening to `string`.

### Patch Changes

- d06075e: Remove vestigial transparent left border from DevTools message rows that caused a visible gap at the left edge of row dividers.

## 0.34.1

### Patch Changes

- 190a475: Add `buttonAttributes` and `panelAttributes` to `TabConfig`, fixing devtools overlay tabs that lost styling after the attributes escape hatch refactor.

## 0.34.0

### Minor Changes

- f8b8b5f: Add `attributes` escape hatch to component-rendered UI components alongside existing `className` props.

  Every element slot on component-rendered components (Tabs, Disclosure, Dialog, Popover, Menu, Listbox, Combobox, RadioGroup) now accepts an optional `*Attributes: ReadonlyArray<Attribute<Message>>` alongside the existing `*ClassName: string`. The component spreads `className` first, then `attributes`, so consumers can pass `Class(...)`, `DataAttribute(...)`, `Style({...})`, or any other attribute through the escape hatch.

  Replace `NoOp` with descriptive `Completed*` messages across all UI components. Every message now carries meaning about what happened. Fire-and-forget commands use object+verb compound nouns (`CompletedScrollLock`, `CompletedDialogShow`). View-dispatched no-ops use descriptive facts (`IgnoredMouseClick`, `SuppressedSpaceScroll`). Consumers matching on `NoOp` must update to the component-specific `Completed*` variants.

  Export `createLazy` and `createKeyedLazy` from `foldkit/html` — previously these were internal-only, now available for consumers building custom lazy-evaluated views.

  Add lazy memoization to DevTools tree nodes and message rows for improved rendering performance.

  **Breaking changes:**
  - **All UI components**: `NoOp` message removed. Replace with the component-specific `Completed*`, `Ignored*`, or `Suppressed*` messages (see each component's public exports).
  - **Tabs**: `tabListAriaLabel` is now required (was optional).
  - **RadioGroup**: `ariaLabel` is now required (new prop — enforces accessible name on the `radiogroup` role).
  - **Foldkit vdom**: `keyed()` now accepts `ReadonlyArray<Attribute<Message>>` instead of `ReadonlyArray<AttributeWithoutKey<Message>>`.

## 0.33.6

### Patch Changes

- 8b27c43: Add `overscroll-behavior: none` to devtools message list and inspector tree to suppress rubber-band overscroll effects

## 0.33.5

### Patch Changes

- 1b27ec6: Fix devtools mobile scroll and border styling: hide init row border on mobile where the pane border provides the separator, add min-h-0 to inspector pane for mobile tab panel scrolling, soften borders from Surface2 to Surface1, remove border and darken text on paused badge, and remove right border from last tab button.

## 0.33.4

### Patch Changes

- ba4d3ec: Add border to devtools badge matching the panel border. Remove bottom border from flush edge. Lowercase "init" in display text.

## 0.33.3

### Patch Changes

- 437e17c: Fix devtools Inspect mode header showing blank status on open and after clearing history. Replace `maybeSelectedIndex` Option with `selectedIndex` + `isFollowingLatest` so the header always reflects the inspected message. Remove `overscroll-behavior: contain` from devtools scrollable areas.

## 0.33.2

### Patch Changes

- 1369d6a: Fix iOS Safari scroll lock blocking touch scrolling inside devtools shadow DOM. Use `composedPath()` to resolve the real touch target across shadow boundaries.

## 0.33.1

### Patch Changes

- 7c0a3b7: Fix devtools overlay scroll locking on mobile with viewport-reactive lock, fix clear history breaking inspection, add keyed elements and semantic HTML to prevent stale DOM during panel transitions, and add overscroll containment.

## 0.33.0

### Minor Changes

- a9f2b8d: Add built-in devtools overlay for inspecting Messages and Model state, with TimeTravel mode (pause and jump to historical states) and Inspect mode (browse snapshots without pausing). Also default the `html()` generic to `never` so omitting the Message type argument produces a compile error on event handlers, and replace classnames with clsx.

## 0.32.0

### Minor Changes

- b5618f7: Add TransitionState support to Dialog for smooth enter/leave CSS transitions via an animated variant. Fix double scrollbar and background scroll on iOS Safari by resetting UA styles on the dialog element and managing scroll lock on open/close.

## 0.31.0

### Minor Changes

- 3ae1c8b: Add TransitionState support to Dialog component for coordinated CSS enter/leave transitions

## 0.30.0

### Minor Changes

- d81a237: Add Button, Input, Textarea, Select, and Fieldset UI components with label and description ID helpers, typed attributes, and individual subpath exports
- 8c9e95f: Automatically constrain floating dropdowns to the viewport using Floating UI's size middleware. Components using anchor positioning (Combobox, Listbox, Menu, Popover) now set max-height based on available space and scroll internally instead of overflowing the page.

### Patch Changes

- d81a237: Export missing message constructors from Menu and Listbox public modules, fix Disclosure Space key scrolling on non-native button elements, and align Combobox pointer-move handler with Menu/Listbox behavior

## 0.29.0

### Minor Changes

- 15e6c87: Add Checkbox UI component with ARIA support, indeterminate state, and lazy memoization. Add runtime reference equality fast-path that skips render and equivalence check when update returns the same model.

## 0.28.0

### Minor Changes

- a672d0c: Add Radio Group component (`Ui.RadioGroup`) with roving tabindex, orientation-aware arrow key navigation, per-option disabled state, and form submission via hidden input

## 0.27.0

### Minor Changes

- 4153513: Add Combobox UI component with nullable, multi-select, and select-on-focus modes. Add lazy factory to all UI components.

## 0.26.0

### Minor Changes

- 7b164d1: Add Popover and Switch UI components with shared anchor and transition infrastructure.

  **Breaking:** Field Validation API improvements — `Invalid` now carries `errors: NonEmptyArray<string>` instead of `error: string`, `validate` and `validateAll` are now methods on the `makeField` return value (standalone `validateField`/`validateFieldAll` exports removed), and `Validation<T>` accepts `ValidationMessage<T>` (string or function).

## 0.25.0

### Minor Changes

- e3e630d: ### Breaking Changes
  - **Subscriptions extracted to domain module** — `makeSubscriptions` moved out of runtime into a dedicated `subscription` module
  - **Listbox split into single-select and multi-select** — the listbox component is now two separate modules (`listbox/single` and `listbox/multi`) instead of a unified component. `selectedValues` is now derived inside `makeView` instead of being required in `ViewBehavior`

  ### Features
  - **Managed resources** — add model-driven acquire/release lifecycle for long-lived browser resources tied to model state
  - **View memoization** — add `createLazy` and `createKeyedLazy` for caching expensive view subtrees
  - **Dev-mode slow view warning** — runtime logs a warning when view builds exceed a performance threshold

  ### Fixes
  - **Disclosure** — escape CSS selector for button focus on close
  - **HTML** — handle multiline class name strings

## 0.24.0

### Minor Changes

- acff49f: Add Listbox UI component with full Headless UI parity, including typeahead search, keyboard navigation, grouped items, horizontal/vertical orientation, and open/close transition support

## 0.23.0

### Minor Changes

- 384525a: Add `resources` config field to `makeElement` and `makeApplication` for sharing long-lived browser services (AudioContext, RTCPeerConnection, etc.) across commands and subscriptions. Define services with `Effect.Service`, pass their default layer via `resources`, and the runtime memoizes and provides them automatically.

## 0.22.0

### Minor Changes

- 515610d: ### Breaking Changes
  - **Menu anchor positioning via portals** — menu items container renders in a portal root (`document.body`) when anchor positioning is enabled, escaping `overflow: hidden` ancestors. Opt out with `portal: false`
  - **Menu isModal defaults to false** — aligns with HeadlessUI, Radix, and Ariakit conventions. Consumers that need scroll lock and inert can opt in with `isModal: true`
  - **Anchor positioning moved to snabbdom hooks** — replaced subscription-based positioning with insert/destroy hooks for tighter lifecycle management
  - **Dropped Popover API from anchor positioning** — removed `popover` attribute approach in favor of portal rendering

  ### Features
  - **iOS Safari scroll lock** — `lockScroll` now intercepts `touchmove` events on iOS Safari, which ignores `overflow: hidden` on `documentElement`
  - **Command namespace export** — `Command` is now exported as a namespace via `foldkit/command` subpath, matching other module exports
  - **Keyboard modifier attributes** — all keyboard handler attributes now include `KeyboardModifiers`
  - **Lifecycle hook attributes** — added `OnInsert` and `OnDestroy` hook attributes for snabbdom lifecycle events
  - **advanceFocus Task and FocusDirection type** — exported for external focus management

## 0.21.0

### Minor Changes

- 4ee0289: ### Breaking Changes
  - **Command streams renamed to subscriptions** — `commandStream` renamed to `subscription` across the public API, including runtime configuration and all related types

  ### Features
  - **Menu button movement detection** — detect button movement during menu leave transition to prevent the menu from closing when the trigger button repositions

## 0.20.0

### Minor Changes

- 5ff61e0: ### Breaking Changes
  - **Task and Command separated** — `Task` now focuses on effect-based operations while `Command` handles message-producing side effects; failures moved to the error channel instead of being encoded in the success type
  - **Tabs orientation moved to view config** — `orientation` is no longer part of the Tabs model; pass it through view configuration instead

  ### Fixes
  - **Empty vdom rendering** — use a comment node instead of an empty text node when rendering empty virtual DOM trees, fixing edge cases with conditional rendering

## 0.19.0

### Minor Changes

- fd9b6cf: ### Breaking Changes
  - **`m()` moved to `foldkit/message`** — import `m` from `foldkit/message` instead of `foldkit/schema`
  - **`r()` and `ts()` helpers added** — `r()` creates route schemas, `ts()` creates general tagged structs; `m()` is now reserved for message variants only

  ### Features
  - **Menu pointer events** — migrated from mouse events to pointer events with touch filtering for better cross-device support
  - **Menu drag-to-select** — split mouse and touch button toggle; mouse users can hold-and-drag to select menu items
  - **Menu scroll lock** — modal menus lock page scroll while open
  - **Menu screen reader isolation** — elements outside modal menus are marked inert
  - **Menu Space typeahead** — Space acts as a typeahead character when search is active
  - **Menu transitions** — transition system for animated open/close
  - **Menu keyboard DOM click** — keyboard selection clicks the actual DOM element for better compatibility
  - **Menu Firefox workaround** — Space keyup workaround for Firefox menu button bug
  - **Menu disabled items** — disabled button support with pointer tracking

  ### Internal
  - Split monolithic Task module into focused sub-files
  - Verb-first message naming across all apps and examples

## 0.18.0

### Minor Changes

- 401e224: Make `Command` accept schema values via conditional type, eliminating the need for individual message type declarations. `Command<typeof Foo>` now extracts the instance type automatically. Added optional `E` and `R` type parameters to `Command` for commands with error or service requirements.

## 0.17.0

### Minor Changes

- 598f974: Add headless Disclosure component and public barrel exports for all modules

## 0.16.0

### Minor Changes

- Add headless Tabs component to foldkit-ui
  - Horizontal and vertical orientations with arrow key navigation
  - Automatic and manual activation modes
  - Disabled tab support, skipped in keyboard navigation
  - Panel persistence option to keep inactive panels in the DOM
  - Element polymorphism for tab list, tab, and panel elements
  - Data attributes (`data-selected`, `data-disabled`) for CSS-driven styling
  - Add `AriaControls` and `AriaOrientation` helpers to the html module

## 0.15.0

### Patch Changes

- 56cfa38: Update dependencies
- 091aa97: Fix errorView not rendering when errors occur during synchronous dispatch (e.g. click handlers). Errors thrown during `Runtime.runSync` now correctly render the error view instead of escaping as uncaught FiberFailure exceptions.

## 0.15.0-canary.1

### Patch Changes

- 56cfa38: Update dependencies
