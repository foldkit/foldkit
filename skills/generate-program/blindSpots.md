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

When the answer takes real tracing, that is the signal to reach for `Machine` (`foldkit/experimental`, with `to` / `when` / `otherwise` / `ignore` from `foldkit/experimental/machine`). Writing the transitions as a table makes the edge set enumerable data instead of control flow spread across update handlers, and the Machine then answers this blind spot by computation rather than by reading:

- `unreachableStates(extraRoots?)` returns the state tags the declared Edge set does not reach from `initial` plus any extra roots.
- `deadTransitions(extraRoots?)` reports Edges whose source that same walk does not reach, tagged `UnreachableSource`, plus Edges shadowed by an earlier `otherwise` or `ignore()`, tagged `ShadowedByOtherwise` or `ShadowedByIgnore`.
- `reachableFrom(tag)` gives the closure from any state, and `toMermaid()` renders the diagram for review.

Use `ignore()` as the final entry in an ordered guard list when the Message should intentionally produce no transition after every preceding `when` guard declines. `step()` then reports `ExplicitlyIgnored`, which keeps that deliberate outcome distinct from an accidental guard fallthrough.

When identical transitions apply from several states, declare the shared default with `Machine.forStates(['First', 'Second']).on({ ... })` in the definition's `shared` array. The handler's `state` is the union of the selected variants, so only fields common to every selected state are available. A transition in a state's own `on` record replaces the shared default for that state and Message; never overlap two shared groups for the same pair.

The walk cannot see state changes made outside `transition` and `step`. Pass every restored, deep-linked, hydrated, or otherwise externally entered state as an extra root before treating `UnreachableSource` findings as application defects.

Recommend it when a flow has several states, guarded transitions, or edges that are easy to get wrong (checkout, onboarding, multi-step approval, connection lifecycles). `repos/foldkit/examples/state-machine/` is the reference. Don't push it on a three-state union that one exhaustive `match` already handles legibly; the table costs more than it saves there. The module is under `experimental/`, so say so when recommending it.

### `derived-data-in-model`

Fields computable from other fields. `endTime` AND `remainingMs` on the same state, where one can drift from the other. Flag unless there's a documented reason (view needs pure data, etc.).

### `dead-variants-and-noop-commands`

Variants set but never observed by the view or other updates. Fields written but never read. Commands whose result Message handler is `{ model }`.

The **no-op startup Command**: `init` returns `{ model: DEFAULT_MODEL, commands: [triggerApplicationStarted] }`, the Command resolves to `ApplicationStarted()`, and the handler is `ApplicationStarted: () => ({ model })`. Give the Command real work (load preferences, fetch initial data, focus first input, restore session) or delete the Command and the Message together.

The **navigate-before-save**: a handler returning BOTH a save Command and a navigation Command races the save against the navigation. (`pushUrl` is an `Effect`, not a Command; it reaches a handler wrapped in one, as `Command.define('PushUrl', { args: { url: Schema.String }, messages: [Message.CompletedPushUrl], execute: ({ url }) => pushUrl(url).pipe(Effect.as(Message.CompletedPushUrl())) })`.) Which one lands first is timing, not something the handler decides, and a navigation is local while a save is a round trip, so the route has almost always changed by the time the save resolves. The failure Message still arrives and the handler still runs; the error just renders on a route the user didn't submit from, or on one whose view doesn't render it at all. Idiomatic: emit the save only, then navigate in the `Succeeded*` handler, so errors surface on the page the user is still looking at.

For every union variant, trace whether the view branches on it and whether that branch is reachable. For every Model field, trace whether anything reads it besides its own writes.

## Structure and decomposition

### `repeated-scaffolding`

Three or four handlers sharing the same 5-line scaffold (`Match.tag` + `Match.orElse`, `Option.match` + fallback) want a named helper. Genuinely duplicated decision logic, not coincidentally similar shape.

Specific case: an `UpdateReturn` alias used only by one `Message.match`. Inline the type at that matcher:

```ts
const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    // ...
  })
```

Create an `UpdateReturn` alias when another matcher, helper, or exported signature reuses the type. `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is the Submodel counterpart.

**Flag needless scaffolding, repeated types, and a missing guard.** Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. A missing `outMessage` field means that update emitted nothing. The `outMessage?: never` guard also prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. Code expecting `Update.ReturnWithOutMessage<Model, Message, OutMessage>` can accept either outcome. A hand-written plain-return alias must preserve the same guard. Also flag a full record repeated at the update signature and again inside `Message.match<UpdateReturn>(message, handlers)`, or `: UpdateReturn` repeated on an update already constrained by that match.

### `manual-update-return-unpacking`

Do not destructure or rename `model`, `commands`, or `outMessage` from an update-like result. Bind the whole result to an operation-named value and access its fields through that value. For example, pass `homeInit.commands` directly to `Command.mapMessages` instead of extracting or renaming it. Use `result.commands ?? []` only when the next operation requires a concrete array.

Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. When the result belongs to a child Submodel, manual unpacking is usually the deeper problem. Use `Update.foldChild` or `Update.foldChildStep` so the child Model, lifted Commands, and OutMessage remain part of one fold.

When the OutMessage is already known while constructing a new result, include it directly. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper, and pass a new result literal first. Flag local attachment helpers and conditional object spreads that duplicate it.

A child fold needs `toParentOutMessage` only when at least one child OutMessage should continue to the current Submodel's parent. For partial forwarding, match every child variant and return `undefined` for the variants that stop here. Omit `toParentOutMessage` when every variant stops here. `foldOutMessage` still handles each variant locally, including variants that continue upward. Flag `toParentOutMessage: () => undefined`.

When several operations update the same Model in sequence, use `Update.combine`. Do not apply it to independent init results whose Models are assembled as separate fields.

### `functions-doing-two-things`

Orchestrators mixing "decide what to do" with "do it." Helpers whose `if` branches into unrelated behaviors. Handlers that conflate the state decision with the command decision.

### `manual-cache-orchestration`

Handlers that hand-thread several cache writes and refetches after a mutation succeeds. `Update.combine(model, [step, step, ...])` sequences update steps over one Model, and `Update.refresh({ read, revalidate, write, load })` builds a step that reloads a cache only when it actually holds data. A `Succeeded*` handler doing this by hand with nested `evo` calls and conditional Command arrays should use them.

## Naming

### `naming-drift`

`Updated*` here, `Changed*` there for the same kind of event. `whenX` here, `handleX` there for analogous cases. One file, one idiom.

### `messages-naming-the-effect`

A Message named `Incremented` describes the resulting state change, not the user action. The convention is verb-first past-tense for the EVENT that caused the update: `ClickedIncrement`. Same trap with `Saved`, `Deleted`, `Added`. The right names: `ClickedSave`, `ClickedDelete`, `ClickedAdd`, `SucceededSave`. Look for Messages that read like state mutations rather than user actions or external events.

### `view-named-after-namespace`

A counter feature exporting `counter(model)` reads as `Counter.counter(model)` at call sites. Name the primary view function `view`, so call sites read `Counter.view(model, h)`, `Home.view(model, h)`, `Room.view(model, h)`. The namespace disambiguates; the function name carries the role.

### `unearned-type-aliases`

`export const Model = Schema.Struct({...})` followed by `export type Model = typeof Model.Type`.

**Do not flag this by default.** It is idiomatic the moment the decoded type is referenced across modules in handler or parameter positions: `typeof Foo` is the constructor type Command consumes, so any consumer needing the decoded shape must otherwise write `typeof Foo.Type` at every call site. The exemplars export these aliases extensively for exactly that reason. Library exports whose type is part of a public API (e.g. `ViewConfig` callback parameters) are the same case.

Flag only when the schema is used purely locally with no consumer referencing its type, or when consumers already write `typeof Foo.Type` directly and the alias sits unused.

## Effect and Foldkit idiom

### `effect-module-inconsistency`

Mixing `items.map(f)` and `Array.map(items, f)` in the same file. Mixing `Option.match` and `Option.map(...).pipe(Option.getOrElse(...))` for similar code. One file, one idiom.

### `stuttery-evo-setters`

An `evo` setter that only transforms that same field should be point-free: `entries: Array.map(revealErrors)`, `count: Number.increment`, `priceSlider: Slider.reflectRange({ min: minPrice, max: maxPrice })`. Flag `entries: () => Array.map(model.entries, revealErrors)` and friends. Replacement values from Messages, child updates, Commands, or other Model fields still use `() => value`.

### `empty-object-constructors`

`foldkit/no-empty-object-tagged-call` catches `Idle({})`, calls through Message, Route, and State namespaces, and unions declared in the same file with Foldkit's union helpers. It cannot recognize an imported domain union such as `Todo` from its name alone, so check those calls by eye.

No-field tagged structs called with `({})`: `Idle({})`, `Work({})`, `Message.ClickedSubmit({})`. Should be `Idle()`, `Work()`, `Message.ClickedSubmit()`. Both compile; exemplars are uniform on the no-arg form.

### `hand-rolled-async-state`

A hand-written `Idle | Loading | Error | Ok` union for remote data, when `AsyncData` ships it: `AsyncData.Schema(DataSchema, ErrorSchema)` yields the schema plus constructors for `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`, with `isPending`, `hasData`, `match`, `revalidate`, and the rest of the module's operations. `repos/foldkit/examples/weather/src/main.ts` is the canonical use.

The two states a hand-rolled union usually lacks are the ones that matter: `Refreshing` (data on screen while a reload runs) and `Stale` (data on screen after a reload failed). A union without them forces a refetch to blank the screen or an error to discard good data. Flag a hand-rolled union unless the states genuinely aren't remote-data states.

### `array-type-syntax`

`readonly Command<Message>[]` and `MyType[]` should be `ReadonlyArray<Command<Message>>` and `Array<MyType>`. Cosmetic, but every exemplar is uniform.

## Routing and views

### `hard-coded-route-paths`

`foldkit/no-hardcoded-route-strings` covers `Href`, `pushUrl`, and `replaceUrl`. Anything routing through another helper needs your eyes.

`Href('/')`, `pushUrl('/new')`, ``Href(`/tag/${name}`)``. Routers are bidirectional; call them as printers: `Href(homeRouter())`, `pushUrl(newLinkRouter())`, `Href(tagFilterRouter({ tag: name }))`.

### `unkeyed-list-rows`

`foldkit/keyed-required-for-mapped-rows` and `foldkit/no-array-index-view-keys` cover part of this, but the first is narrow: it fires only when the callback references `.id` and the row element is one of li/div/tr/article/section. Rows keyed on a slug or name, and rows returning `h.a`, `h.button`, or a component call, pass it silently. A green lint does not clear this one; read the map sites.

Rows in `Array.map(items, ...)` carrying `OnClick` handlers bound to specific item ids, without `keyed('li')(item.id, ...)`, are a snabbdom patching bug. Delete from the middle and the OLD row's click handler patches onto a different row: the user clicks "Delete B" and A is deleted. Invisible until a delete or reorder happens mid-list.

### `data-derived-keys`

A `keyed(...)` whose key is built from displayed data (concatenated booleans, a formatted summary string, a restated field the subtree renders) is keying used as change detection. The key changes while the same conceptual thing stays on screen, so every content change tears the subtree down, discarding focus, scroll position, and open `details` elements. Keys carry identity: a branch tag, a route tag, a stable id. If removing the key leaves the same structure rendering at that position, remove it.

### `flat-parent-message-union`

Flattening a child's Message variants into the parent's `defineMessageUnion()` record makes every parent handler know the child's tag names, and the child can't grow its vocabulary without leaking into the parent. The canonical Submodel pattern adds `GotChildMessage: { message: Child.Message }` to the parent Message and handles that one variant with `Message.match`, delegating to `Child.update(model.child, message)`. Flat unions work for trivial cases but don't isolate child concerns. Suggest `Got*` wrapping for any Submodel likely to grow, or any child that needs an OutMessage.

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
