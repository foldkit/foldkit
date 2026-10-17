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
| `Got*`       | Child module OutMessage                     | `GotHomeMessage`, `GotRoomMessage`                  |
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
const DetermineStartTime = Feature.command('DetermineStartTime', {
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
const GenerateCardId = Feature.command('GenerateCardId', {
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
const SaveTodos = Feature.command('SaveTodos', {
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
```

### Variables and Functions

- Avoid opaque abbreviations: `signature` not `sig`, `message` not `msg`, `callbacks` not `cbs`
- Conventional technical shorthand is allowed when it is the normal domain spelling, such as `attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, and `VNode`; established API and DSL bindings such as `h` are also allowed
- Use descriptive callback parameters: `(tickCount) => tickCount + 1` not `(t) => t + 1`; prefer `toMessage` over an unexplained `f`
- Prefix Option values with `maybe`: `maybeCurrentUser`, `maybeSession`, `maybeError`. **`maybe*` is reserved for `Option<T>` specifically.** A helper named `maybePlaceholder` whose type is `string | undefined` is wrong: change the type to `Option<string>` (usually the better fix: optional fields at internal API boundaries should be `Option<T>` so the call site reads `Option.some(...)` / `Option.none()`, not bare `undefined`).
- Boolean fields use `is*`: `isPlaying`, `isVisible`, `isMenuOpen`
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

// RIGHT
Message.match<Update.Return<Model, Message>>(message, {
  ClickedSubmit: () => ({ model }),
  UpdatedEmail: ({ value }) => ({
    model: modifyFields(model, { email: () => value }),
  }),
})
```

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
  entries: () => Array.map(model.entries, Entry.revealErrors),
})
modifyFields(model, { currentStep: () => toNextStep(model.currentStep) })

// RIGHT: modifyFields supplies the current field value to the setter
modifyFields(model, { entries: Array.map(Entry.revealErrors) })
modifyFields(model, { currentStep: toNextStep })

// RIGHT: replacement values still use thunks
modifyFields(model, { email: () => value })
modifyFields(model, { child: () => nextChild })
```

This applies to component reflect helpers too, which are dual: called data-last, `Slider.reflectRange({ min: minPrice, max: maxPrice })` returns a setter for the existing `Slider.Model` (mirroring URL-owned price bounds onto the slider), so use it directly in the `priceSlider` field instead of closing over `model.priceSlider`.

Never mutate the model directly. **Never use spread syntax for updates.** `modifyFields` is the canonical pattern. This applies to nested updates too: `modifyFields(model, { newLinkForm: () => ({ ...model.newLinkForm, title: value }) })` is wrong. Use a nested `modifyFields`: `modifyFields(model, { newLinkForm: () => modifyFields(model.newLinkForm, { title: () => value }) })`. The spread-inside-modifyFields pattern is a common mistake. You're using `modifyFields` at the outer level but bypassing it inside, which loses the invariant that all updates go through one codepath.

## Update Results

Update, init, Step, and component helper producers return `{ model }` when they statically create no Commands. When they compute a Commands collection, return it directly without checking whether it is empty. Never write the literal `commands: []`.

Init constructs the baseline Model and may return initial Commands. Author it through the named Composition with `FeatureComposition.makeInit(fn)`. The Composition checks parent-owned Model fields, assembles registered child startup, and preserves exact arguments, Command requirements, and child evidence for completion. Optional `boot` helpers are ordinary initial Steps called through a Binding after the child Model exists; Foldkit has no special Runtime boot phase, and a feature need not define both init and `boot` helpers. When an existing domain operation such as `open` or `restore` already describes the transition, expose that Step instead. Do not manufacture a Message only to trigger startup behavior.

For a required exact direct field, omit `init` when the child's initializer can be called without arguments. A required-argument initializer uses `init: { args }`; `init: false` makes the parent supply the initial field. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted. Use explicit `init.args` or `init.occurrences` for automatic presence, with plain tuple literals for the contextual child parameters. Add an optional `Startup` Schema to the parent Definition when selectors share input. Return only parent-owned fields from Composition-owned init; use `startup` for that decoded value and `steps` for ordered transitions after the complete Model exists:

```ts
const init = ApplicationComposition.makeInit(() => ({
  model: { username: '' },
  steps: [SettingsBinding.restore()],
}))
```

For another update-shaped result, keep it together when composing it into another update. Name the result after the operation and use dot access. The same rule applies when a test consumes an update result:

```ts
const formSubmit = update(model, Message.SubmittedForm())

expect(formSubmit.model.status).toBe('Submitting')
expect(formSubmit.commands ?? []).toHaveLength(1)
```

When the operation name collides with the function, use a trailing underscore such as `init_`. Do not destructure or rename `model`, `commands`, or `outMessage` from an ordinary update-like result that already contains those fields. Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`. Pass optional Commands directly to APIs that accept them, including `Command.mapMessages`. Use `result.commands ?? []` only when the next operation requires a concrete array for spreading, concatenating, execution, or an assertion.

Author an ordinary Block through `const Child = Block.define('Child', { Model, Message, OutMessage? })`. The Definition owns Commands, Steps, Subscriptions, ManagedResources, and Bindings. Use one-argument `Block.define('Child')` followed by `.define(...)` only to establish shared early identity for a generic API that specializes several typed contracts; that identity may live outside the specialization factory. Create `ChildComposition = Child.makeComposition({ childBindings?, mounts? })`, author init, update, and the primary view through that Composition, and complete the same value through `ChildComposition.makeBlock(...)`. Export the completed value as `block`, and export `* as Child` from the parent barrel. Parent code imports that namespace, creates a Binding with `Parent.bindChild(Child.block, config)`, and includes it under `childBindings` in `Parent.makeComposition(...)`. The parent Composition routes claimed wrapper Messages into the Binding's native fold; parent-driven changes use named operations selected under `expose`. The completed Block aggregates child registrations and handler Layers; the Binding supplies the canonical view and Message wrapper through `binding.embedView`.

Select an alternate whole local handler bundle through `block.replaceEffectsLayer(localRecipe)` before binding the child. The selected Block keeps its child recipes. Ordinary application tests usually retain its handlers and replace their service providers instead.

For a child stored in an exact `Schema.Struct` field as `ChildModel` or `Option<ChildModel>`, use `Parent.bindChild(Child.block, { field, parentMessage })`; the field is the default placement and the Composition routes the wrapper automatically when child update has no context parameters. Optional or defaulted context also needs explicit `fromParentMessage.args`. A direct Option field is absent while `None`, and folds never create it. Reuse the child Model Schema instance for an opaque declaration whose decoded shape cannot be compared. Add `presentWhen` only when parent policy gates the entire direct child. Use explicit `read` and `write` for nested, tagged, or custom storage, and `toParentMessage` when the outgoing wrapper is custom. Keyed, custom, and contextful mappings declare `fromParentMessage: { parentMessage, args }`; return `Option.some` of the Binding's native fold arguments, or `Option.none()` to ignore a stale or inactive delivery. Use `fromParentMessage: false` when no incoming wrapper route exists. Placement identifies the Binding in the parent composition graph; a keyed occurrence's key is nested under that placement. The Binding projects `init`, `fold`, named operations, and `embedView`. Declare eligible startup with `init` and let `Composition.makeInit` assemble it. Custom storage, deliberate Command interleaving, and dynamic creation use the exact registered `ChildBinding.init({ key?, args, toParentModel, commands? })`. It returns a passive recipe with no `.model` or `.commands`. Return it directly from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through the parent's `step` producer. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step. The compiler checks exact key, args, parent Model, requirements, and Binding requirement, while runtime validation during checked execution checks the active composition frame, schema-equivalent child placement, and exactly one requested keyed occurrence. Ordinary Model construction remains available.

`ChildBinding.fold` and exposed operations are connected Steps whose Model input requires the exact registered graph. Typed calls with the raw domain Model fail. Apply them to the contextual Model inside the owning `Composition.makeUpdate`, include them in `Composition.makeInit` startup, or preserve them through the parent's `step` producer. Return or compose their opaque results intact; no `.model` or `.commands` fields are available before checked execution, and the result cannot narrow to a useful `{ model }` return. A completed `block.expose.operation(model, ...args)` is a checked raw-Model executor and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may erase the result through a method returning `void`; outside the graph, that invocation only constructs and discards passive configuration and executes no child work.

Use `Update.combine` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combine`; call that operation directly. Name an inline Step parameter `stepModel` when combining several; it receives the Model from the preceding Step.

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper: `pipe(dialogClose, Update.withOutMessage(outMessage))`. When constructing the plain return in the same expression, pass it first: `Update.withOutMessage({ model, commands }, outMessage)`. Add `outMessage.forward` only when at least one child OutMessage should continue to the current Block's parent. For partial forwarding, match every child variant and return `undefined` for the variants that stop here. Omit `outMessage.forward` when every variant stops here. `outMessage.fold` still handles each variant locally, including variants that continue upward. Never write `outMessage.forward: () => undefined`.

Bind an exhaustive child OutMessage matcher directly as
`fold<Child>OutMessage` when it needs only the OutMessage. Do not wrap it in a
function that only forwards its argument to `Child.OutMessage.match`. Keep a
function or factory when matcher branches consume other per-dispatch context,
including a collection key, previous Model state, an entry payload, or
`FoldContext` lifters. Use the same direct matcher form for a
`outMessage.forward` mapper that needs only the OutMessage. Name every variant,
including a singleton union. Pass a generic child's refined OutMessage type as
the matcher's second generic. When a branch returns a Command-producing
`Feature.step`, preserve its inferred Command requirements instead of
constraining the matcher to a requirement-free `Update.Step`.

When a Binding handles an OutMessage locally, put the exhaustive matcher in `outMessage.fold`. Add `outMessage.forward` only for variants that continue upward. A derived parent OutMessage takes precedence over direct forwarding for that dispatch.

## Schema Constructors

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
const Message = defineMessageUnion({ ClickedSubmit: {} })

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

const Model = Schema.Struct({
  fetchState: FetchState,
})
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

const Model = Schema.Struct({
  data: DataAsyncData.schema,
})
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
```

For multi-step flows:

```ts
const SignupStep = defineTaggedUnion({
  EnterEmail: { email: Schema.String },
  EnterPassword: { email: Schema.String, password: Schema.String },
  Confirming: { email: Schema.String },
})
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
- Use `const` exclusively. `let` only when mutation is truly unavoidable
- Prefer curried, data-last functions that compose in `pipe` chains
- No dead code, no empty catch blocks, no placeholder types

## Conditional Styles with clsx

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
- `AsyncData` for remote data state, `Update` for the update return type and the `combine` / `refresh` combinators, `Http` for the `layer` that provides `HttpClient` to a Command.
- HTTP types come from `effect/http`, not `@effect/platform`. `@effect/platform-browser` is a separate package used for `BrowserKeyValueStore` and `BrowserCrypto`.
