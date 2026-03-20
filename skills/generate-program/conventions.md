# Foldkit Conventions Guide

## Naming

### Messages

Messages use past-tense, verb-first naming. The verb prefix acts as a category marker:

| Prefix       | Meaning                      | Example                                      |
| ------------ | ---------------------------- | -------------------------------------------- |
| `Clicked*`   | Button/link press            | `ClickedSubmit`, `ClickedDeleteItem`         |
| `Changed*`   | Input value change           | `ChangedEmail`, `ChangedSearchQuery`         |
| `Submitted*` | Form submission              | `SubmittedLoginForm`, `SubmittedComment`     |
| `Pressed*`   | Keyboard input               | `PressedKey`, `PressedEnter`                 |
| `Blurred*`   | Focus loss                   | `BlurredEmailInput`, `BlurredPasswordInput`  |
| `Selected*`  | Choice made                  | `SelectedFilter`, `SelectedTab`              |
| `Toggled*`   | Binary state flip            | `ToggledDarkMode`, `ToggledSidebar`          |
| `Succeeded*` | Async success (fallible)     | `SucceededFetchWeather`, `SucceededLogin`    |
| `Failed*`    | Async failure (fallible)     | `FailedFetchWeather`, `FailedLogin`          |
| `Completed*` | Fire-and-forget acknowledged | `CompletedFocusInput`, `CompletedLockScroll` |
| `Got*`       | Child module OutMessage      | `GotHomeMessage`, `GotRoomMessage`           |
| `Updated*`   | External state change        | `UpdatedRoom`, `UpdatedPlayerProgress`       |
| `Loaded*`    | Data restored                | `LoadedSession`, `LoadedPreferences`         |
| `Hidden*`    | UI element dismissed         | `HiddenToast`, `HiddenCopiedIndicator`       |
| `Ticked*`    | Timer/interval tick          | `TickedCountdown`, `TickedExitCountdown`     |

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
- Prefix Option values with `maybe`: `maybeCurrentUser`, `maybeSession`, `maybeError`
- Boolean fields use `is*`: `isPlaying`, `isVisible`, `isMenuOpen`
- Command variables named by action: `fetchWeather`, not `fetchWeatherCommand`
- Command names are verb-first, present-tense: `FetchWeather`, `FocusButton`, `LockScroll`, `Tick`
- Callback parameters use full names: `(tickCount) => tickCount + 1` not `(t) => t + 1`
- Constants for magic numbers: `FINAL_PHOTO_INDEX` not `15`, `EXIT_COUNTDOWN_SECONDS` not `5`

### Schemas

- Capitalized string literals: `S.Literal('Horizontal', 'Vertical')` not `S.Literal('horizontal', 'vertical')`
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
maybeError: S.OptionFromSelf(S.String) // not error: S.String with '' as none

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
    ChangedEmail: ({ value }) => [evo(model, { email: () => value }), []],
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

// Nested update
evo(model, {
  homeStep: () => SelectAction({ username, selectedAction: 'CreateRoom' }),
})
```

Never mutate the model directly. Never use spread syntax for updates — `evo` is the canonical pattern.

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
const FetchState = S.Union(Idle, Loading, Error, Ok)

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
const ValidationState = S.Union(NotValidated, Validating, Valid, Invalid)
```

For multi-step flows:

```ts
const EnterEmail = ts('EnterEmail', { email: S.String })
const EnterPassword = ts('EnterPassword', {
  email: S.String,
  password: S.String,
})
const Confirming = ts('Confirming', { email: S.String })
const SignupStep = S.Union(EnterEmail, EnterPassword, Confirming)
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
import { Command, Runtime, Subscription, Task, Ui, Url } from 'foldkit'
import { Html, empty, html, keyed } from 'foldkit/html'
import { m } from 'foldkit/message'
import { r } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
```

Notes:

- When an Effect module name collides with a global, alias the Effect import with a trailing underscore: `String as String_`, `Array as Array_`, `Number as Number_`
- `Match as M` is Effect's Match module — Foldkit re-exports `M.value`, `M.tagsExhaustive`, `M.withReturnType` etc. through Effect's `Match`
- `Ui` from `foldkit` gives access to all UI components: `Ui.Dialog`, `Ui.Tabs`, `Ui.Menu`, etc.
- `empty` and `keyed` can be imported from `foldkit/html` directly or destructured from `html<Message>()`
