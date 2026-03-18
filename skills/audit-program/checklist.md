# Foldkit Program Audit Checklist

Work through each category in order. Record every failure with its file, line number, and the specific violation.

## 1. Purity & Side Effects

### update function

- [ ] No `Date.now()`, `Math.random()`, or non-deterministic calls
- [ ] No DOM access (`document.*`, `window.*`, `navigator.*`)
- [ ] No `console.log`, `console.error`, or other I/O
- [ ] No `Effect.runSync` / `Effect.runPromise`
- [ ] No `async` / `await`
- [ ] No mutation (`.push()`, `.splice()`, `++`, `obj.field = value`)
- [ ] No `let` declarations
- [ ] No closures over mutable external state

### view function

- [ ] No side effects — view is `(model) → Html`
- [ ] No access to external state beyond the Model
- [ ] No closures over mutable variables
- [ ] No `Date.now()`, `Math.random()`, or non-deterministic calls
- [ ] Event handlers dispatch Messages — they don't perform actions directly

### init function

- [ ] Returns `[Model, Commands]` — no side effects in the function body
- [ ] Startup work (fetch, focus, storage reads) delegated to Commands or Flags
- [ ] No module-level side effects used to seed the initial Model (use Flags instead)

## 2. State Design

- [ ] Discriminated unions for multi-valued state — not booleans or nullable fields
  - e.g. `Idle | Loading | Error | Ok` instead of `isLoading: boolean`
- [ ] `Option` for fields that may be absent — not empty strings, `null`, or zero
- [ ] Option-typed fields prefixed with `maybe` (e.g. `maybeCurrentUser`, `maybeError`)
- [ ] No derived data stored in the Model — computed values belong in the view
- [ ] Model is the single source of truth — no state outside the Model (no module-level `let`, no DOM as state)
- [ ] Impossible states are unrepresentable — correlated fields grouped into a single union
- [ ] `ts()` for non-Message tagged structs (Model states, route variants)
- [ ] `m()` only for Message variants
- [ ] Callable Schema constructors used (not `as` casts or manual `_tag` objects)

## 3. Message Design

### Naming

- [ ] Messages are past-tense, verb-first facts — not imperative commands
  - e.g. `ClickedSubmit` not `HandleSubmit`, `SubmittedForm` not `SubmitForm`
- [ ] Correct verb prefixes used:
  - `Clicked*` for button/link presses
  - `Changed*` for input value changes (with `{ value: S.String }`)
  - `Submitted*` for form submissions
  - `Pressed*` for keyboard input
  - `Blurred*` for focus loss
  - `Selected*` for choices
  - `Toggled*` for binary state flips
  - `Succeeded*` / `Failed*` paired for failable commands
  - `Completed*` for fire-and-forget acknowledgments
  - `Got*` for child module OutMessage results
  - `Updated*` for external state changes
  - `Loaded*` for data restoration
  - `Hidden*` for UI element dismissal
  - `Ticked*` for timer/interval ticks
- [ ] `Completed*` uses object+verb compound nouns — object first
  - e.g. `CompletedInputFocus` not `CompletedFocusInput`
- [ ] No `NoOp` message — every message carries meaning

### Structure

- [ ] Four-group layout: values → blank line → Union + type
- [ ] No individual `type A = typeof A.Type` aliases (unless public library API)
- [ ] Every `m()` declaration included in the `S.Union`
- [ ] Every `Succeeded*` has a paired `Failed*`

### Exhaustiveness

- [ ] Every Message variant is dispatched somewhere (view or command)
- [ ] Every Message variant is handled in update — no dead messages after refactors

## 4. Command Design

- [ ] Named by what they do: `fetchWeather`, `focusInput` — not `fetchWeatherCommand`
- [ ] Narrow return types: `Command<typeof Succeeded | typeof Failed>` — not `Command<Message>`
- [ ] All errors caught: `Effect.catchAll(() => Effect.succeed(FailedX(...)))` — no command can throw
- [ ] Fire-and-forget commands return `Completed*` Messages
- [ ] DOM operations use Task helpers (`Task.focus`, `Task.scrollIntoView`, `Task.showModal`, etc.) — not raw `document.querySelector`
- [ ] HTTP requests use `HttpClient` from `@effect/platform` — not `fetch`
- [ ] Commands are never constructed in view — only returned from update

## 5. Update Architecture

- [ ] Uses `M.value(message).pipe(withUpdateReturn, M.tagsExhaustive({...}))` — not `switch`
- [ ] Every case returns `[Model, ReadonlyArray<Command<Message>>]`
- [ ] Uses `evo(model, { field: () => value })` for immutable updates — not spread
- [ ] No mutation of Model
- [ ] Single abstraction level per function — orchestrators delegate to helpers
- [ ] Complex handlers (exceeding ~15 lines) extracted to separate functions
- [ ] For Submodels: returns `[Model, Commands, Option<OutMessage>]` as third element

## 6. View Architecture

- [ ] `keyed` wrappers on layout branches when view branches into structurally different layouts
- [ ] Content area keyed on route tag (`keyed('div')(model.route._tag, ...)`) for page transitions
- [ ] Events wire to Messages: `OnClick(() => Clicked())`, `OnInput(value => Changed({ value }))`
- [ ] Complex view sections (exceeding ~30 lines) extracted to separate functions or files
- [ ] Same Model always produces same Html — no external state in view
- [ ] Semantic HTML elements used (`main`, `nav`, `section`, `article`, `header`, `footer`)
- [ ] Uses `clsx` for conditional class composition — not string concatenation, template literals, or `&&`
- [ ] `Option.match` for conditional rendering based on Option fields
- [ ] `M.tagsExhaustive` for rendering based on discriminated union state

## 7. Submodels & OutMessage

_Skip if no submodels are present._

- [ ] Child modules communicate upward via OutMessage — not by importing parent Messages
- [ ] Child update returns `[Model, Commands, Option<OutMessage>]`
- [ ] Parent handles all OutMessage variants in its `Got*` handler with `M.tagsExhaustive`
- [ ] Parent maps child commands: `childCommands.map(Effect.map(message => GotChildMessage({ message })))`
- [ ] Child view accepts `toMessage` function to wrap messages for parent
- [ ] `message.ts` extracted when commands need message constructors (breaks circular deps)

## 8. Subscriptions & Resources

_Skip if no subscriptions or managed resources are present._

### Subscriptions

- [ ] Defined with `Subscription.makeSubscriptions(Deps)<Model, Message>`
- [ ] `modelToDependencies` returns `Option.none()` to stop — subscriptions tied to Model state
- [ ] Always-active subscriptions use `S.Null` dependency type
- [ ] Streams handle errors: `Stream.catchAll` produces a failure Message — no unhandled stream errors
- [ ] No subscription streams that never terminate without a cleanup path

### Managed Resources

- [ ] Every `acquire` has a corresponding `release`
- [ ] Resources that activate/deactivate based on state use ManagedResource — not Layer
- [ ] One-time setup (AudioContext, DB) uses Layer — not ManagedResource

## 9. Routing

_Skip if no routing is present._

- [ ] Bidirectional parser using `r()`, `param()`, `literal()`, `oneOf()`
- [ ] Route schemas defined with `r('RouteName', { param: S.String })`
- [ ] Uses `Runtime.makeApplication` (not `makeElement`)
- [ ] `ClickedLink` and `ChangedUrl` Messages present with proper `InternalUrl`/`ExternalUrl` handling
- [ ] Every route variant has a corresponding view branch
- [ ] `pushUrl` from `foldkit/navigation` used for programmatic navigation — not `window.location`
- [ ] Navigation handled through Messages — no imperative route changes

## 10. Effect-TS Idioms

- [ ] `pipe()` only for multi-step chains — not single operations
- [ ] `Effect.gen()` for imperative-style async in commands
- [ ] `Effect.Match` (via `M.tagsExhaustive`) for all tagged union matching — no `switch`
- [ ] Effect module functions in `pipe` chains — `Array.map`, `Option.map`, `String.startsWith` from Effect
  - Native methods (`.map`, `.filter`) fine when called directly on named variables outside pipes
- [ ] No `for` loops or `let` for iteration — `Array.makeBy`, `Array.filterMap`, `Array.flatMap`, `Array.range`
- [ ] `Array.isEmptyArray` / `Array.isNonEmptyArray` — not `.length === 0`
- [ ] `Array.match` when handling both empty and non-empty cases
- [ ] `Array.take` instead of `.slice(0, n)`
- [ ] `Option.match` preferred over `Option.map` + `Option.getOrElse`
- [ ] `OptionExt.when(condition, value)` instead of ternary with `Option.some`/`Option.none`
- [ ] Schema types throughout — no plain TypeScript types where Schema types are expected
- [ ] `withReturnType` — not `as const` or type casting

## 11. Naming & Style

- [ ] No abbreviations: `signature` not `sig`, `message` not `msg`, `username` not `user`
- [ ] Full names in callback parameters: `(tickCount) => tickCount + 1` not `(t) => t + 1`
- [ ] Boolean fields prefixed with `is`: `isPlaying`, `isValid`
- [ ] Named constants for all magic numbers: `FINAL_PHOTO_INDEX` not `15`
- [ ] `ReadonlyArray<T>` or `Array<T>` — never `T[]` syntax
- [ ] Capitalized string literals in Schema: `S.Literal('Active', 'Inactive')`
- [ ] Capitalized namespace imports: `import * as Command from './command'`
- [ ] No inline/block comments — refactor for clarity instead
  - Exceptions: section headers (`// MODEL`, `// MESSAGE`, etc.) and TSDoc on public exports
- [ ] Always braces for control flow: `if (foo) { return true }` not `if (foo) return true`
- [ ] `const` exclusively — `let` only when truly unavoidable
- [ ] No dead code, empty catch blocks, placeholder types, or defensive code for impossible cases

## 12. Error Recovery & Resilience

- [ ] Every command failure state is represented in the Model (discriminated union variant)
- [ ] Recovery path exists from every error state (retry button, back navigation, etc.)
- [ ] Long-running commands have a corresponding Loading state in the Model
- [ ] No swallowed errors — `Effect.catchAll` produces a meaningful `Failed*` Message, not `Effect.void`

## 13. Foldkit UI Components

_Skip if no interactive widgets are present._

- [ ] Foldkit UI components used where interaction matches (Dialog, Tabs, Menu, Combobox, etc.) — no hand-rolled accessible widgets
- [ ] Each UI component has: Model in app Model, `Got*` Message, init in init, delegation in update
- [ ] No custom keyboard navigation or ARIA for patterns covered by Foldkit UI components

## 14. File Organization

- [ ] Message layout follows four-group convention (values → blank line → Union + type)
- [ ] Section headers in single-file apps: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`
- [ ] File organization matches complexity tier (single file for Tier 1-2, split for 3+, submodel dirs for 6-7)
- [ ] Complex update handlers extracted to separate functions
- [ ] View decomposed when branches exceed ~30 lines
- [ ] No circular imports — `message.ts` extracted when commands need message constructors
