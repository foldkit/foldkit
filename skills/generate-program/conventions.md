# Foldkit Conventions Guide

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
| `Completed*` | Fire-and-forget acknowledged                | `CompletedFocusInput`, `CompletedLockScroll`        |
| `Got*`       | Child module OutMessage                     | `GotHomeMessage`, `GotRoomMessage`                  |
| `Loaded*`    | Data restored                               | `LoadedSession`, `LoadedPreferences`                |
| `Hidden*`    | UI element dismissed                        | `HiddenToast`, `HiddenCopiedIndicator`              |
| `Ticked*`    | Timer/interval tick                         | `TickedCountdown`, `TickedExitCountdown`            |

`Updated*` covers both user input changes (`UpdatedEmail`, `UpdatedNewTodo`) and external state updates from subscriptions (`UpdatedRoom`, `UpdatedPlayerProgress`). The prefix describes the fact ("the value was updated") — whether it came from a keystroke or a WebSocket doesn't change the Message category.

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

#### Succeeded/Failed pairing

Every `Succeeded*` must have a corresponding `Failed*`:

```ts
const SucceededFetchWeather = m('SucceededFetchWeather', { weather: Weather })
const FailedFetchWeather = m('FailedFetchWeather', { error: S.String })
```

### Variables and Functions

- Never abbreviate: `signature` not `sig`, `username` not `user`, `message` not `msg`
- Full names in callbacks: `(tickCount) => tickCount + 1` not `(t) => t + 1`
- Prefix Option values with `maybe`: `maybeCurrentUser`, `maybeSession`, `maybeError`. **`maybe*` is reserved for `Option<T>` specifically.** Use `nullable*` for native `T | undefined`. A helper named `maybePlaceholder` whose type is `string | undefined` is wrong on both counts: rename to `nullablePlaceholder` or change the type to `Option<string>` (usually the better fix — optional fields at internal API boundaries should be `Option<T>` so the call site reads `Option.some(...)` / `Option.none()`, not bare `undefined`).
- Boolean fields use `is*`: `isPlaying`, `isVisible`, `isMenuOpen`
- Command variables named by action: `fetchWeather`, not `fetchWeatherCommand`
- Command names are verb-first imperatives: `FetchWeather`, `FocusButton`, `LockScroll`, `Tick`
- Callback parameters use full names: `(tickCount) => tickCount + 1` not `(t) => t + 1`
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

// Conditional rendering
Option.match(model.maybeError, {
  onNone: () => empty,
  onSome: error => div([Class('text-red-500')], [error]),
})

// Conditional values
OptionExt.when(condition, value) // not condition ? Option.some(value) : Option.none()

// Conditional commands
Array.fromOption(maybeCommand) // 0 or 1 command based on Option
```

### Match (never switch)

```ts
// WRONG
switch (message._tag) {
  case 'ClickedSubmit':
    return [model, []]
}

// RIGHT
M.value(message).pipe(
  withUpdateReturn,
  M.tagsExhaustive({
    ClickedSubmit: () => [model, []],
    UpdatedEmail: ({ value }) => [evo(model, { email: () => value }), []],
  }),
)
```

### Array module

```ts
// Use Effect's Array module, not native methods in pipe chains
Array.map(items, item => ...)
Array.filter(items, item => ...)
Array.isEmptyArray(items)             // not items.length === 0
Array.isNonEmptyArray(items)          // not items.length > 0
Array.match(items, {                  // when handling both cases
  onEmpty: () => ...,
  onNonEmpty: (items) => ...,
})
Array.findFirst(items, predicate)
Array.sort(items, order)
Array.fromOption(maybeItem)           // Option → 0 or 1 element array
Array.take(items, count)              // not .slice(0, n)
```

### String module

Effect's `String` module is **data-last curried only** — there is no data-first overload. Use it inside `pipe`/`flow`, not as a direct call:

```ts
// WRONG — Effect String functions don't take data-first
String.padStart(value.toString(), 2, '0')
String.startsWith('url', 'http')

// RIGHT — use in pipe/flow
pipe(value.toString(), String.padStart(2, '0'))
flow(String.toLowerCase, String.startsWith('http'))

// ALSO RIGHT — native methods when not composing
value.toString().padStart(2, '0')
url.startsWith('http')
```

The rule of thumb: **Effect `String` in pipes, native methods on named variables.** Don't force the Effect form into a non-composing call site just to avoid the native method.

### Single-op pipe tail operator

The "no pipe for a single operation" rule has one exception: **tail operators on an Effect pipeline are fine as a suffix.** This is idiomatic for Commands:

```ts
// RIGHT — the .pipe(...) is a tail suffix, not a wrapper around a single call
Effect.gen(function* () {
  // ...
  return SucceededFetchWeather({ data })
}).pipe(
  Effect.catch(error =>
    Effect.succeed(FailedFetchWeather({ error: String(error) })),
  ),
  FetchWeather,
)
```

The `.pipe(Effect.catch(...), FetchWeather)` is multi-step (two tail operators) and even if it were one, suffix-style `.pipe` on a yielded Effect is the canonical shape. Don't mechanically flatten it to `FetchWeather(Effect.catch(Effect.gen(...), ...))` — that reads inside-out and obscures the pipeline.

### Effect.ignore only when there's an error channel

`Effect.ignore` discards both the success value AND any error. If the Effect is infallible at the type level (`Effect.Effect<A>` with no error parameter), there's nothing to discard — `Effect.as(Message())` alone is enough.

```ts
// WRONG — pushUrl returns Effect.Effect<void>, no error to ignore
pushUrl(path).pipe(Effect.ignore, Effect.as(CompletedNavigateInternal()))

// RIGHT — directly swap the void for the success Message
pushUrl(path).pipe(Effect.as(CompletedNavigateInternal()))

// RIGHT — fallible Effect, handle the error then swap
httpClient.get(url).pipe(
  Effect.as(SucceededFetch({ data })),
  Effect.catch(() => Effect.succeed(FailedFetch())),
)
```

Same goes for `Task` primitives: `Task.focus` can fail (element may not exist), so `Task.focus(selector).pipe(Effect.ignore, Effect.as(CompletedFocusInput()))` is correct. But `pushUrl`, `load`, `back`, and `forward` from `foldkit/navigation` all return `Effect.Effect<void>` — skip the `ignore`.

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

// Nested update — replace the nested struct entirely
evo(model, {
  homeStep: () => SelectAction({ username, selectedAction: 'CreateRoom' }),
})

// Nested update — modify fields of the nested struct
evo(model, {
  newLinkForm: () => evo(model.newLinkForm, { title: () => value }),
})
```

Never mutate the model directly. **Never use spread syntax for updates** — `evo` is the canonical pattern. This applies to nested updates too: `evo(model, { newLinkForm: () => ({ ...model.newLinkForm, title: value }) })` is wrong. Use a nested `evo`: `evo(model, { newLinkForm: () => evo(model.newLinkForm, { title: () => value }) })`. The spread-inside-evo pattern is a common mistake — you're using `evo` at the outer level but bypassing it inside, which loses the invariant that all updates go through one codepath.

## Schema Constructors

Use callable constructors, never cast:

```ts
// WRONG: manual object with cast
{ _tag: 'ClickedSubmit' } as Message

// RIGHT: callable constructor
ClickedSubmit()

// WRONG: manual tagged object
{ _tag: 'Loading' } as DataState

// RIGHT: callable constructor
Loading()

// With fields
SucceededFetch({ data: response })
```

**No-field tagged structs take no argument — not an empty object.** `ts('Work')` (and `m('Clicked')`) produces a callable that accepts no argument when the struct has no fields:

```ts
const Work = ts('Work')
const Idle = ts('Idle')
const ClickedSubmit = m('ClickedSubmit')

// WRONG — empty object is redundant and non-idiomatic
Work({})
Idle({})
ClickedSubmit({})

// RIGHT — call with no argument
Work()
Idle()
ClickedSubmit()

// Only pass an object when the struct has fields
SucceededFetch({ data: response })
Paused({ remainingMs: 400_000 })
```

This matters for readability: `Work()` reads as "a Work value," while `Work({})` reads as "a Work value with some object in it" and makes the reader wonder what's in the object. The empty-object form compiles and works — but every exemplar in the codebase uses the no-arg form for no-field tagged structs.

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

- No inline or block comments — if code needs explanation, use better names
- Section headers are allowed: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`
- TSDoc (`/** ... */`) on public exports
- Always use braces for control flow: `if (foo) { return true }` not `if (foo) return true`
- Use `const` exclusively — `let` only when mutation is truly unavoidable
- Prefer curried, data-last functions that compose in `pipe` chains
- No dead code, no empty catch blocks, no placeholder types

## Conditional Styles with clsx

Use `clsx` for conditional class composition — never string concatenation, template literals, or `&&` expressions. Use the object syntax `{ 'class-name': condition }` for conditional classes:

```ts
import clsx from 'clsx'

// Conditional classes based on boolean state — use object syntax
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

`clsx` is a project dependency — add it to `package.json` when generating apps that use conditional styles.

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
import {
  Calendar,
  Command,
  File,
  Runtime,
  Subscription,
  Task,
  Ui,
  Url,
} from 'foldkit'
import { Html, empty, html, keyed } from 'foldkit/html'
import { m } from 'foldkit/message'
import { r } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
```

For form validation, also:

```ts
import {
  Field,
  Invalid,
  NotValidated,
  Valid,
  Validating,
  allValid,
  email,
  makeRules,
  minLength,
  validate,
} from 'foldkit/fieldValidation'
```

Notes:

- Only import what you use. `Calendar`, `File`, and `foldkit/fieldValidation` are only needed when the app has dates, file uploads, or form validation respectively
- When an Effect module name collides with a global, alias the Effect import with a trailing underscore: `String as String_`, `Array as Array_`, `Number as Number_`
- `Match as M` is Effect's Match module — Foldkit re-exports `M.value`, `M.tagsExhaustive`, `M.withReturnType` etc. through Effect's `Match`
- `Ui` from `foldkit` gives access to all UI components: `Ui.Dialog`, `Ui.Tabs`, `Ui.Menu`, `Ui.DatePicker`, `Ui.FileDrop`, `Ui.Toast`, `Ui.Tooltip`, etc.
- `Calendar` provides `Calendar.CalendarDate`, `Calendar.today.local`, `Calendar.make`, `Calendar.addDays` etc. — used with `Ui.Calendar` and `Ui.DatePicker`
- `File` provides file upload primitives used with `Ui.FileDrop`
- `empty` and `keyed` can be imported from `foldkit/html` directly or destructured from `html<Message>()`
