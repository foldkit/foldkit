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

The **navigate-before-save**: a handler returning BOTH a save Command and a navigation Command races the save against the navigation. (`pushUrl` is an `Effect`, not a Command; define `PushUrl` with its args, result Message, and `handler: function* () { return ({ url }) => pushUrl(url).pipe(Effect.as(Message.CompletedPushUrl())) }`, then include `PushUrl.layer` in the feature's `EffectsLayer`.) Which one lands first is timing, not something the handler decides, and a navigation is local while a save is a round trip, so the route has almost always changed by the time the save resolves. The failure Message still arrives and the handler still runs; the error just renders on a route the user didn't submit from, or on one whose view doesn't render it at all. Idiomatic: emit the save only, then navigate in the `Succeeded*` handler, so errors surface on the page the user is still looking at.

For every union variant, trace whether the view branches on it and whether that branch is reachable. For every Model field, trace whether anything reads it besides its own writes.

## Structure and decomposition

### `repeated-scaffolding`

Three or four handlers sharing the same 5-line scaffold (`Match.tag` + `Match.orElse`, `Option.match` + fallback) want a named helper. Genuinely duplicated decision logic, not coincidentally similar shape.

Specific case: an `UpdateReturn` alias used only by one standalone pure `Message.match`. Inline the type at that matcher:

```ts
const foldFormMessage = Message.match<Update.Step<Model, Message>>({
  ClickedSubmit: () => model => ({ model }),
  UpdatedEmail:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { email: () => value }),
    }),
})
```

`Update.Return` and `Update.Step` default their Command requirement parameter to `never`, so the inline annotation is safe only when the matcher is pure. It also gives nested literal tags a contextual type before TypeScript can widen them. Inside a `Composition.makeUpdate` handler, `Definition.makeStep`, or `Definition.makeOutMessageFold`, omit the matcher return generic so the owner infers Command requirements, OutMessages, and graph evidence. Wrap a standalone Command-producing update or Step in `Update.define` or `Update.defineStep`; create a named return alias only when another matcher, helper, or exported signature reuses it, and include the complete requirement type.

**Flag needless scaffolding, repeated types, fixed `R = never` on a Command-producing owner, and a missing guard.** Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage and has no Command requirements, or provide its actual requirement type at a standalone boundary. A missing `outMessage` field means that update emitted nothing. The `outMessage?: never` guard also prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. Code expecting `Update.ReturnWithOutMessage<Model, Message, OutMessage>` can accept either outcome. A hand-written plain-return alias must preserve the same guard. Also flag a full record repeated at the update signature and again inside `Message.match<UpdateReturn>(message, handlers)`, or `: UpdateReturn` repeated on an update already constrained by that match.

### `manual-update-return-unpacking`

Do not destructure or rename `model`, `commands`, or `outMessage` from an ordinary update-like result that already contains those fields. Bind the whole result to an operation-named value and access its fields through that value. For example, pass `homeInit.commands` directly to `Command.mapMessages` instead of extracting or renaming it. Use `result.commands ?? []` only when the next operation requires a concrete array.

Author an exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record. Each case receives the contextual Model and exact Message payload, and operations retain the selected case's Command requirements and OutMessage contract. Use `makeUpdate.withContext(context => cases)` for additional dispatch arguments; the factory runs for local dispatch, not routed child-only delivery. Generic Step values inside that context factory may need `model => step(model)` for inference. Ordinary handlers return results directly; do not wrap every case with `makeStep`. A Model-preserving no-op record value is `Definition.makeNoopStep()`, not the bare factory.

`Composition.makeUpdate` accepts only an exhaustive handler record; its callback overload is removed. Use `makeUpdate({})` when there are no local Messages. Each handler receives `(model, message)`; name extracted single-Message handlers `handle<MessageTag>` and pass compatible handlers or Steps directly. Keep shared Steps named for their operation. If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected; ordinary raw-only handlers can return results directly. Do not hide errors with casts or broad return annotations: a later wrapper cannot recover channels already erased upstream.

Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. When the result belongs to a child Block, manual unpacking is usually the deeper problem. Use the child Binding's `fold` or named operation so the child Model, mapped Commands, and OutMessage policy remain part of one boundary. `Binding.init` returns a passive recipe with no result fields. Return it intact from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a Definition-owned Step, and flag any `.model` or `.commands` projection from it.

A Binding fold or named operation returns a connected Step whose Model input requires the exact graph. Flag typed raw-Model calls, useful `{ model }` narrowing, and `.model` or `.commands` access on its opaque result. Return or compose that result intact for `Composition.makeUpdate` or `Composition.makeInit` to consume. The raw recipe exposes only direct channels; the Composition-authored update exposes the final parent channels after registered policy is resolved. A completed operation accepts its raw Block Model, dispatches its produced Message through update, and returns the readable executed result; ordinary pure Steps also remain callable. Do not claim every structural erasure fails compilation: TypeScript may accept a connected Binding function as a method returning `void`, but calling it outside the graph only constructs and discards passive configuration and executes no child work.

When the OutMessage is already known while constructing a new result, include it directly. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper, and pass a new result literal first. Flag local attachment helpers and conditional object spreads that duplicate it.

A child with OutMessages needs an explicit `withOutMessagePolicy` selection. Flag a missing policy, an old `outMessage` field inside `makeBinding` config, and a policy-selected value omitted from Composition registration. A local fold may handle variants that also continue upward; its derived OutMessage takes precedence for that dispatch.

Inline an ordinary unkeyed policy as
`makeBinding(WholeChildBlock, ...).withOutMessagePolicy({ fold: FeatureDefinition.makeOutMessageFold(WholeChildBlock, handlers) })`.
Flag a raw child matcher, repeated Step or refined payload generics, and a
wrapper that data-first matches inside the fold. Every fold passes the whole
completed child explicitly, whether inline, extracted, adapted for keyed policy,
or staged for reciprocal composition.
Returned Steps retain inferred Command requirements and sibling Binding
evidence for Composition to check. Every handler record names every variant,
including a singleton union. A handler takes the inferred `FoldContext` second
argument only when it uses `liftCommand` or `modelBeforeUpdate`.

Inline forwarding as `FeatureDefinition.makeOutMessageForward(handlers)` under
an ordinary unkeyed Binding policy. Pass the whole completed child explicitly
when extracting the forward, adapting keyed policy, or staging reciprocal
composition. Flag a raw child matcher, missing or extra variant, return outside
the declared parent OutMessage union, and a record whose handlers all return
`undefined`. Register the full policy-selected Binding. Do not add casts,
annotations, generic argument lists, or a raw matcher as a recursion workaround.

Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `FeatureDefinition.makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use `FeatureDefinition.makeStep` for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

When several operations update the same Model in sequence, use `Update.combineSteps`. Initialize each child through its registered Binding recipe so Composition assembles the parent Model and mapped Commands.

### `duplicate-foldkit-module-instance`

A client or server module graph must resolve one `foldkit` module instance. Linked packages, local aliases, and nested installs can make the view or a definition use one copy while the Runtime uses another. Private definition checks and render state then fail at runtime even when type checking succeeds.

Run `pnpm why foldkit` from the application workspace. A reusable package that imports Foldkit should declare it as a peer dependency and keep a development dependency only for its own build. The application must declare the linked package, use `@foldkit/vite-plugin`, and avoid aliases that resolve Foldkit through different paths. When the plugin's dependency crawl cannot reach that package, add the package to `resolve.noExternal`. Do not work around the failure by recreating resource tags or casting identities.

### `functions-doing-two-things`

Orchestrators mixing "decide what to do" with "do it." Helpers whose `if` branches into unrelated behaviors. Handlers that conflate the state decision with the command decision.

### `manual-cache-orchestration`

Handlers that hand-thread several cache writes and refetches after a mutation succeeds. `Update.combineSteps(model, [step, step, ...])` sequences update steps over one Model, and `Update.refresh({ read, revalidate, write, load })` builds a step that reloads a cache only when it actually holds data. A `Succeeded*` handler doing this by hand with nested `modifyFields` calls and conditional Command arrays should use them.

## Naming

### `naming-drift`

`Updated*` here, `Changed*` there for the same kind of event. `whenX` here, `handleX` there for analogous cases. One file, one idiom.

### `messages-naming-the-effect`

A Message named `Incremented` describes the resulting state change, not the user action. The convention is verb-first past-tense for the EVENT that caused the update: `ClickedIncrement`. Same trap with `Saved`, `Deleted`, `Added`. The right names: `ClickedSave`, `ClickedDelete`, `ClickedAdd`, `SucceededSave`. Look for Messages that read like state mutations rather than user actions or external events.

### `view-named-after-namespace`

Name the feature's primary implementation `view`, rather than repeating its feature name as `counter`, `home`, or `room`. Pass that implementation to `prepareBlock`. Parents render the completed child through `ChildBinding.embedView`; do not export a parallel loose view solely for parent embedding.

### `unearned-type-aliases`

`export const Model = Schema.Struct({...})` followed by `export type Model = typeof Model.Type`.

Flag routine application aliases even when another application module references the decoded type. The owning feature writes `typeof Model.Type`, `typeof Message.Type`, or `typeof OutMessage.Type` directly. A consumer of a completed child writes `typeof ChildBlock.Model.Type`, `typeof ChildBlock.Message.Type`, or `typeof ChildBlock.OutMessage.Type`, which keeps ownership visible and avoids importing child implementation contracts.

For ordinary source features, require one private zero-argument producer named `prepare`, followed immediately with no blank line by the matching four-shape export header, before composing parent state from `ChildBlock.Model`. Accept a descriptive producer name only when one file genuinely contains multiple preparation producers. The feature barrel exports the completed Block and keeps its Model internal. Ordinary decoded-type annotations query `typeof ChildBlock.Model.Type`. Flag casts, broad Block annotations, fake helper names, `satisfies`-only boundaries or an unannotated producer used to evade the inference guard. Keep independently public domain Schemas and published generic contracts. Never create another Definition or repeat a generic factory call to obtain a Model. Local Message stays internal because it omits generated child envelopes.

Do not flag an alias that deliberately publishes a library contract or names a useful generic, mapped, or conditional type. `FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` is purposeful. Owned callbacks should infer their parameters rather than adding either an alias or a repeated direct query.

## Effect and Foldkit idiom

### `effect-module-inconsistency`

Mixing `items.map(f)` and `Array.map(items, f)` in the same file. Mixing `Option.match` and `Option.map(...).pipe(Option.getOrElse(...))` for similar code. One file, one idiom.

### `stuttery-modifyFields-setters`

A `modifyFields` setter that only transforms that same field should be point-free: `selectedEntryIds: Array.filter(id => id !== removedEntryId)` or `count: Number.increment`. Flag `selectedEntryIds: () => Array.filter(model.selectedEntryIds, id => id !== removedEntryId)` and friends. Replacement values from Messages, child updates, Commands, or other Model fields still use `() => value`. A parent must not pass a child Block helper as a field transformer. Call the child Binding's named operation, and use `Update.combineSteps` when applying operations to several children, so each child update owns its transition.

### `empty-object-constructors`

`foldkit/no-empty-object-tagged-call` catches `Idle({})`, calls through Message, Route, and State namespaces, and unions declared in the same file with Foldkit's union helpers. It cannot recognize an imported domain union such as `Todo` from its name alone, so check those calls by eye.

No-field tagged structs called with `({})`: `Idle({})`, `Work({})`, `Message.ClickedSubmit({})`. Should be `Idle()`, `Work()`, `Message.ClickedSubmit()`. Both compile; exemplars are uniform on the no-arg form.

### `hand-rolled-async-state`

A hand-written `Idle | Loading | Error | Ok` union for remote data, when `AsyncData` ships it: `AsyncData.Schema(DataSchema, ErrorSchema)` yields the schema plus constructors for `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success`, with `isPending`, `hasData`, `match`, `revalidate`, and the rest of the module's operations. `repos/foldkit/examples/weather/src/model.ts` declares the AsyncData contract; its `update.ts` demonstrates state transitions.

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

### `authored-child-delivery-message`

Flattening a child's Message variants into the parent's `defineMessageUnion()` record makes every parent handler know the child's tag names, and an authored `GotChildMessage` wrapper duplicates routing metadata that the Binding already owns. The canonical Block pattern keeps the authored parent Message local and lets `makeBinding` derive a generated envelope from the completed child Block. The parent Composition's complete Message Schema adds that envelope and routes it to the exact placement, key, and live generation. Use `delivery.when`, `delivery.toUpdateContext`, and `keySchema` for parent policy instead of adding child variants or mappers to the authored union.

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
