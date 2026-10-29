# Foldkit Conventions Guide

> **Note:** This file is a snapshot of the conventions practiced in the live Foldkit codebase. If anything here contradicts what `repos/foldkit/examples/` or `repos/foldkit/packages/foldkit/src/` actually do, the live code is canonical. The duplication is intentional so the skill works in downstream projects that haven't vendored the foldkit subtree.

## Naming

### Messages

Messages use past-tense, verb-first naming. The verb prefix acts as a category marker:

| Prefix       | Meaning                                     | Example                                             |
| ------------ | ------------------------------------------- | --------------------------------------------------- |
| `Clicked*`   | Button/link press                           | `ClickedSubmit`, `ClickedDeleteItem`                |
| `Updated*`   | Input value change or external state change | `UpdatedEmail`, `UpdatedSearchQuery`, `UpdatedRoom` |
| `Submitted*` | Form submission                             | `SubmittedLoginForm`, `SubmittedComment`            |
| `Pressed*`   | Keyboard input                              | `PressedKey`, `PressedEnter`                        |
| `Blurred*`   | Focus loss                                  | `BlurredEmailInput`, `BlurredPasswordInput`         |
| `Selected*`  | Choice made                                 | `SelectedFilter`, `SelectedTab`                     |
| `Toggled*`   | Binary state flip                           | `ToggledDarkMode`, `ToggledSidebar`                 |
| `Succeeded*` | Async success (fallible)                    | `SucceededFetchWeather`, `SucceededLogin`           |
| `Failed*`    | Async failure (fallible)                    | `FailedFetchWeather`, `FailedLogin`                 |
| `Completed*` | Command result                              | `CompletedFocusInput`, `CompletedLockScroll`        |
| `Hid*`       | UI element dismissed                        | `Hid`, `HidOverlay`                                 |
| `Ticked*`    | Timer/interval tick                         | `TickedClock`, `TickedFrame`                        |

`Updated*` covers both user input changes (`UpdatedEmail`, `UpdatedNewTodo`) and external state updates from subscriptions (`UpdatedRoom`, `UpdatedPlayerProgress`). The prefix describes the fact ("the value was updated"). Whether it came from a keystroke or a WebSocket doesn't change the Message category.

The prefixes above other than `Succeeded*`, `Failed*`, and `Completed*` are for facts that originate in the view, a Subscription, a Mount, or flags. A Command's own result Message is named from the Command, never from the fact it reports.

Audit the Command name before deriving its result Message. Name the effect its handler performs, not the later Model transition caused when update handles the result. A timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`; its result is `CompletedWaitBeforeDismissal`.

#### Completed\* naming

Use verb-first naming that mirrors the Command name: Command `LockScroll` → Message `CompletedLockScroll`.

```ts
// RIGHT: verb first, matching the Command name
CompletedFocusInput // Command: FocusInput
CompletedLockScroll // Command: LockScroll
CompletedCloseDialog // Command: CloseDialog
CompletedFocusItems // Command: FocusItems

// WRONG: object first
CompletedInputFocus
CompletedScrollLock
CompletedDialogClose
CompletedItemsFocus
```

`Completed*` is not only for empty acknowledgments. A Command that resolves to a value with no meaningful failure still names its result after the Command, and the value rides along as the payload.

```ts
// RIGHT: the Message is named from the Command that caused it
const DetermineStartTime = FeatureDefinition.makeCommand('DetermineStartTime', {
  args: { elapsedMs: Schema.Number },
  messages: [Message.CompletedDetermineStartTime],

  handler: function* () {
    return ({ elapsedMs }) =>
      Clock.currentTimeMillis.pipe(
        Effect.map(now =>
          Message.CompletedDetermineStartTime({ startTime: now - elapsedMs }),
        ),
      )
  },
})
const GenerateCardId = FeatureDefinition.makeCommand('GenerateCardId', {
  args: { columnId: Schema.String },
  messages: [Message.CompletedGenerateCardId],

  handler: function* () {
    const crypto = yield* Crypto.Crypto

    return ({ columnId }) =>
      Effect.gen(function* () {
        const cardId = yield* Effect.orDie(crypto.randomUUIDv4)
        return Message.CompletedGenerateCardId({ cardId, columnId })
      })
  },
})
const SaveTodos = FeatureDefinition.makeCommand('SaveTodos', {
  args: { todos: Todos },
  messages: [Message.SucceededSaveTodos, Message.FailedSaveTodos],

  handler: function* () {
    return ({ todos }) =>
      saveTodos(todos).pipe(
        Effect.match({
          onFailure: () => Message.FailedSaveTodos(),
          onSuccess: () => Message.SucceededSaveTodos({ todos }),
        }),
      )
  },
})
const EffectsLayer = Layer.mergeAll(
  DetermineStartTime.layer,
  GenerateCardId.layer,
  SaveTodos.layer,
)

// WRONG: the Command verb conjugated to past tense
DeterminedStartTime
GeneratedCardId
SavedTodos
```

The exception is a Message with more than one cause. When several Commands resolve to the same Message, or a Command synthesizes a Message that a Subscription also emits, name it for the fact instead: `EndedAnimation` is produced both by the `WaitForAnimationSettled` Command and by component-specific movement or animation races, so no single Command owns the name.

Keep each `defineMessageUnion()` case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

#### Succeeded/Failed pairing

Every `Succeeded*` must have a corresponding `Failed*`:

```ts
const Message = defineMessageUnion({
  SucceededFetchWeather: { weather: Weather },
  FailedFetchWeather: { error: Schema.String },
})
type Message = typeof Message.Type
```

### Variables and Functions

- Name selectors for derived values and pure transitions for the changes they describe. Dedicated Message handlers use `handle<MessageTag>`. Use `init` for initialization functions, helpers, Steps and filenames. Use `init...IfMissingStep` when a Step preserves an existing occurrence and initializes an absent identity. Reserve `sync` and `observe` for actual synchronization or observation; Step construction and application do not execute Commands.
- Avoid opaque abbreviations: `signature` not `sig`, `message` not `msg`, `callbacks` not `cbs`
- Conventional technical shorthand is allowed when it is the normal domain spelling, such as `attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, and `VNode`; established API and DSL bindings such as `h` are also allowed
- Use descriptive callback parameters: `(tickCount) => tickCount + 1` not `(t) => t + 1`; prefer `toMessage` over an unexplained `f`
- Prefix Option values with `maybe`: `maybeCurrentUser`, `maybeSession`, `maybeError`. **`maybe*` is reserved for `Option<T>` specifically.** A helper named `maybePlaceholder` whose type is `string | undefined` is wrong: change the type to `Option<string>` (usually the better fix: optional fields at internal API boundaries should be `Option<T>` so the call site reads `Option.some(...)` / `Option.none()`, not bare `undefined`).
- Boolean fields use `is*`: `isPlaying`, `isVisible`, `isMenuOpen`
- Model fields containing `AsyncData` values use the `AsyncData` suffix: `workspaceAsyncData`, `weatherAsyncData`. Fields storing Query Models are child Block Models and do not take this suffix.
- Command variables named by action: `fetchWeather`, not `fetchWeatherCommand`
- Command names are verb-first imperatives: `FetchWeather`, `FocusButton`, `LockScroll`, `Tick`
- Callback parameters are immediately understandable: `(tickCount) => tickCount + 1` not `(t) => t + 1`
- Constants for magic numbers: `FINAL_PHOTO_INDEX` not `15`, `EXIT_COUNTDOWN_SECONDS` not `5`

### Schemas

- Capitalized string literals: `Schema.Literals(['Horizontal', 'Vertical'])` not `Schema.Literals(['horizontal', 'vertical'])`
- Capitalized namespace imports: `import * as ShoppingCart from './shoppingCart'`
- `Array<T>` or `ReadonlyArray<T>`, never `T[]`

## Effect-TS Patterns

### pipe

Use `pipe()` when the value being transformed should remain the subject of clear left-to-right data flow. A single transformation is valid when that order carries meaning:

```ts
// An ordinary function call stays direct.
Option.match(value, { onNone: () => ..., onSome: (x) => ... })

// An existing update result remains the subject.
pipe(dialogClose, Update.withOutMessage(outMessage))

// A multi-step transformation reads left to right.
pipe(
  maybeRoom,
  Option.flatMap(({ maybeGame }) => maybeGame),
  Option.map(({ text }) => text),
)
```

### Option (never null/undefined)

```ts
// Model fields
maybeError: Schema.Option(Schema.String) // not error: Schema.String with '' as none

// Conditional rendering (inside a view function, with its builder `h` in scope)
Option.match(model.maybeError, {
  onNone: () => h.empty,
  onSome: error => h.div([h.Class('text-red-500')], [error]),
})

// Conditional values with a meaningful predicate over the value
Option.liftPredicate(value, predicate) // not condition ? Option.some(value) : Option.none()

// Conditional commands
Array.fromOption(maybeCommand) // 0 or 1 command based on Option
Array.filter([command], () => condition) // Boolean-conditioned singleton
Array.filter(commands, () => condition) // Boolean-conditioned group
```

### Match (never switch)

```ts
// WRONG
switch (message._tag) {
  case 'ClickedSubmit':
    return { model }
}

// RIGHT: the owning Composition infers each handler's output
const update = FeatureComposition.makeUpdate({
  ClickedSubmit: model => ({ model }),
  UpdatedEmail: (model, { value }) => ({
    model: modifyFields(model, { email: () => value }),
  }),
})

// RIGHT: this standalone fold is pure, so R = never is accurate
const foldFormMessage = Message.match<Update.Step<Model, Message>>({
  ClickedSubmit: () => model => ({ model }),
  UpdatedEmail:
    ({ value }) =>
    model => ({
      model: modifyFields(model, { email: () => value }),
    }),
})
```

Author an exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record. Each case receives the contextual Model and exact Message payload, and operations retain the selected case's Command requirements and OutMessage contract. Use `makeUpdate.withContext(context => cases)` for additional dispatch arguments; the factory runs for local dispatch, not routed child-only delivery. Ordinary handlers return results directly; do not wrap every case with `makeStep`. A Model-preserving no-op record value is `makeNoopStep()`, not the bare factory.

`Composition.makeUpdate` accepts only an exhaustive handler record; its callback overload is removed. Use `makeUpdate({})` when there are no local Messages. Each handler receives `(model, message)`; name extracted single-Message handlers `handle<MessageTag>` and pass compatible handlers or Steps directly. Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names. If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected; ordinary raw-only handlers can return results directly. Do not hide errors with casts or broad return annotations: a later wrapper cannot recover channels already erased upstream.

Inside a `Composition.makeUpdate` handler, `Definition.makeStep`, or `Definition.makeOutMessageFold`, omit a matcher return generic and let the owner infer Command requirements, OutMessages, and graph evidence. `Update.Return<Model, Message>` and `Update.Step<Model, Message>` default their requirement parameter to `never`, so those annotations are accurate only for a standalone pure matcher. A pure matcher benefits from the contextual return type because an unconstrained generic matcher can widen nested literal tags before a later assignment. For a standalone matcher that returns Commands, wrap the producer with `Update.define` or `Update.defineStep`, or supply the complete requirement type when another public signature already defines it.

Use a `defineTaggedUnion` or `defineRouteUnion` namespace's `matchOrElse` for partial matches with a fallback. Use Effect `Match` for partial Message matches, one handler shared by several tags, or unions without their own matcher.

### Array module

```ts
// Use Effect's Array module, not native methods in pipe chains
Array.map(items, item => ...)
Array.filter(items, item => ...)
Array.match(items, {                  // empty / non-empty branching
  onEmpty: () => ...,
  onNonEmpty: (items) => ...,          // NonEmptyReadonlyArray
})
Array.isArrayEmpty(items)             // MUTABLE Array<A> only, see below
Array.isArrayNonEmpty(items)          // MUTABLE Array<A> only, see below
Array.findFirst(items, predicate)
Array.sort(items, order)
Array.fromOption(maybeItem)           // Option → 0 or 1 element array
Array.take(items, count)              // not .slice(0, n)
```

**`Array.match` is the one that works on a Model.** Both `isArrayEmpty` and
`isArrayNonEmpty` take a mutable `Array<A>`, so neither accepts the
`ReadonlyArray` that `Schema.Array(...)` decodes to:

```ts
const Model = Schema.Struct({ items: Schema.Array(Schema.String) })
type Model = typeof Model.Type

Array.isArrayEmpty(model.items)
// Argument of type 'readonly string[]' is not assignable to
// parameter of type 'string[]'

Array.match(model.items, { onEmpty: () => ..., onNonEmpty: items => ... }) // OK
```

Reach for `Array.match` by default. It takes `ReadonlyArray`, hands the
non-empty branch a `NonEmptyReadonlyArray`, and is what every example that
branches on a Model array uses. Keep the predicates for arrays you built
locally and never froze into the Model.

### String module

Effect's `String` module is **data-last curried only**. There is no data-first overload. Use it inside `pipe`/`flow`, not as a direct call:

```ts
// WRONG: Effect String functions don't take data-first
String.padStart(value.toString(), 2, '0')
String.startsWith('url', 'http')

// RIGHT: use in pipe/flow
pipe(value.toString(), String.padStart(2, '0'))
flow(String.toLowerCase, String.startsWith('http'))

// ALSO RIGHT: native methods when not composing
value.toString().padStart(2, '0')
url.startsWith('http')
```

The rule of thumb: **Effect `String` in pipes, native methods on named variables.** Don't force the Effect form into a non-composing call site just to avoid the native method.

### Effect pipeline tail operators

Tail operators on an Effect pipeline keep the Effect as the subject. This is idiomatic for Commands:

```ts
Effect.gen(function* () {
  // ...
  return Message.SucceededFetchWeather({ data })
}).pipe(
  Effect.catch(error =>
    Effect.succeed(
      Message.FailedFetchWeather({ error: globalThis.String(error) }),
    ),
  ),
  FetchWeather,
)
```

The `.pipe(Effect.catch(...), FetchWeather)` suffix keeps the yielded Effect first. Don't mechanically flatten it to `FetchWeather(Effect.catch(Effect.gen(...), ...))`. That reads inside-out and obscures the pipeline.

### Effect.ignore only when there's an error channel

`Effect.ignore` discards both the success value AND any error. If the Effect is infallible at the type level (`Effect.Effect<A>` with no error parameter), there's nothing to discard. `Effect.as(Message())` alone is enough.

```ts
// WRONG: pushUrl returns Effect.Effect<void>, no error to ignore
pushUrl(path).pipe(
  Effect.ignore,
  Effect.as(Message.CompletedNavigateInternal()),
)

// RIGHT: directly swap the void for the success Message
pushUrl(path).pipe(Effect.as(Message.CompletedNavigateInternal()))

// RIGHT: fallible Effect, handle the error then swap
httpClient.get(url).pipe(
  Effect.as(Message.SucceededFetch({ data })),
  Effect.catch(() => Effect.succeed(Message.FailedFetch())),
)
```

Same goes for `Dom` primitives: `Dom.focus` can fail (element may not exist), so `Dom.focus(selector).pipe(Effect.ignore, Effect.as(Message.CompletedFocusInput()))` is correct. But `pushUrl`, `load`, `back`, and `forward` from `foldkit/navigation` all return `Effect.Effect<void>`. Skip the `ignore`.

### Iteration

Never use `for` loops or `let` for iteration:

```ts
// WRONG
let result = []
for (const item of items) { result.push(transform(item)) }

// RIGHT
Array.map(items, transform)
Array.filterMap(items, maybeTransform)
Array.flatMap(items, toMultiple)
Array.makeBy(count, index => ...)
```

## Model Updates

Use `modifyFields()` for immutable updates:

```ts
import { modifyFields } from 'foldkit/struct'

// Update specific fields
modifyFields(model, {
  email: () => value,
  maybeError: () => Option.none(),
})

// Nested update: replace the nested struct entirely
modifyFields(model, {
  homeStep: () => SelectAction({ username, selectedAction: 'CreateRoom' }),
})

// Nested update: modify fields of the nested struct
modifyFields(model, {
  newLinkForm: () => modifyFields(model.newLinkForm, { title: () => value }),
})
```

When a `modifyFields` setter only transforms the current value of that same field, pass
the transformer directly:

```ts
// WRONG: re-reads the same field from the surrounding Model
modifyFields(model, {
  selectedEntryIds: () =>
    Array.filter(model.selectedEntryIds, id => id !== removedEntryId),
})
modifyFields(model, { currentStep: () => toNextStep(model.currentStep) })

// RIGHT: modifyFields supplies the current field value to the setter
modifyFields(model, {
  selectedEntryIds: Array.filter(id => id !== removedEntryId),
})
modifyFields(model, { currentStep: toNextStep })

// RIGHT: replacement values still use thunks
modifyFields(model, { email: () => value })
modifyFields(model, { child: () => nextChild })
```

A parent must not use a `modifyFields` transformer to change a child Block field. Call the child Binding's named operation, such as `EntriesBinding.requestRevealErrors(entryId)`, so the child update owns the transition. For several children, combine the Binding operations with `Update.combineSteps`. Pure selectors and values derived for view input remain ordinary helpers.

Choose parent inputs by ownership. Use view inputs for current render data and update context (`delivery.toUpdateContext`) for current data read while handling a Message. Use an `inform*` operation when an external event requires a child transition, Command, or OutMessage. View inputs and context do not dispatch Messages when their values change. Keep an independent editing baseline in the child Model when needed, while passing current comments or other display data through view inputs. Do not mirror parent data merely to read it, or notify a child back about a change it already applied unless another transition is required.

Never mutate the model directly. **Never use spread syntax for updates.** `modifyFields` is the canonical pattern. This applies to nested updates too: `modifyFields(model, { newLinkForm: () => ({ ...model.newLinkForm, title: value }) })` is wrong. Use a nested `modifyFields`: `modifyFields(model, { newLinkForm: () => modifyFields(model.newLinkForm, { title: () => value }) })`. The spread-inside-modifyFields pattern is a common mistake. You're using `modifyFields` at the outer level but bypassing it inside, which loses the invariant that all updates go through one codepath.

### Workflow ownership

Give independent interactions their own pending and failure state. A project save should not lock an unrelated issue move or share feedback that a background response can clear. Keep exclusivity explicit when the operations must serialize.

An editor owns its baseline, draft, and submission state. Decide whether navigation retains or removes that editor occurrence. Repeated URL delivery and data refresh must not silently reset dirty drafts. Retain an occurrence while hidden when its pending result must still update the parent. Apply mutation responses only to the data that operation owns; a delayed full snapshot must not replace unrelated newer changes.

Separate retention, rendering, and activity. A Route can select one child view while the parent retains several child Models by entity identity. A single Option slot preserves only its current identity. A retained child can receive pending results while hidden; a route-wide `delivery.when` rejection also rejects save completions. Gate only the Streams that the product needs to stop. Add interaction cleanup when required by the normal workflow; do not introduce application orchestration solely for unusual navigation/interleaving cases. Use Route Transitions when navigation policy depends on entry, exit, or changed payloads; data arrival can require a separate initialization Step.

## Update Results

Use an existing compatible Model-first Step directly in a `makeUpdate` handler record when the case only applies it: `ClickedOpenSearch: SearchBinding.requestOpen()`. Keep handler functions for payload-dependent or Model-dependent arguments, argument construction deferred until dispatch, dispatch context, and necessary generic contextual inference. This does not apply to payload-first `Message.match` branches.

Update, init, Step, and component helper producers return `{ model }` when they statically create no Commands. When they compute a Commands collection, return it directly without checking whether it is empty. Never write the literal `commands: []`.

Init constructs the baseline Model and may return initial Commands. Author it through the named Composition with `FeatureComposition.makeInit(fn)`. The Composition checks parent-owned Model fields, assembles registered child startup, and preserves exact arguments, Command requirements, and child evidence for assembly. Optional `boot` helpers are ordinary initial Steps called through a Binding after the child Model exists; Foldkit has no special Runtime boot phase, and a feature need not define both init and `boot` helpers. When an existing domain operation such as `requestOpen` or `requestRestore` already describes the transition, declare that Message-producing operation and call it through the Binding. Do not manufacture a separate startup-only Message when an existing Message already records the transition.

For a required exact direct field, omit `init` when the child's initializer can be called without arguments. A required-argument initializer uses `init: { contextToArgs }`; `init: false` makes the parent supply the initial field. An unkeyed optional direct field remains parent-owned when `init` is omitted; `init.contextToArgs` can choose `None` or automatic `Some(child)` creation. An exact keyed array uses `init.instances` and `init.toItem`. An exact Option-wrapped keyed occurrence uses the `field`, `key`, and `childField` shorthand but stays parent-owned until `Binding.init({ key, args, toParentModel })` creates it. Accessor storage likewise remains explicit. Plain tuple literals preserve contextual child parameters. Add an optional `ChildInitContext` Schema to the parent Definition when selectors share context for direct child initializer arguments. Return only parent-owned fields from Composition-owned init; use `childInitContext` for that decoded value and `steps` for ordered transitions after the complete Model exists. ChildInitContext does not describe the current Block's own init arguments:

```ts
const init = ApplicationComposition.makeInit(() => ({
  model: { username: '' },
  steps: [SettingsBinding.requestRestore()],
}))
```

For another update-shaped result, keep it together when composing it into another update. Name the result after the operation and use dot access. The same rule applies when a test consumes an update result:

```ts
const formSubmit = update(model, Message.SubmittedForm())

expect(formSubmit.model.status).toBe('Submitting')
expect(formSubmit.commands ?? []).toHaveLength(1)
```

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage` from an ordinary update-like result that already contains those fields. Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`. Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires a concrete array for spreading, concatenating, execution, or an assertion.

Name each concrete typed authoring value for its stage: `ChildDefinition = Block.makeDefinition('Child', ...)`, `ApplicationDefinition = Block.makeDefinition('Application', ...)`, `ChildComposition`, and `ApplicationComposition`. The runtime Block ID stays `Child` or `Application`. Export ordinary completed values as `ChildBlock` and `ApplicationBlock`; a generic UI factory uses `makeBlock` and returns an exact completed Block that its caller names locally. Declare it once at module scope and bind the returned value into the parent.

Keep the Definition binding only when code uses a Definition authoring member. When `makeComposition` would be its only use, inline the top-level factory call into the Composition declaration. For a split feature, move the contract imports and factory chain to `composition.ts` and remove the empty `definition.ts`. This keeps Definition, Composition, and assembly as distinct passive stages while creating the owner identity once at module evaluation.

Author one canonical `init` through the Composition and pass it to assembly by shorthand. Do not retain a raw Model-returning `init` and wrap it at the assembly call. A pure Model constructor with its own domain purpose may remain separate.

Author an ordinary Block from `Block.makeDefinition('Child', { Model, Message, OutMessage? })`. Retain `ChildDefinition` when Commands, Steps, Subscriptions, ManagedResources, or Bindings use it; otherwise chain the factory directly into the module-level Composition. The Definition owns those authoring capabilities. A generic API that shares identity across several typed contracts instead creates `ChildNamespace = Block.makeNamespace('Child')`, then calls `ChildNamespace.makeDefinition(...)` for each specialization. That Namespace may live outside the specialization factory. Create `ChildComposition = ChildDefinition.makeComposition({ bindings?, mounts? })`, author init, update, and the primary view through that Composition, return the unfinished value through `ChildComposition.prepareBlock(...)`, and assemble it with `Block.assemble(prepare)`. Export the completed value as `ChildBlock`. Its ordinary feature barrel exports `ChildBlock` with the matching checked producer/header annotation; its Model stays internal; reusable Schemas and pure utilities use an explicit domain barrel. Parent code imports the completed Block, creates a Binding with `ParentDefinition.makeBinding(ChildBlock, config)`, and includes it under `bindings` in `ParentDefinition.makeComposition(...)`. The authored parent `Message` contains only local facts. `ChildComposition.Message` and `ChildBlock.Message` are the complete dispatch contracts and include generated child envelopes. Parent-driven changes use named operations selected under `operations`. The completed Block aggregates child registrations and handler Layers; the Binding supplies the canonical view and captures generated delivery provenance through `binding.embedView`.

For ordinary source Blocks, place the existing preparation call in one private zero-argument producer named `prepare`, then put the checked completed export immediately after it with no blank line: `ChildBlock: Block.FromAssemblyWithView<typeof Model, typeof prepare> = Block.assemble(prepare)`. Use a descriptive producer name only when one file genuinely contains multiple preparation producers. Choose `FromAssemblyWithViewAndOutMessage`, `FromAssemblyWithOutMessage` or `FromAssemblyWithoutViewOrOutMessage` when the actual view/OutMessage contracts differ. `prepareBlock` returns an opaque unfinished assembly with no Model or runtime methods; `Block.assemble` invokes the producer exactly once during passive configuration and produces the branded Block accepted by Bindings, Programs, and Server rendering without running init, constructing Layers, or starting effects. These four explicit shapes keep the canonical Model boundary independent of whole-implementation inference while retaining framework contract checks. A parent Schema projection therefore does not force TypeScript through the entire implementation's inferred type graph. This can improve targeted checking and member completion; it does not eliminate all TypeScript latency. Parent Schemas use `ChildBlock.Model`; the feature barrel exports the completed Block and keeps Model, local Message, Definition and Composition internal. The recommended `foldkit/no-completed-block-model-in-schema` rule rejects known inferred completions in Schema construction but accepts its recognized checked boundary. Use actual helper imports and a matching declaration annotation, producer, and finisher; casts, `satisfies`, raw producer calls, annotations alone, and helper-shaped names are insufficient. `replaceEffectsLayer` and `provideHandlers` preserve the assembly brand and passive runtime value. Keep published generic UI contracts intact and never repeat a generic factory call to obtain a Model.

For a package shipping declarations, name each ordinary public completed contract with a same-name interface extending the matching checked `FromAssembly*<typeof Model, typeof prepare>`, followed by `export const FeatureBlock: FeatureBlock = Block.assemble(prepare)`. Keep producer, interface, and value adjacent as one assembly unit. A reusable named generic `Completed` interface can provide that boundary for a generic factory. JavaScript-only applications retain the existing checked value annotation. Verify declaration emission for actual public entrypoints and external consumption; `noEmit` alone is insufficient and there is no reliable child-count threshold. Naming the header prevents repeated child expansion, but it does not guarantee arbitrary root serialization or seal deliberate ambient augmentation.

Declare a Block's ManagedResource identity once at module scope with `ChildDefinition.makeResource<Value>()('LocalName')`. Export and reuse that binding in the ManagedResource entry and in every Command that reads `.get`. The Definition qualifies the runtime key with the Block ID and keeps the resource alongside its lifecycle owner. Use low-level `ManagedResource.tag` only for a deliberately standalone registry that has no Block Definition.

An authored update supports `update(model, message, ...context)` for Runtime dispatch and `update(message)(model, ...context)` as an internal Step. Put the local Message constructor directly under `operations` for a public operation that forwards its payload into that Message. Assembly creates the callable operation without constructing a Message. A constructor with fields takes one constructor payload object followed by update context, with constructor defaults honored; an empty-fields constructor takes no payload placeholder. Keep a tuple producer under `operations` when public inputs need mapping, refinement, defaults, or an exact context tuple. Both forms pass the Message through update synchronously as part of the pure transition. Keep standalone Steps for internal Model transformations. Adapt a required-context curried update to the unary Step expected by `Update.combineSteps` with an explicit function that supplies that context.

Parent-facing operation names describe the communication: `requestCloseMenu` produces `Message.RequestedCloseMenu`, `informJoined` produces `Message.InformedOfJoin`, and `informRouteChanged` produces `Message.InformedOfRouteChange`. Use `request*` for actions and `inform*` for notifications. Both enter child update; avoid silent `reflect*` Model synchronization. Keep an actual UI fact separate when it represents a different event.

Record-authored updates retain each selected Message handler's output contract, including exact Command requirements and OutMessages. A producer selecting several Messages retains their possible outputs; update utilities retain the union across all handlers. Calling a pure operation does not run effects from another branch. Precision depends on the visible return contracts of any extracted helpers.

Select an alternate whole local handler bundle through `ChildBlock.replaceEffectsLayer(localRecipe)` before binding the child. The selected Block keeps its child recipes. Ordinary application tests usually retain its handlers and replace their service providers instead.

A Binding's `write` or `writeAt` places the next child Model into parent storage. Keep parent reactions to child transitions in its OutMessage policy. Do not compare old and new child state in a writer to generate announcements, trigger sibling changes, or maintain unrelated parent fields. Nested storage, keyed replacement, presence checks, and preservation of wrapper metadata remain legitimate custom writes. If a parent needs a child fact that is not exposed, add a truthful public OutMessage rather than using the writer as an event hook.

An empty record returned by `makeFieldsStep` preserves the exact incoming Model and evaluates no field transformers. `FieldTransforms<Model>` from `foldkit/struct` is available when a helper genuinely accepts a field-update record; it follows ordinary structural typing and does not enforce exact keys or Model-variant relationships alone. For a local policy helper that gates Model changes, accept a Model-to-Model callback and keep `modifyFields` at the call site, preserving its field validation without duplicating generic machinery in application code.

For a child stored in an exact `Schema.Struct` field as `ChildModel` or `Option<ChildModel>`, use `ParentDefinition.makeBinding(ChildBlock, { field })`; the field is the default placement. A direct Option field is absent while `None`, and folds never create it. Reuse the child Model Schema instance for an opaque declaration whose decoded shape cannot be compared. Add `presentWhen` only when parent policy gates the entire direct child. Use `makeVariantBinding` from `foldkit/variantBinding` when the child occupies one complete tagged member of the parent `Schema.Union`, including the actual child Model Schema. Use explicit `read` and `write` for nested, wrapped, or custom storage. A custom keyed Binding provides `readAll`, `key`, `keySchema`, `read`, and `writeAt`. Put admission policy in `delivery.when` and derive required child update context with `delivery.toUpdateContext`; these callbacks receive the occurrence key for keyed storage. The Composition generates the child envelope and records its placement, key, and live generation. Do not add a child wrapper to the authored parent Message or write `parentMessage`, `toParentMessage`, or `fromParentMessage` mappings. A child whose Message Schema is `Schema.Never` needs no delivery policy. Placement identifies the Binding in the parent composition graph; a keyed occurrence's key is nested under that placement. The Binding projects `init`, `fold`, named operations, and `embedView`. Declare eligible startup with `init` and let `Composition.makeInit` assemble it. Custom storage, deliberate Command interleaving, and dynamic creation use the exact registered `ChildBinding.init({ key?, args, toParentModel, commands? })`. It returns a passive recipe with no `.model` or `.commands`. Return it directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through the parent's `makeStep` producer. The Composition authoring boundary interprets it directly. The compiler checks exact key, args, parent Model, requirements, and Binding requirement, while runtime validation during checked execution checks the active composition frame, schema-equivalent child placement, and exactly one requested keyed occurrence. Ordinary Model construction remains available.

`ChildBinding.fold` is the projected primitive Composition invokes for a registered generated child delivery. Framework adapters and focused tests may call it directly when they already own a child Message. Parent-driven transitions use named operations. Both folds and Binding-projected operations are connected Steps whose Model input requires the exact registered graph. Typed calls with the raw domain Model fail. Include named operations in `Composition.makeInit` startup or apply them to the contextual Model inside the owning `Composition.makeUpdate`. Return or compose their opaque results intact; no `.model` or `.commands` fields are available before checked execution, and the result cannot narrow to a useful `{ model }` return. A raw recipe exposes only direct channels. The Composition resolves registered policy into the final parent Command Message, requirements, and OutMessage channels, so derive exported parent contracts from the Composition-authored update or completed Block. A completed `ChildBlock.operations.operation(model, ...args)` dispatches the produced Message through the Block's update and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may erase a connected Binding function's result through a method returning `void`; outside the graph, that invocation only constructs and discards passive configuration and executes no child work.

Use `Update.combineSteps` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combineSteps`; call that operation directly. Name an inline Step parameter `stepModel` when combining several; it receives the Model from the preceding Step.

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper: `pipe(dialogClose, Update.withOutMessage(outMessage))`. When constructing the plain return in the same expression, pass it first: `Update.withOutMessage({ model, commands }, outMessage)`.

Inline an ordinary unkeyed policy as
`makeBinding(WholeChildBlock, ...).withOutMessagePolicy({ fold: FeatureDefinition.makeOutMessageFold(WholeChildBlock, handlers) })`.
Every fold passes the whole completed child explicitly, whether inline,
extracted, adapted for keyed policy, or staged for reciprocal composition.
Name every variant directly, including a singleton union. Command requirements
and sibling Binding evidence are inferred from the returned Steps and checked
by Composition. Do not repeat Step or payload generics or wrap a child matcher.
Take the inferred `FoldContext` as a handler's second argument only when it uses
`liftCommand` or `modelBeforeUpdate`.

Inline a callable forward as `FeatureDefinition.makeOutMessageForward(handlers)`
under the same unkeyed Binding policy when the parent declares OutMessages.
Pass the whole completed child explicitly when extracting the forward, adapting
keyed policy, or staging reciprocal composition. Name every child variant,
return a declared parent OutMessage or `undefined`, and forward at least one
variant. Register the full policy-selected Binding.

Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

In a split feature, export the Step helpers used by the implementation from `definition.ts` and named-import them in implementation modules. In a colocated feature, destructure those helpers beside the Definition in the scope that uses them. Keep Definition-qualified calls when several Definitions in one module need visible ownership. Feature barrels keep authoring helpers private and export the completed Block.

Put reusable parent Steps shared by update, composition, or init in the owning Block's `steps.ts`, or in responsibility modules such as `steps/search.ts` with an explicit `steps/index.ts` barrel. Ownership follows the Model being transformed. Keep Message routing in update and Binding registration and child OutMessage policy in composition; colocate Steps used by only one responsibility. Preserve the `Step` suffix and defer cyclic Binding access until the producer is applied.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

Choose the helper when authoring a Step. Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep existing reusable operations, sequential composition, and Definition-owned local Steps needed when mixing local branches with connected recipes; those preserve result channels and registration evidence.

When a Binding handles an OutMessage locally, select the callable fold under `withOutMessagePolicy({ fold })`. Add the callable `forward` only for variants that continue upward. A derived parent OutMessage takes precedence over forwarding for that dispatch.

For dynamic initialization that only places a child, use the optional
`foldkit/bindingInit` helpers with the Binding, current parent Model and child
`args`, plus `key` for keyed storage. Use `initAndSet` for required/optional direct
fields and keyed Option wrappers containing only the key and child fields. A
custom unkeyed accessor may reuse its existing `init.toParentFields` projection.
Use `initAndAppend` for keyed arrays already declaring `init.instances` and
`init.toItem`, or `initAndInsert` for direct-value Record/HashMap storage from
`ParentDefinition.makeMapBinding`. Destructure and export the factory from a split
feature's `definition.ts`, then import it from that owning module. Append and insert
reject duplicate keys. Keep explicit `Binding.init`
for additional wrapper metadata, sibling changes, parent Commands, array/map
replacement or whole tagged variants. Do not add an unnecessary startup policy
for a helper. Preserve recipes intact so child Commands and registration survive.

Use `makeInitIfMissingStep(Binding, { key, args })` from `foldkit/bindingInit`
when a direct-value Record/HashMap child should be retained if already present.
It derives the field from the Binding and returns a connected Step, preserving
the exact parent Model and emitting no Commands on reuse. An absent key retains
the child's init Commands. Both paths require the registered Binding. Pass the
Step directly to `Update.combineSteps` or a compatible handler; use the owning
`makeStep` when selecting or combining Steps. Keep URL entity lookup in the app.

## Schema Constructors

Declare each Schema's decoded type immediately below it, using the same name
and no blank line: `const Foo = Schema.Struct(...)` followed by
`type Foo = typeof Foo.Type`. Export both when they belong to the module's
public surface. Prefer `Foo` in decoded-value annotations; use `typeof Foo`
when an API needs the Schema type. Keep local Model, Message, and OutMessage
aliases in the owning feature. A consumer can name a type from the completed
child, such as `type ChildModel = typeof ChildBlock.Model.Type`, without
importing its implementation. Parent Schema construction uses the checked
completed `ChildBlock.Model`. Let owned callbacks infer their parameters.

Construct Schema values through their actual constructors, never casts.
Foldkit union variants are callable. When explicitly constructing a complete
Effect `Schema.Struct` value, use `.make`. Contextually checked records, such as
the parent-owned fields returned to Composition init, can remain plain records.
Keyed `init.toItem` wrappers must remain plain records containing the exact
initialized child object; a wrapper Schema constructor can reconstruct that
child and fail runtime validation. Composition constructs the full parent Model
after collecting those wrappers.

```ts
// WRONG: manual object with cast
{ _tag: 'ClickedSubmit' } as Message

// RIGHT: callable constructor
Message.ClickedSubmit()

// WRONG: manual tagged object
{ _tag: 'Loading' } as DataState

// RIGHT: callable constructor
DataState.Loading()

// With fields
Message.SucceededFetch({ data: response })

// A Struct Schema uses .make, not Model(...).
Model.make({ count: 0 })
```

Keep Message and OutMessage constructors on their owning namespace. Never
destructure them into sibling bindings. `Message.ClickedSubmit()` preserves the
domain at the call site in a way that `ClickedSubmit()` does not.

**No-field variants take no argument, not an empty object.** A variant declared with an empty field record produces a callable that accepts no argument:

```ts
const Timer = defineTaggedUnion({
  Work: {},
  Idle: {},
  Paused: { remainingMs: Schema.Number },
})
type Timer = typeof Timer.Type
const Message = defineMessageUnion({ ClickedSubmit: {} })
type Message = typeof Message.Type

// WRONG: empty object is redundant and non-idiomatic
Timer.Work({})
Timer.Idle({})
Message.ClickedSubmit({})

// RIGHT: call with no argument
Timer.Work()
Timer.Idle()
Message.ClickedSubmit()

// Only pass an object when the variant has fields
Message.SucceededFetch({ data: response })
Timer.Paused({ remainingMs: 400_000 })
```

`Timer.Work()` makes it clear that the variant has no payload. `Timer.Work({})` makes the reader look for fields that are not there. The empty-object form compiles, but Foldkit uses the no-argument form throughout its examples.

## Discriminated Unions for State

Use tagged unions, not booleans or nullable fields:

```ts
// WRONG
const Model = Schema.Struct({
  isLoading: Schema.Boolean,
  hasError: Schema.Boolean,
  data: Schema.Option(Data),
})

// RIGHT
const FetchState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Error: { error: Schema.String },
  Ok: { data: Data },
})
type FetchState = typeof FetchState.Type

const Model = Schema.Struct({
  fetchState: FetchState,
})
type Model = typeof Model.Type
```

`defineTaggedUnion` names each variant once. It returns a Schema and a namespace:
`FetchState.Ok({ data })` constructs a value, while
`FetchState.match(model.fetchState, { ... })` handles every variant. Use
`FetchState.matchOrElse(model.fetchState, { ... }, fallback)` when selected
variants need handlers and the rest share a fallback. Use `guards` and
`isAnyOf` when only selected variants need checking.

For **remote data**, don't write that union at all. `AsyncData` ships it, with two states hand-rolled versions always miss:

```ts
const DataAsyncData = AsyncData.Schema(Data, Schema.String)
type DataAsyncData = typeof DataAsyncData.schema.Type

const Model = Schema.Struct({
  dataAsyncData: DataAsyncData.schema,
})
type Model = typeof Model.Type
```

`Idle | Loading | Refreshing | Failure | Stale | Success`. `Refreshing` holds the previous data during a reload so a refetch doesn't blank the screen; `Stale` holds previous data alongside the new error so a failed reload doesn't throw away what the user was reading. Hand-rolling the four-state version bakes both regressions in. Keep `defineTaggedUnion` for state that isn't remote data: form steps, editor modes, connection phases.

For form field validation:

```ts
const ValidationState = defineTaggedUnion({
  NotValidated: {},
  Validating: {},
  Valid: {},
  Invalid: { error: Schema.String },
})
type ValidationState = typeof ValidationState.Type
```

For multi-step flows:

```ts
const SignupStep = defineTaggedUnion({
  EnterEmail: { email: Schema.String },
  EnterPassword: { email: Schema.String, password: Schema.String },
  Confirming: { email: Schema.String },
})
type SignupStep = typeof SignupStep.Type
```

Use `taggedStruct` when the variants cannot be declared together:

- A recursive union.
- A union assembled from variants owned by different modules.
- A tagged child struct that is not a union variant.
- A variant created inside a generic Schema factory.

## Code Style

- No inline or block comments. If code needs explanation, use better names
- A short section header is allowed when a long file has a substantial group that benefits from wayfinding. Do not add routine architecture headers to small application or example files.
- TSDoc (`/** ... */`) on public exports
- Always use braces for control flow: `if (foo) { return true }` not `if (foo) return true`
- Use direct `value === undefined` and `value !== undefined` comparisons for undefined checks.
- Use `const` exclusively. `let` only when mutation is truly unavoidable
- Prefer curried, data-last functions that compose in `pipe` chains
- No dead code, no empty catch blocks, no placeholder types

## Conditional Styles with clsx

In Tailwind applications, repeated static control recipes belong in the stylesheet's `@layer components`, which ordinary utilities can override. Use `@utility` for a custom utility that needs variant support. Keep `clsx` for actual conditional composition rather than exporting chains of static class strings from TypeScript. See [Tailwind's custom-style guidance](https://tailwindcss.com/docs/adding-custom-styles#adding-component-classes).

Use `clsx` for conditional class composition. Never string concatenation, template literals, or `&&` expressions. Use the object syntax `{ 'class-name': condition }` for conditional classes:

```ts
import clsx from 'clsx'

// Conditional classes based on boolean state: use object syntax
Class(clsx('px-4 py-2 rounded', { 'bg-blue-500 text-white': isActive }))

// Multiple conditions in one object
Class(
  clsx('text-sm border', {
    'border-red-500': field._tag === 'Invalid',
    'border-green-500': field._tag === 'Valid',
  }),
)

// Combining base classes with computed class strings
const borderClass = (field: Field<string>): string =>
  FieldValidation.match(field, {
    onNotValidated: () => 'border-gray-300',
    onValidating: () => 'border-blue-300',
    onValid: () => 'border-green-500',
    onInvalid: () => 'border-red-500',
  })
Class(clsx('w-full px-3 py-2 border rounded-md', borderClass(field)))
```

`clsx` is a project dependency. Add it to `package.json` when generating apps that use conditional styles.

## Imports

Standard import block for a Foldkit app:

```ts
import clsx from 'clsx'
import {
  Array,
  Effect,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  String,
  pipe,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/http'
import {
  AsyncData,
  Calendar,
  Command,
  Dom,
  FieldValidation,
  File,
  Http,
  Runtime,
  Subscription,
  Update,
  Url,
} from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion } from 'foldkit/route'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog, Input } from '@foldkit/ui'
```

Two component names collide with `foldkit` module names: `Calendar` (the date
module) and `Toast`. Alias the component with a `Ui` prefix, which is what the
exemplars do:

```ts
import { Calendar } from 'foldkit'

import { Calendar as UiCalendar, Toast as UiToast } from '@foldkit/ui'
```

`Calendar.CalendarDate` is then the date type and `UiCalendar.view` the
component. Alias the `foldkit` side instead (`Calendar as FoldkitCalendar`) when
the component is the one used throughout the file.

For form validation, also:

```ts
import {
  Field,
  Invalid,
  NotValidated,
  Rule,
  Valid,
  Validating,
  allValid,
  makeRules,
  validate,
} from 'foldkit/fieldValidation'
```

Notes:

- Only import what you actually use in the file. The lint pass catches unused imports.
- Module-by-module reminders, for example: `Calendar` for `Calendar.CalendarDate`, `Calendar.today.local`, `Calendar.make`, `Calendar.addDays` etc., paired with the `Calendar` or `DatePicker` component from `@foldkit/ui` (the component and the `foldkit` date module share the name `Calendar`; they are different things). `Dom` for DOM-side-effect helpers (`Dom.focus`, `Dom.scrollIntoView`, `Dom.showDialog`, `Dom.closeDialog`, `Dom.lockScroll`, `Dom.unlockScroll`, `Dom.waitForAnimationSettled`, etc.). `File` for file upload primitives paired with `FileDrop` from `@foldkit/ui`. `foldkit/fieldValidation` for form validation.
- For time, randomness, or delays, use Effect's built-ins directly rather than reaching for a Foldkit module: `Clock.currentTimeMillis`, `Random.nextIntBetween`, `Effect.sleep(Duration.millis(...))`. For UUIDs, use the `Crypto.Crypto` service's `randomUUIDv4` Effect and provide the platform Crypto Layer (`BrowserCrypto.layer` from `@effect/platform-browser`) at the application root.
- Import Effect modules by their PascalCase names. When an Effect module name collides with a JavaScript or TypeScript global, qualify the global through `globalThis`, such as `globalThis.String`, `globalThis.Array`, or `globalThis.Record`. When an existing local or public binding must retain the module name, give the Effect import an explicit `Effect` prefix, such as `Order as EffectOrder`.
- `Message.match` is the exhaustive matcher on a union returned by `defineMessageUnion()`. A `defineTaggedUnion` or `defineRouteUnion` namespace owns exhaustive `match` and partial `matchOrElse`. `Match` is Effect's Match module for partial Message matching, handlers shared by several tags, and unions without their own matcher.
- **UI components live in a separate package.** Import them by name from `@foldkit/ui`: `import { Dialog, DatePicker, FileDrop, Toast, Tooltip } from '@foldkit/ui'`. Deep imports (`@foldkit/ui/dialog`) work too. There is no `Ui` export on the `foldkit` package, so `Ui.Dialog.view` does not resolve.
- **`empty` and `keyed` are properties on `h`**, the builder every view receives as its last parameter. They are not top-level exports of `foldkit/html`, so they never belong in that import list. Same for `h.block`.
- `AsyncData` for remote data state, `Update` for the update return type and the `combineSteps` / `refresh` combinators, `Http` for the `layer` that provides `HttpClient` to a Command.
- HTTP types come from `effect/http`, not `@effect/platform`. `@effect/platform-browser` is a separate package used for `BrowserKeyValueStore` and `BrowserCrypto`.
