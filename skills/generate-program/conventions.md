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

Audit the Command name before deriving its result Message. Name the effect its `execute` body performs, not the later Model transition caused when update handles the result. A timer that only waits before update starts a dismissal is `WaitBeforeDismissal`, not `DismissAfter`; its result is `CompletedWaitBeforeDismissal`.

#### Completed\* naming

Use verb-first naming that mirrors the Command name: Command `LockScroll` → Message `CompletedLockScroll`.

```ts
// RIGHT: verb first, matching the Command name
CompletedFocusInput // Command: FocusInput
CompletedLockScroll // Command: LockScroll
CompletedShowDialog // Command: ShowDialog
CompletedFocusItems // Command: FocusItems

// WRONG: object first
CompletedInputFocus
CompletedScrollLock
CompletedDialogShow
CompletedItemsFocus
```

`Completed*` is not only for empty acknowledgments. A Command that resolves to a value with no meaningful failure still names its result after the Command, and the value rides along as the payload.

```ts
// RIGHT: the Message is named from the Command that caused it
Command.define('DetermineStartTime', {
  args: { elapsedMs: S.Number },
  messages: [Message.CompletedDetermineStartTime],
  execute: ({ elapsedMs }) =>
    Clock.currentTimeMillis.pipe(
      Effect.map(now =>
        Message.CompletedDetermineStartTime({ startTime: now - elapsedMs }),
      ),
    ),
})
Command.define('GenerateCardId', {
  args: { columnId: S.String },
  messages: [Message.CompletedGenerateCardId],
  execute: ({ columnId }) =>
    Effect.uuid.pipe(
      Effect.map(cardId =>
        Message.CompletedGenerateCardId({ cardId, columnId }),
      ),
    ),
})
Command.define('SaveTodos', {
  args: { todos: Todos },
  messages: [Message.SucceededSaveTodos, Message.FailedSaveTodos],
  execute: ({ todos }) =>
    saveTodos(todos).pipe(
      Effect.match({
        onFailure: () => Message.FailedSaveTodos(),
        onSuccess: () => Message.SucceededSaveTodos({ todos }),
      }),
    ),
})

// WRONG: the Command verb conjugated to past tense
DeterminedStartTime
GeneratedCardId
SavedTodos
```

The exception is a Message with more than one cause. When several Commands resolve to the same Message, or a Command synthesizes a Message that a Subscription also emits, name it for the fact instead: `EndedAnimation` is produced both by the `WaitForAnimationSettled` Command and by each component's `DetectMovementOrAnimationEnd` race, so no single Command owns the name.

Keep each `defineMessageUnion()` case's payload object on one line when it fits. Let Prettier wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

#### Succeeded/Failed pairing

Every `Succeeded*` must have a corresponding `Failed*`:

```ts
const Message = defineMessageUnion({
  SucceededFetchWeather: { weather: Weather },
  FailedFetchWeather: { error: S.String },
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

- Capitalized string literals: `S.Literals(['Horizontal', 'Vertical'])` not `S.Literals(['horizontal', 'vertical'])`
- Capitalized namespace imports: `import * as ShoppingCart from './shoppingCart'`
- `Array<T>` or `ReadonlyArray<T>`, never `T[]`

## Effect-TS Patterns

### pipe

Use `pipe()` for multi-step data flow. Never use `pipe` with a single operation:

```ts
// WRONG: single operation in pipe
pipe(value, Option.match({ onNone: () => ..., onSome: (x) => ... }))

// RIGHT: call directly
Option.match(value, { onNone: () => ..., onSome: (x) => ... })

// RIGHT: multi-step
pipe(
  maybeRoom,
  Option.flatMap(({ maybeGame }) => maybeGame),
  Option.map(({ text }) => text),
)
```

### Option (never null/undefined)

```ts
// Model fields
maybeError: S.Option(S.String) // not error: S.String with '' as none

// Conditional rendering (inside a view function, with its builder `h` in scope)
Option.match(model.maybeError, {
  onNone: () => h.empty,
  onSome: error => h.div([h.Class('text-red-500')], [error]),
})

// Conditional values
Option.liftPredicate(value, predicate) // not condition ? Option.some(value) : Option.none()
Option.liftPredicate(value, () => condition) // constant predicate when the check doesn't use the value

// Conditional commands
Array.fromOption(maybeCommand) // 0 or 1 command based on Option
```

### Match (never switch)

```ts
// WRONG
switch (message._tag) {
  case 'ClickedSubmit':
    return { model }
}

// RIGHT
Message.match<UpdateReturn>(message, {
  ClickedSubmit: () => ({ model }),
  UpdatedEmail: ({ value }) => ({
    model: evo(model, { email: () => value }),
  }),
})
```

Use Effect `Match` for non-Message tagged unions, partial matches with a fallback, or one handler shared by several tags.

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
`ReadonlyArray` that `S.Array(...)` decodes to:

```ts
const Model = S.Struct({ items: S.Array(S.String) })

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

### Single-op pipe tail operator

The "no pipe for a single operation" rule has one exception: **tail operators on an Effect pipeline are fine as a suffix.** This is idiomatic for Commands:

```ts
// RIGHT: the .pipe(...) is a tail suffix, not a wrapper around a single call
Effect.gen(function* () {
  // ...
  return Message.SucceededFetchWeather({ data })
}).pipe(
  Effect.catch(error =>
    Effect.succeed(Message.FailedFetchWeather({ error: String(error) })),
  ),
  FetchWeather,
)
```

The `.pipe(Effect.catch(...), FetchWeather)` is multi-step (two tail operators) and even if it were one, suffix-style `.pipe` on a yielded Effect is the canonical shape. Don't mechanically flatten it to `FetchWeather(Effect.catch(Effect.gen(...), ...))`. That reads inside-out and obscures the pipeline.

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

Use `evo()` for immutable updates:

```ts
import { evo } from 'foldkit/struct'

// Update specific fields
evo(model, {
  email: () => value,
  maybeError: () => Option.none(),
})

// Nested update: replace the nested struct entirely
evo(model, {
  homeStep: () => SelectAction({ username, selectedAction: 'CreateRoom' }),
})

// Nested update: modify fields of the nested struct
evo(model, {
  newLinkForm: () => evo(model.newLinkForm, { title: () => value }),
})
```

When an `evo` setter only transforms the current value of that same field, pass
the transformer directly:

```ts
// WRONG: re-reads the same field from the surrounding Model
evo(model, { entries: () => Array.map(model.entries, Entry.revealErrors) })
evo(model, { currentStep: () => toNextStep(model.currentStep) })

// RIGHT: evo supplies the current field value to the setter
evo(model, { entries: Array.map(Entry.revealErrors) })
evo(model, { currentStep: toNextStep })

// RIGHT: replacement values still use thunks
evo(model, { email: () => value })
evo(model, { child: () => nextChild })
```

This applies to component reflect helpers too, which are dual: called data-last, `Slider.reflectRange({ min: minPrice, max: maxPrice })` returns a setter for the existing `Slider.Model` (mirroring URL-owned price bounds onto the slider), so use it directly in the `priceSlider` field instead of closing over `model.priceSlider`.

Never mutate the model directly. **Never use spread syntax for updates.** `evo` is the canonical pattern. This applies to nested updates too: `evo(model, { newLinkForm: () => ({ ...model.newLinkForm, title: value }) })` is wrong. Use a nested `evo`: `evo(model, { newLinkForm: () => evo(model.newLinkForm, { title: () => value }) })`. The spread-inside-evo pattern is a common mistake. You're using `evo` at the outer level but bypassing it inside, which loses the invariant that all updates go through one codepath.

## Schema Constructors

Use callable constructors, never cast:

```ts
// WRONG: manual object with cast
{ _tag: 'ClickedSubmit' } as Message

// RIGHT: callable constructor
Message.ClickedSubmit()

// WRONG: manual tagged object
{ _tag: 'Loading' } as DataState

// RIGHT: callable constructor
Loading()

// With fields
Message.SucceededFetch({ data: response })
```

Keep Message and OutMessage constructors on their owning namespace. Never
destructure them into sibling bindings. `Message.ClickedSubmit()` preserves the
domain at the call site in a way that `ClickedSubmit()` does not.

**No-field tagged structs take no argument, not an empty object.** `ts('Work')` and Message constructors with empty field records produce callables that accept no argument:

```ts
const Work = ts('Work')
const Idle = ts('Idle')
const Message = defineMessageUnion({ ClickedSubmit: {} })

// WRONG: empty object is redundant and non-idiomatic
Work({})
Idle({})
Message.ClickedSubmit({})

// RIGHT: call with no argument
Work()
Idle()
Message.ClickedSubmit()

// Only pass an object when the struct has fields
Message.SucceededFetch({ data: response })
Paused({ remainingMs: 400_000 })
```

This matters for readability: `Work()` reads as "a Work value," while `Work({})` reads as "a Work value with some object in it" and makes the reader wonder what's in the object. The empty-object form compiles and works, but every exemplar in the codebase uses the no-arg form for no-field tagged structs.

## Discriminated Unions for State

Use tagged unions, not booleans or nullable fields:

```ts
// WRONG
const Model = S.Struct({
  isLoading: S.Boolean,
  hasError: S.Boolean,
  data: S.Option(Data),
})

// RIGHT
const Idle = ts('Idle')
const Loading = ts('Loading')
const Error = ts('Error', { error: S.String })
const Ok = ts('Ok', { data: Data })
const FetchState = S.Union([Idle, Loading, Error, Ok])

const Model = S.Struct({
  fetchState: FetchState,
})
```

For **remote data**, don't write that union at all. `AsyncData` ships it, with two states hand-rolled versions always miss:

```ts
const DataAsyncData = AsyncData.Schema(Data, S.String)

const Model = S.Struct({
  data: DataAsyncData.schema,
})
```

`Idle | Loading | Refreshing | Failure | Stale | Success`. `Refreshing` holds the previous data during a reload so a refetch doesn't blank the screen; `Stale` holds previous data alongside the new error so a failed reload doesn't throw away what the user was reading. Hand-rolling the four-state version bakes both regressions in. Keep `ts()` unions for state that isn't remote data: form steps, editor modes, connection phases.

For form field validation:

```ts
const NotValidated = ts('NotValidated')
const Validating = ts('Validating')
const Valid = ts('Valid')
const Invalid = ts('Invalid', { error: S.String })
const ValidationState = S.Union([NotValidated, Validating, Valid, Invalid])
```

For multi-step flows:

```ts
const EnterEmail = ts('EnterEmail', { email: S.String })
const EnterPassword = ts('EnterPassword', {
  email: S.String,
  password: S.String,
})
const Confirming = ts('Confirming', { email: S.String })
const SignupStep = S.Union([EnterEmail, EnterPassword, Confirming])
```

## Code Style

- No inline or block comments. If code needs explanation, use better names
- Section headers are allowed: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`
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
const borderClass = (field: FieldState): string =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )
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
  Match as M,
  Number,
  Option,
  Schema as S,
  Stream,
  String as String_,
  pipe,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import {
  AsyncData,
  Calendar,
  Command,
  Dom,
  File,
  Http,
  Runtime,
  Subscription,
  Update,
  Url,
} from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { r } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

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
- For time, randomness, UUIDs, or delays, use Effect's built-ins directly rather than reaching for a Foldkit module: `Clock.currentTimeMillis`, `Random.nextIntBetween`, `Effect.uuid`, `Effect.sleep(Duration.millis(...))`.
- When an Effect module name collides with a global, alias the Effect import with a trailing underscore: `String as String_`, `Array as Array_`, `Number as Number_`.
- `Message.match` is the exhaustive matcher on a union returned by `defineMessageUnion()`. `Match as M` is Effect's Match module for other tagged unions, partial matching, fallbacks, and handlers shared by several tags.
- **UI components live in a separate package.** Import them by name from `@foldkit/ui`: `import { Dialog, DatePicker, FileDrop, Toast, Tooltip } from '@foldkit/ui'`. Deep imports (`@foldkit/ui/dialog`) work too. There is no `Ui` export on the `foldkit` package, so `Ui.Dialog.view` does not resolve.
- **`empty` and `keyed` are properties on `h`**, the builder every view receives as its last parameter. They are not top-level exports of `foldkit/html`, so they never belong in that import list. Same for `h.submodel`.
- `AsyncData` for remote data state, `Update` for the update return type and the `combine` / `refresh` combinators, `Http` for the `layer` that provides `HttpClient` to a Command.
- HTTP types come from `effect/unstable/http`, not `@effect/platform`. `@effect/platform-browser` is a separate package used for `BrowserKeyValueStore` and `BrowserCrypto`.
