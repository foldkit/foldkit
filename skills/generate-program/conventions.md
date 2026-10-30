# Foldkit Conventions Guide

> **Note:** This file is a snapshot of the conventions practiced in the live Foldkit codebase. If anything here contradicts the project's `FOLDKIT.md`, `repos/foldkit/examples/`, or `repos/foldkit/packages/foldkit/src/`, the live code is canonical. The duplication is intentional so the skill works in downstream projects that haven't vendored the foldkit subtree.

## Naming

### Blocks and Layers

Name a Block class for the feature it is (`Search`, `IssueBoard`, `Application`) and its Layer with a `Live` suffix (`SearchLive`, `ApplicationLive`). The class's string id matches the class name. Name the root Service provider `ApplicationLayer` and its test alternative `ApplicationTestLayer`. Name the root Route union `ApplicationRoute`. Reserve `Layer` for the Effect module.

A generic factory is called once at module scope and the result is named for its role: `const ResultListbox = Listbox.makeBlock<Result>()`, provided as `ResultListbox.Live`.

Name a declared instance for what it is in the parent: `const search = yield* new Search('search', ...)`, `const column = yield* Column.each('columns', ...)`. The instance id matches the Model field it is stored in, or the collection name for `each`.

### Messages

Messages use past-tense, verb-first naming. The verb prefix acts as a category marker:

| Prefix        | Meaning                                     | Example                                             |
| ------------- | ------------------------------------------- | --------------------------------------------------- |
| `Clicked*`    | Button/link press                           | `ClickedSubmit`, `ClickedDeleteItem`                |
| `Updated*`    | Input value change or external state change | `UpdatedEmail`, `UpdatedSearchQuery`, `UpdatedRoom` |
| `Submitted*`  | Form submission                             | `SubmittedLoginForm`, `SubmittedComment`            |
| `Pressed*`    | Keyboard input                              | `PressedKey`, `PressedEnter`                        |
| `Blurred*`    | Focus loss                                  | `BlurredEmailInput`, `BlurredPasswordInput`         |
| `Selected*`   | Choice made                                 | `SelectedFilter`, `SelectedTab`                     |
| `Toggled*`    | Binary state flip                           | `ToggledDarkMode`, `ToggledSidebar`                 |
| `Requested*`  | A parent's request to a child               | `RequestedClear`, `RequestedOpen`                   |
| `InformedOf*` | A parent's notification to a child          | `InformedOfRouteChange`, `InformedOfQuery`          |
| `Succeeded*`  | Async success (fallible)                    | `SucceededFetchWeather`, `SucceededLogin`           |
| `Failed*`     | Async failure (fallible)                    | `FailedFetchWeather`, `FailedLogin`                 |
| `Completed*`  | Command result                              | `CompletedFocusInput`, `CompletedLockScroll`        |
| `Ticked*`     | Timer/interval tick                         | `TickedClock`, `TickedFrame`                        |

`Updated*` covers both user input changes (`UpdatedEmail`) and external state updates from Streams (`UpdatedRoom`). The prefix describes the fact ("the value was updated"); whether it came from a keystroke or a WebSocket doesn't change the category.

`Requested*` and `InformedOf*` are Messages a parent sends with `model.child.send(...)`. They are still facts: "the parent requested a clear", "the parent was informed of a route change". The child's update decides what each means.

The prefixes other than `Succeeded*`, `Failed*`, and `Completed*` are for facts that originate in the view, a Stream, a Mount, a parent, or Flags. A Command's own result Message is named from the Command, never from the fact it reports.

Audit the Command name before deriving its result Message. Name the effect its handler performs, not the later Model transition caused when update handles the result. A timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`; its result is `CompletedWaitBeforeDismissal`.

#### Completed\* naming

Use verb-first naming that mirrors the Command name: Command `LockScroll` → Message `CompletedLockScroll`.

```ts
// RIGHT: verb first, matching the Command name
CompletedFocusInput // Command: FocusInput
CompletedLockScroll // Command: LockScroll
CompletedCloseDialog // Command: CloseDialog

// WRONG: object first
CompletedInputFocus
CompletedScrollLock
CompletedDialogClose
```

`Completed*` is not only for empty acknowledgments. A Command that resolves to a value with no meaningful failure still names its result after the Command, and the value rides along as the payload:

```ts
// RIGHT: the Message is named from the Command that caused it
const DetermineStartTime = Command.define('DetermineStartTime', {
  args: { elapsedMs: Schema.Number },
  messages: [Message.CompletedDetermineStartTime],
})

const GenerateCardId = Command.define('GenerateCardId', {
  args: { columnId: Schema.String },
  messages: [Message.CompletedGenerateCardId],
})

// WRONG: the Command verb conjugated to past tense
DeterminedStartTime
GeneratedCardId
```

The exception is a Message with more than one cause. When several Commands resolve to the same Message, or a Command synthesizes a Message that a Stream also emits, name it for the fact instead: Animation's `EndedAnimation` is produced by more than one cause, so no single Command owns the name.

Keep each `defineMessageUnion()` case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space.

#### Succeeded/Failed pairing

Every `Succeeded*` must have a corresponding `Failed*`:

```ts
const Message = defineMessageUnion({
  SucceededFetchWeather: { weather: Weather },
  FailedFetchWeather: { error: Schema.String },
})
type Message = typeof Message.Type
```

#### OutMessages

A child Block's OutMessages are facts the parent may care about, named like Messages: `SubmittedQuery`, `RequestedRemove`, `SucceededLogin`, `Closed`. Declare them with `defineMessageUnion()` beside the child's Message union. Always name the variant in an `.on` handler record, even when the union has one variant.

### Variables and Functions

- Name selectors for derived values (`visibleIssues`), pure transitions for the change they describe (`applyWorkspaceSnapshot`), and dedicated Message handlers `handle<MessageTag>`. Give reusable Model-first Steps a name ending in `Step`, such as `refreshStep`. Reserve `sync` and `observe` for actual synchronization or observation
- Name a value an update handler constructs before assigning it `next<Field>` (`nextSelectedDate` for `selectedDate`). Threading a destructured payload straight through (`username: () => value`) needs no intermediate
- Avoid opaque abbreviations: `signature` not `sig`, `message` not `msg`, `callbacks` not `cbs`
- Conventional technical shorthand is allowed when it is the normal domain spelling, such as `attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, and `VNode`; established API and DSL bindings such as `h` are also allowed
- Use descriptive callback parameters: `(tickCount) => tickCount + 1` not `(t) => t + 1`; prefer `toMessage` over an unexplained `f`
- Prefix Option values with `maybe`: `maybeCurrentUser`, `maybeSession`, `maybeDialog`. **`maybe*` is reserved for `Option<T>`.** A helper named `maybePlaceholder` whose type is `string | undefined` is wrong: change the type to `Option<string>`
- Boolean fields use `is*`: `isPlaying`, `isVisible`, `isMenuOpen`
- Model fields containing `AsyncData` values use the `AsyncData` suffix: `workspaceAsyncData`, `weatherAsyncData`
- Command definitions are verb-first PascalCase imperatives: `FetchWeather`, `FocusButton`, `LockScroll`. Don't suffix them with `Command`
- Mount definitions are verb-first imperatives too: `AnchorPopover`, `MeasurePanel`, `MountChart`
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

// A multi-step transformation reads left to right.
pipe(
  maybeRoom,
  Option.flatMap(({ maybeGame }) => maybeGame),
  Option.map(({ text }) => text),
)
```

In multi-line `pipe` chains, put the data being piped on its own line.

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

// Conditional Commands
Array.fromOption(maybeCommand) // 0 or 1 Command based on Option
Array.filter([command], () => condition) // Boolean-conditioned singleton
Array.filter(commands, () => condition) // Boolean-conditioned group

// Messages to an optional or collected child
Option.toArray(
  Option.map(model.maybeDialog, dialog =>
    dialog.send(Dialog.Message.RequestedClose()),
  ),
)
Array.map(model.rows, row => row.send(Row.Message.InformedOfFilter({ filter })))
```

Never `Option.match` with `onNone: Function.constVoid`. Use `Option.isSome` with an explicit `if`.

### Match (never switch)

```ts
// WRONG
switch (message._tag) {
  case 'ClickedSubmit':
    return { model }
}

// RIGHT: the update record has one handler per tag
update: {
  ClickedSubmit: model => ({ model }),
  UpdatedEmail: (model, { value }) => ({
    model: modifyFields(model, { email: () => value }),
  }),
}

// RIGHT: a declared union's own exhaustive match
FetchState.match<Html>(model.fetchState, {
  Idle: () => h.empty,
  Loading: () => spinnerView(h),
  Error: ({ error }) => errorView(error, h),
  Ok: ({ data }) => dataView(data, h),
})
```

Match a `defineTaggedUnion` or `defineRouteUnion` value through the union's own `match`, passing the return type as the first generic when the branches need constraining. Use its `matchOrElse` when selected variants need handlers and the rest share a fallback. Factory unions ship a module-level `match` (`AsyncData.match`, `FieldValidation.match`); call it through the module namespace. Use Effect `Match` for partial matches, one handler shared by several tags (`Match.tag('Home', 'Login', route => ...)`), and unions without their own matcher. For exhaustive Effect matches, prefer `Match.tagsExhaustive({ ... })`. Constrain branch returns at the match boundary with the return-type generic or `Match.withReturnType<...>()`, never `as const` inside branches.

### Array module

```ts
// Use Effect's Array module, not native methods in pipe chains
Array.map(items, item => ...)
Array.filter(items, item => ...)
Array.match(items, {                  // empty / non-empty branching
  onEmpty: () => ...,
  onNonEmpty: (items) => ...,          // NonEmptyReadonlyArray
})
Array.findFirst(items, predicate)
Array.sort(items, order)
Array.fromOption(maybeItem)           // Option → 0 or 1 element array
Array.take(items, count)              // not .slice(0, n)
Array.get(items, index)               // not items[index]
```

**`Array.match` is the one that works on a Model.** `Array.isArrayEmpty` and `Array.isArrayNonEmpty` take a mutable `Array<A>`, so neither accepts the `ReadonlyArray` that `Schema.Array(...)` decodes to:

```ts
Array.isArrayEmpty(model.items)
// Argument of type 'readonly string[]' is not assignable to
// parameter of type 'string[]'

Array.match(model.items, { onEmpty: () => ..., onNonEmpty: items => ... }) // OK
```

Use `Array.isReadonlyArrayEmpty` / `Array.isReadonlyArrayNonEmpty` for a pure check on a Model collection. Never use bracket indexing (`xs[0]`); use `Array.get`, `Array.head`, or `Array.last`.

### String module

Effect's `String` module is **data-last curried only**. Use it inside `pipe`/`flow`, not as a direct call:

```ts
// WRONG: Effect String functions don't take data-first
String.padStart(value.toString(), 2, '0')

// RIGHT: use in pipe/flow
pipe(value.toString(), String.padStart(2, '0'))
flow(String.toLowerCase, String.startsWith('http'))

// ALSO RIGHT: native methods when not composing
value.toString().padStart(2, '0')
url.startsWith('http')
```

The rule of thumb: **Effect `String` in pipes, native methods on named variables.**

### Command handler Effects

A Command handler under `commands` receives decoded args and returns an Effect of a declared Message. Keep the Effect as the subject and end with the error mapping:

```ts
// application.ts, above ApplicationLive
const fetchWeather =
  (client: HttpClient.HttpClient) =>
  ({ city }: Readonly<{ city: string }>) =>
    Effect.gen(function* () {
      const response = yield* client.execute(weatherRequest(city))
      const body = yield* response.json
      const weather = yield* Schema.decodeUnknownEffect(WeatherResponse)(body)
      return Message.SucceededFetchWeather({ weather })
    }).pipe(
      Effect.catch(error =>
        Effect.succeed(
          Message.FailedFetchWeather({ error: globalThis.String(error) }),
        ),
      ),
    )

// in ApplicationLive's constructor
const client = yield* HttpClient.HttpClient
// ...
commands: { FetchWeather: fetchWeather(client) },
```

The Service is yielded once in the constructor and closed over. A small handler can stay inline under `commands`; a substantial one becomes a function in the Block's file, above the `Live` Layer, that takes the Services it needs and returns the handler, as `examples/weather/src/application.ts` (`fetchWeather(client)`) and `examples/websocket-chat/src/application.ts` (`sendMessage(chatSocket)`) do.

### Effect.ignore only when there's an error channel

`Effect.ignore` discards both the success value and any error. If the Effect is infallible at the type level, there's nothing to discard:

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
  Effect.as(Message.SucceededFetch()),
  Effect.catch(() => Effect.succeed(Message.FailedFetch())),
)
```

`Dom.focus` can fail (the element may not exist), so `Dom.focus(selector).pipe(Effect.ignore, Effect.as(Message.CompletedFocusInput()))` is correct. `pushUrl`, `load`, `back`, and `forward` from `foldkit/navigation` all return `Effect.Effect<void>`. Skip the `ignore`.

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
  homeStep: () =>
    HomeStep.SelectAction({ username, selectedAction: 'CreateRoom' }),
})

// Nested update: modify fields of the nested struct
modifyFields(model, {
  newLinkForm: () => modifyFields(model.newLinkForm, { title: () => value }),
})
```

When a setter only transforms the current value of that same field, pass the transformer directly:

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
```

Never mutate the Model. **Never use spread syntax for updates.** This applies to nested updates too: `modifyFields(model, { newLinkForm: () => ({ ...model.newLinkForm, title: value }) })` is wrong; use a nested `modifyFields`.

### Child instances in the Model

A parent's Model holds child instances, not child state. `modifyFields` places, replaces, and removes instances: `maybeDialog: () => Option.some(dialog)`, `columns: Array.append(column(columnId))`, `columns: Array.filter(({ id }) => id !== removed.id)`. It never changes a child's state. A parent that wants a child to change sends it a Message:

```ts
// WRONG: the parent rewrites the child's state from outside
modifyFields(model, {
  search: search => ({ ...search, model: { ...search.model, query: '' } }),
})(
  // RIGHT: the child's update owns the transition
  { model, messages: [model.search.send(Search.Message.RequestedClear())] },
)
```

Read child state through `model.search.model` in the parent's update and view. Pure selectors over that state are fine.

### Workflow ownership

Give independent interactions their own pending and failure state. A project save should not lock an unrelated issue move or share feedback that a background response can clear. Keep exclusivity explicit when the operations must serialize.

An editor owns its baseline, draft, and submission state. Decide whether navigation retains or removes that editor instance. Repeated URL delivery and data refresh must not silently reset dirty drafts. Keep a keyed instance in the Model while hidden when its pending result must still update the application; removing it ends its lifecycle. Apply mutation responses only to the data that operation owns; a delayed full snapshot must not replace unrelated newer changes.

## Update Results

A handler returns `{ model }` when it statically creates no Commands. When it computes a Commands collection, return it directly without checking whether it is empty. Never write the literal `commands: []`. The same holds for `messages`.

When composing an update-shaped result from a helper, bind the whole result to a value named after the operation and access its fields through that value. Do not destructure or rename `model`, `commands`, or `outMessage`:

```ts
const formSubmit = handleSubmittedForm(model, message)

return {
  model: modifyFields(formSubmit.model, { attempts: Number.increment }),
  commands: formSubmit.commands,
}
```

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing result or when the value has the type `OutMessage | undefined`: `pipe(dialogClose, Update.withOutMessage(outMessage))`.

Use `Update.combineSteps` when a later Step should receive the Model an earlier Step produced. It takes two or more Steps; call a single Step directly. Name an inline Step parameter `stepModel`.

## Schema Constructors

Declare each Schema's decoded type immediately below it, using the same name and no blank line: `const Foo = Schema.Struct(...)` followed by `type Foo = typeof Foo.Type`. Export both when they belong to the module's public surface. Prefer `Foo` in decoded-value annotations; use `typeof Foo` when an API needs the Schema type. Across a child boundary, derive aliases from the class, such as `type SearchMessage = typeof Search.Message.Type` or `type SearchModel = typeof Search.Model.Type`.

Construct Schema values through their actual constructors, never casts. Foldkit union variants are callable. A complete `Schema.Struct` value built outside a Block constructor (a test fixture, a domain helper) uses `.make`. A constructor's returned `model` and an update handler's `model` stay plain records checked against the Model.

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

// A Struct Schema uses .make, as in a test fixture
People.Model.make({ searchInput: '', searchHistory: [], results: SearchResults.Loading() })
```

Keep Message and OutMessage constructors on their owning namespace. Never destructure them into sibling bindings. `Message.ClickedSubmit()` preserves the domain at the call site in a way that `ClickedSubmit()` does not. A child's constructors are reached through its class: `Search.Message.RequestedClear()`, `Search.OutMessage.SubmittedQuery({ query })`.

**No-field variants take no argument, not an empty object:**

```ts
// WRONG: empty object is redundant
Timer.Work({})
Message.ClickedSubmit({})

// RIGHT: call with no argument
Timer.Work()
Message.ClickedSubmit()

// Only pass an object when the variant has fields
Timer.Paused({ remainingMs: 400_000 })
```

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

`defineTaggedUnion` names each variant once. It returns a Schema and a namespace: `FetchState.Ok({ data })` constructs a value, `FetchState.match(model.fetchState, { ... })` handles every variant, `FetchState.matchOrElse(...)` handles selected variants with a fallback, and `guards` / `isAnyOf` check selected variants.

For **remote data**, use `AsyncData` instead of writing that union:

```ts
const DataAsyncData = AsyncData.Schema(Data, Schema.String)
type DataAsyncData = typeof DataAsyncData.schema.Type

const Model = Schema.Struct({
  dataAsyncData: DataAsyncData.schema,
})
type Model = typeof Model.Type
```

`Idle | Loading | Refreshing | Failure | Stale | Success`. `Refreshing` holds the previous data during a reload; `Stale` holds previous data alongside the new error. Keep `defineTaggedUnion` for state that isn't remote data: form steps, editor modes, connection phases.

A union variant can hold a child instance. `examples/auth/src/application.ts` stores the `LoggedOut` page instance in one variant and the `LoggedIn` page instance in another, so the active page's instance exists only while its variant is current.

For multi-step flows:

```ts
const SignupStep = defineTaggedUnion({
  EnterEmail: { email: Schema.String },
  EnterPassword: { email: Schema.String, password: Schema.String },
  Confirming: { email: Schema.String },
})
type SignupStep = typeof SignupStep.Type
```

Use `taggedStruct` only when the variants cannot be declared together:

- A recursive union.
- A union assembled from variants owned by different modules, such as a Model whose variants each hold a different page instance.
- A tagged child struct that is not a union variant.
- A variant created inside a generic Schema factory.

## Code Style

- No inline or block comments. If code needs explanation, use better names
- A short section header is allowed when a long file has a substantial group that benefits from wayfinding. Do not add routine architecture headers to small files
- `// NOTE:` only for behavior that would mislead a careful reader (timing dependency, upstream bug workaround, browser quirk)
- Always use braces for control flow: `if (foo) { return true }` not `if (foo) return true`
- Use direct `value === undefined` and `value !== undefined` comparisons for undefined checks
- Use `const` exclusively. `let` only when mutation is truly unavoidable
- Never use nested ternaries. Use `Match.value`, an `if`/`else` chain, or a named helper
- Prefer explicit `if`/`else` when both branches return; reserve early return for true guards
- Use `Readonly<{...}>` over per-property `readonly` for inline object types
- Use blank lines to show the phases of non-trivial control flow
- Prefer curried, data-last functions that compose in `pipe` chains
- No dead code, no empty catch blocks, no placeholder types

## Conditional Styles with clsx

In Tailwind applications, repeated static control recipes belong in the stylesheet's `@layer components`, which ordinary utilities can override. Use `@utility` for a custom utility that needs variant support. Keep `clsx` for actual conditional composition.

Use `clsx` for conditional class composition. Never string concatenation, template literals, or `&&` expressions:

```ts
import clsx from 'clsx'

// Conditional classes based on boolean state: use object syntax
h.Class(clsx('px-4 py-2 rounded', { 'bg-blue-500 text-white': isActive }))

// Multiple conditions in one object
h.Class(
  clsx('text-sm border', {
    'border-red-500': field._tag === 'Invalid',
    'border-green-500': field._tag === 'Valid',
  }),
)
```

`clsx` is a project dependency. Add it to `package.json` when generating apps that use conditional styles.

## Imports

A representative import block for a Foldkit Block module:

```ts
import clsx from 'clsx'
import {
  Array,
  Effect,
  Layer,
  Match,
  Number,
  Option,
  Schema,
  Stream,
  String,
  pipe,
} from 'effect'
import { HttpClient } from 'effect/http'
import { AsyncData, Block, Command, Dom, Mount, Update } from 'foldkit'
import type { Send, UpdateRecord } from 'foldkit/block'
import { type Html, type HtmlBuilder, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineRouteUnion } from 'foldkit/route'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button, Dialog, Input } from '@foldkit/ui'
```

Two component names collide with `foldkit` module names: `Calendar` (the date module) and `Toast`. Alias the component with a `Ui` prefix:

```ts
import { Calendar } from 'foldkit'

import { Calendar as UiCalendar, Toast as UiToast } from '@foldkit/ui'
```

Notes:

- Only import what you use in the file. The lint pass catches unused imports.
- `Block`, `Program`, `Runtime`, `Command`, and `Mount` come from `foldkit`. Type-only Block names (`Send`, `UpdateRecord`, `Instance`) come from `foldkit/block`.
- Test steps come from `foldkit/story` or `foldkit/scene`, and `describe`, `expect`, `it` from `@effect/vitest`.
- For time, randomness, or delays, use Effect's built-ins (`Clock`, `Random`, `Effect.sleep(Duration.millis(...))`). For UUIDs, use the `Crypto.Crypto` Service's `randomUUIDv4` and provide `BrowserCrypto.layer` from `@effect/platform-browser` in `ApplicationLayer`.
- Import Effect modules by their PascalCase names. When an Effect module name collides with a JavaScript or TypeScript global, qualify the global through `globalThis`, such as `globalThis.String`. When an existing local binding must keep the module name, give the Effect import an `Effect` prefix, such as `Order as EffectOrder`.
- **UI components live in a separate package.** Import them by name from `@foldkit/ui`. There is no `Ui` export on the `foldkit` package.
- **`empty` and `keyed` are properties on `h`**, the builder every view receives. They never belong in the `foldkit/html` import list.
- HTTP types come from `effect/http`, not `@effect/platform`. `@effect/platform-browser` is a separate package used for `BrowserKeyValueStore` and `BrowserCrypto`.
