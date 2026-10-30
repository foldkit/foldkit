# Review Blind Spots

The failure modes that pass typecheck, pass lint, pass tests, and still fall short of the bar. `generate-program` walks this list in its Phase 6 review; `audit-program` walks it in Phase 5. This file is the single canonical copy. Update it here and both skills inherit the change.

Each entry has a stable slug in its heading. Cross-reference by slug, never by position, so inserting an entry can't silently repoint every reference.

For each item, output one line: `<slug>: clean | flagged at <file:line>: <issue>`. Silence is not a pass.

> Example paths are written for a consumer project with the Foldkit subtree vendored at `repos/foldkit/`. Working inside the Foldkit repo itself, drop that prefix; the same paths exist at the project root.

## Logic

### `off-by-one`

Logic with "after N", modulo, "every Nth", counter thresholds, or cycle boundaries. Trace for N=0, N=1, and the first transition. `count % 4 === 0` triggers on count=0. Intended or bug?

### `skip-reset-semantics`

Skip, reset, cancel, undo. Trace what each does to counters and derived state. Does skip increment the counter or bypass it? Does reset preserve it? Is the behavior what a user would expect?

### `state-machine-edges`

For every discriminated-union state: can the code transition INTO every state? OUT of every state? Are there dead states (created, never entered)? States that should be reachable but aren't?

When the answer takes real tracing, that is the signal to reach for experimental `Machine` from `foldkit/experimental/machine`. Writing transitions as a table makes the edge set enumerable data instead of control flow spread across update handlers, and the Machine then answers this blind spot by computation rather than by reading:

- `unreachableStates(extraRoots?)` returns the state tags the declared Edge set does not reach from `initial` plus any extra roots.
- `deadTransitions(extraRoots?)` reports Edges whose source that same walk does not reach, tagged `UnreachableSource`, plus Edges shadowed by an earlier `otherwise` or `ignore()`, tagged `ShadowedByOtherwise` or `ShadowedByIgnore`.
- `reachableFrom(tag)` gives the closure from any state, and `toMermaid()` renders the diagram for review.

Use `ignore()` as the final entry in an ordered guard list when the Message should intentionally produce no transition after every preceding `when` guard declines. When identical transitions apply from several states, declare the shared default once with the definition's `makeSharedTransitions`; never overlap two shared groups for the same state and Message.

The walk cannot see state changes made outside the Machine. Pass every restored, deep-linked, hydrated, or otherwise externally entered state as an extra root before treating `UnreachableSource` findings as application defects.

Recommend it when a flow has several states, guarded transitions, or edges that are easy to get wrong (checkout, onboarding, multi-step approval, connection lifecycles). `repos/foldkit/examples/state-machine/` is the reference. Don't push it on a three-state union that one exhaustive `match` already handles legibly. The module is experimental, so say so when recommending it.

### `derived-data-in-model`

Fields computable from other fields. `endTime` AND `remainingMs` on the same state, where one can drift from the other. A parent field that copies a child's state (`searchQuery` beside `search: Search`) instead of reading `model.search.model.query`. Flag unless there's a documented reason.

### `dead-variants-and-noop-commands`

Variants set but never observed by the view or other updates. Fields written but never read. Commands whose result Message handler is `{ model }` and that exist for no effect the user can observe.

The **no-op startup Command**: `start: [AnnounceStarted()]` resolves to `CompletedAnnounceStarted()`, and the handler is `CompletedAnnounceStarted: model => ({ model })`. Give the `start` Command real work (load preferences, fetch initial data, focus the first input, restore a session) or delete the Command and the Message together.

The **navigate-before-save**: a handler returning BOTH a save Command and a navigation Command races the save against the navigation. Which one lands first is timing, not something the handler decides, and a navigation is local while a save is a round trip, so the route has almost always changed by the time the save resolves. The failure Message still arrives and the handler still runs; the error just renders on a route the user didn't submit from, or on one whose view doesn't render it at all. Return the save only, then return the navigation Command from the `Succeeded*` handler, so errors surface on the page the user is still looking at.

For every union variant, trace whether the view branches on it and whether that branch is reachable. For every Model field, trace whether anything reads it besides its own writes.

## Blocks and composition

### `parent-writes-child-state`

A parent changes a child only by sending it a Message (`messages: [model.search.send(Search.Message.RequestedClear())]`) and reads it through `model.search.model`. Flag a parent that rebuilds or spreads `model.search.model`, replaces a child instance to reset its state when the child has a reset Message, or computes the child's next state in its own update. Each one moves a transition out of the child's update, where its Commands, OutMessages, and invariants live.

The fix is a truthful Message on the child: `RequestedClear`, `RequestedReset`, `InformedOfRouteChange`. Putting the same declared instance back into the Model constructs it fresh, so swapping an instance out and in is a lifecycle decision (the auth example does it on logout), not a substitute for a reset Message.

### `parent-wrapped-child-messages`

A parent Message that wraps a child's Message (`GotSearchMessage: { message: SearchMessage }`) and calls the child's logic from the parent's update, or a parent union that copies the child's Message tags. Instances route their own Messages: the child's view dispatches to the child, its Command results return to it, and the parent sends with `send` and listens with `.on`. Delete the wrapper and the forwarding branch.

The analogous test smell is a Story that dispatches a parent wrapper to reach a child. Deliver the child's Message directly with `message(Block.deliver(Search, 'search', Search.Message.SubmittedQuery({ query })))`.

### `missing-child-layer`

Every Block the graph creates needs its Live Layer provided to the parent Layer that creates it. A missing Layer usually fails typecheck at `Program.make` or `story`, but two variants slip through review:

- The Layer is provided in `entry.ts` but not in the test Layer, so the test file reaches for `Layer.merge`, casts, or skips the child. Tests provide children with `Layer.provide`, exactly as the entry does.
- A component's dependencies are provided twice: `Layer.mergeAll(Dialog.DialogLive, AnimationLive)` when `DialogLive` already provides Animation. Provide only the components you construct.

When a feature always creates the same children, provide them inside its own Live (`EditorLive = Editor.make(...).pipe(Layer.provide(DatePicker.DatePickerLive))`) so every parent and test provides only `EditorLive`. Flag a graph where each parent repeats the same child Layer list.

### `async-constructor-work`

A constructor that fetches, reads storage, reads the clock, or waits on anything. Constructors run synchronously when the instance enters the Model; asynchronous work there is wrong in kind. Startup work goes in a Command listed in `start`, whose result Message update handles. Values the root needs before its first render come from Flags.

The subtler version captures per-invocation values in the constructor: `const now = yield* clock.currentTimeMillis` at the top of the constructor, then used inside a Command handler. Constructor-yielded values last as long as the instance. Read time, randomness, and UUIDs inside the handler Effect.

### `unstable-instance-keys`

`Child.each(collection, args)` factories must be called with a stable domain key: `row(todo.id)`, `editor(issueId)`. Flag a key built from an array index, a counter that can be reused after removal, displayed text, or a value generated during update without being stored. A key that changes for the same conceptual item constructs a fresh instance and discards its state; a key reused for a different item hands one item's state to another. Render the collection keyed by `instance.id`.

### `instances-outside-the-model`

The parent Model is the only record of which instances exist. Flag instances stored in a `Ref`, a Service, or a module variable, and instances stored in a HashMap, HashSet, or class instance inside the Model. Convert maps and sets to a Record or an array. Flag a `HashMap` of instances being spread or rebuilt to "update" one entry: send that instance a Message instead.

### `mirrored-parent-data`

A child that keeps a copy of parent data only to read it, kept in sync by `InformedOf*` Messages on every parent change. Pass current render data through the view input instead, and reserve `InformedOf*` for external events that require the child to transition, return a Command, or emit an OutMessage. Also flag the reverse: a parent sending a child a Message about a change the child already applied and reported.

## Structure and decomposition

### `split-block-file`

One Block spread across `message.ts`, `model.ts`, `update.ts`, `command.ts`, `view.ts`, `subscription.ts`, or `flags.ts`, or reached through an `index.ts` barrel. Each Block lives in one file named for it in camelCase, holding its Messages, Model, Command and Mount definitions, class, and `Live` Layer. Also flag a large Block whose fix was slicing it into sibling files: extract a feature that owns its own state or effects into a child Block in its own file instead. Pure functions shared by several Blocks belong in `domain/`, not in a sibling helper file of one Block.

### `repeated-scaffolding`

Three or four handlers sharing the same 5-line scaffold (`Match.tag` + `Match.orElse`, `Option.match` + fallback) want a named helper. Genuinely duplicated decision logic, not coincidentally similar shape.

Specific cases: the same `.on` handler body repeated across several OutMessage tags, which wants one named Step; several handlers that each rebuild the same `messages` array for a child collection, which wants a named helper returning `ReadonlyArray<Send>`; and an `UpdateRecord` type written out in more than one place for the same Block, which wants one alias.

### `manual-update-return-unpacking`

Do not destructure or rename `model`, `commands`, or `outMessage` from an update-like result that already contains those fields. Bind the whole result to an operation-named value and access its fields through that value, so the operation and all of its returned fields stay visible together.

Flag a parent that calls a child's update logic directly and unpacks its result. A parent never runs a child's handlers: it sends the child a Message under `messages`, and the child's result, including its Commands and OutMessage, stays inside the child. Flag an `.on` handler that drops a Command or OutMessage it should have returned because it rebuilt the result field by field.

When the OutMessage is already known while constructing a new result, include it directly. Use `Update.withOutMessage` when attaching an OutMessage to an existing result or when the value has the type `OutMessage | undefined`. Flag local attachment helpers and conditional object spreads that duplicate it.

### `duplicate-foldkit-module-instance`

A client or server module graph must resolve one `foldkit` module instance. Linked packages, local aliases, and nested installs can make the view or a Block use one copy while the Runtime uses another. Private definition checks and render state then fail at runtime even when type checking succeeds.

Run `pnpm why foldkit` from the application workspace. A reusable package that imports Foldkit should declare it as a peer dependency and keep a development dependency only for its own build. The application must declare the linked package, use `@foldkit/vite-plugin`, and avoid aliases that resolve Foldkit through different paths. When the plugin's dependency crawl cannot reach that package, add the package to `resolve.noExternal`. Do not work around the failure with casts.

### `functions-doing-two-things`

Orchestrators mixing "decide what to do" with "do it." Helpers whose `if` branches into unrelated behaviors. Handlers that conflate the state decision with the Command decision.

### `manual-cache-orchestration`

Handlers that hand-thread several cache writes and refetches after a mutation succeeds. `Update.combineSteps(model, [step, step, ...])` sequences Steps over one Model, and `Update.refresh({ read, revalidate, write, load })` builds a Step that reloads a cache only when it holds data. A `Succeeded*` handler doing this by hand with nested `modifyFields` calls and conditional Command arrays should use them.

## Naming

### `naming-drift`

`Updated*` here, `Changed*` there for the same kind of event. `handleX` here, `onX` there for analogous cases. `SearchLive` in one feature, `SearchLayer` in another. One codebase, one idiom.

### `messages-naming-the-effect`

A Message named `Incremented` describes the resulting state change, not the user action. The convention is verb-first past-tense for the EVENT that caused the update: `ClickedIncrement`. Same trap with `Saved`, `Deleted`, `Added`. The right names: `ClickedSave`, `ClickedDelete`, `ClickedAdd`, `SucceededSave`. Parent-sent Messages are facts too: `RequestedClear`, not `Clear`.

### `view-named-after-namespace`

Name a Block's primary view function `view`, rather than repeating its feature name as `searchView`, `homeView`, or `roomView`, and pass it as `view` in the constructor return. Parents render the child with `model.search.view()`; do not export a parallel loose view function for parents to call with the child's Model.

### `schema-type-aliases`

Declare a Schema's same-named decoded type immediately below it, with no blank line: `export const Model = Schema.Struct({...})` followed by `export type Model = typeof Model.Type`. Prefer the alias in explicit value annotations. These aliases are the normal authoring convention; do not flag them for being routine. Use `typeof Model` when an API needs the Schema type.

Across a child boundary, derive a named alias from the class, such as `type SearchMessage = typeof Search.Message.Type`. In a parent Model Schema, the child field is the class itself (`search: Search`), not `Search.Model`; flag `Search.Model` used as a parent field Schema.

## Effect and Foldkit idiom

### `effect-module-inconsistency`

Mixing `items.map(f)` and `Array.map(items, f)` in the same file. Mixing `Option.match` and `Option.map(...).pipe(Option.getOrElse(...))` for similar code. One file, one idiom.

### `stuttery-modifyFields-setters`

A `modifyFields` setter that only transforms that same field should be point-free: `selectedEntryIds: Array.filter(id => id !== removedEntryId)` or `count: Number.increment`. Flag `selectedEntryIds: () => Array.filter(model.selectedEntryIds, id => id !== removedEntryId)` and friends. Replacement values from Messages, Command results, or other Model fields still use `() => value`. A `modifyFields` setter on a field holding a child instance only places, replaces, or removes instances; it never changes the child's state (see `parent-writes-child-state`).

### `empty-object-constructors`

`foldkit/no-empty-object-tagged-call` catches `Idle({})`, calls through Message, Route, and State namespaces, and unions declared in the same file. It cannot recognize an imported domain union from its name alone, so check those calls by eye.

No-field tagged structs called with `({})`: `Idle({})`, `Message.ClickedSubmit({})`, `Search.Message.RequestedClear({})`. Should be `Idle()`, `Message.ClickedSubmit()`, `Search.Message.RequestedClear()`.

### `hand-rolled-async-state`

A hand-written `Idle | Loading | Error | Ok` union for remote data, when `AsyncData` ships it: `AsyncData.Schema(DataSchema, ErrorSchema)` yields the Schema plus constructors for `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`, with `isPending`, `hasData`, `match`, `revalidate`, and the rest of the module's operations.

The two states a hand-rolled union usually lacks are the ones that matter: `Refreshing` (data on screen while a reload runs) and `Stale` (data on screen after a reload failed). A union without them forces a refetch to blank the screen or an error to discard good data. Flag a hand-rolled union unless the states genuinely aren't remote-data states.

### `array-type-syntax`

`Command[]` and `MyType[]` should be `ReadonlyArray<Command>` and `Array<MyType>`. Cosmetic, but every exemplar is uniform.

## Routing and views

### `hard-coded-route-paths`

`foldkit/no-hardcoded-route-strings` covers `Href`, `pushUrl`, and `replaceUrl`. Anything routing through another helper, including Command args such as `NavigateInternal({ url: '/people' })`, needs your eyes.

`Href('/')`, `pushUrl('/new')`, ``Href(`/tag/${name}`)``. Routers are bidirectional; call them as printers: `Href(homeRouter())`, `pushUrl(newLinkRouter())`, `Href(tagFilterRouter({ tag: name }))`.

### `unkeyed-list-rows`

`foldkit/keyed-required-for-mapped-rows` and `foldkit/no-array-index-view-keys` cover part of this, but the first is narrow: it fires only when the callback references `.id` and the row element is one of li/div/tr/article/section. Rows keyed on a slug or name, rows returning `h.a`, `h.button`, or a component call, and rows rendering a child instance's `.view()` pass it silently. A green lint does not clear this one; read the map sites.

Rows in `Array.map(items, ...)` carrying `OnClick` handlers bound to specific item ids, without `h.keyed('li')(item.id, ...)`, are a patching bug. Delete from the middle and the old row's click handler patches onto a different row: the user clicks "Delete B" and A is deleted. Invisible until a delete or reorder happens mid-list. Child instances are keyed by `instance.id`.

### `data-derived-keys`

A `keyed(...)` whose key is built from displayed data (concatenated booleans, a formatted summary string, a restated field the subtree renders) is keying used as change detection. The key changes while the same conceptual thing stays on screen, so every content change tears the subtree down, discarding focus, scroll position, and open `details` elements. Keys carry identity: a stable id, an entity id, an instance id. If removing the key leaves the same structure rendering at that position, remove it.

## Accessibility

### `hand-rolled-widgets`

Raw `input`, `textarea`, `button`, `dialog`, anything with `role="menu"` / `role="dialog"` / `role="tab"`. `@foldkit/ui` ships `Input`, `Textarea`, `Button`, `Dialog`, `Menu`, `Tabs` and the rest. A hand-rolled element without a `// NOTE:` explaining why is a BLOCKER, not a style preference: hand-rolling skips accessibility work.

### `a11y-gaps`

For anything outside `@foldkit/ui` coverage: label/input pairing via `For(id)` + `Id(id)`, dynamic errors announced via `Role('alert')` or `AriaLive('polite')`, icon-only buttons with `AriaLabel`, external links with `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks over `div` soup. Color is never the only carrier of meaning.

### `aria-role-confusion`

Checkboxes use `Role('checkbox')` + `AriaChecked(boolean)`; screen readers announce "checkbox, checked." Toggle buttons (Play/Pause, Bold on/off) use `AriaPressed(string)`; screen readers announce "toggle button, pressed." Ask: does the label say "Mark as done" (checkbox) or "toggle bold" (pressed button)?

## Testing

### `missing-scene-test`

`scene.test.ts` is REQUIRED at Tier 3+. Absent is a BLOCKER, not a QUALITY item.

Present but with no `expect(...)` and no interactive resolution in a block is the same finding. A `scene(...)` that only does `given(model)` verifies that the view doesn't throw and nothing else.

### `test-layer-wiring`

A Story or Scene receives exactly one root Block's Layer, with children attached through `Layer.provide` and constructor Services through `.pipe(Effect.provide(TestLayer))` on the returned Effect. Flag `Layer.merge` or `Layer.mergeAll` of a parent and its children at the top level, a test that stubs a child Block instead of providing its Live, and a test that uses `given` to add or remove instances (it can only set state; send the Message that creates or removes the instance). Flag a test that asserts `start` Commands of the starting Model; they are not in the ledger.
