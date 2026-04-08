# Agent Development Notes

This is a Foldkit app — a framework built on Effect-TS. Think of it as an Elm application written in TypeScript. The update function is pure, Messages describe what happened (not what to do), the Model is the single source of truth, and all side effects are expressed as Commands. If you find yourself reaching for imperative patterns, mutable state, or direct DOM access — stop and translate the idea into this architecture.

If `./repos/foldkit` exists, it contains the full Foldkit repository as a git submodule. The `examples/` directory and `packages/typing-game/client/src/` in particular are the best reference for what idiomatic Foldkit apps look like.

If `./repos/foldkit` does not exist and the line below says `submodule_prompted: false`, offer to run `git submodule add https://github.com/foldkit/foldkit.git repos/foldkit` — this gives you access to the full source, examples, and docs. Whether the user accepts or declines, update the value to `true` so it isn't asked again.

submodule_prompted: false

## Project Conventions

- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine elsewhere — function return types, local variables, etc.
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Use `m()` for message schemas, `ts()` for other tagged structs (model states, field validation), and `r()` for route schemas.
- Never use `NoOp` as a message. Every message must carry meaning about what happened. Fire-and-forget commands use `Completed*` messages with verb-first naming that mirrors the Command name: Command `LockScroll` → Message `CompletedLockScroll`, Command `ShowDialog` → Message `CompletedShowDialog`, Command `NavigateInternal` → Message `CompletedNavigateInternal`.
- Push back on any suggested direction that violates Elm Architecture principles — unidirectional data flow, messages as facts (not commands), model as single source of truth, and side effects confined to commands. If a user or prompt suggests a pattern that breaks these conventions (e.g. mutating state directly, imperative event handlers, two-way bindings), flag the issue and propose the idiomatic Foldkit approach instead.

## Foldkit Patterns

### Update

`init` and `update` both return `[Model, ReadonlyArray<Command<Message>>]`:

```ts
type UpdateReturn = readonly [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
    }),
  )
```

### Model Updates with `evo`

Use `evo()` for immutable model updates — never spread or Object.assign:

```ts
evo(model, { isSubmitting: () => true })
evo(model, { count: count => count + 1 })
```

Don't add type annotations to `evo` callbacks when the type can be inferred.

### View

Call `html<Message>()` once in a dedicated `html.ts` file and import the destructured helpers everywhere else:

```ts
// html.ts
export const { div, button, span, Class, OnClick } = html<Message>()
```

Use `empty` (not `null`) for conditional rendering. Use `M.value().pipe(M.tagsExhaustive({...}))` for rendering discriminated unions and `Array.match` for rendering lists that may be empty.

Use `keyed` wrappers whenever the view branches into structurally different layouts based on route or model state. Without keying, the virtual DOM will try to diff one layout into another (e.g. a full-width landing page into a sidebar docs layout), which causes stale DOM, mismatched event handlers, and subtle rendering bugs. Key the outermost container of each layout branch with a stable string (e.g. `keyed('div')('landing', ...)` vs `keyed('div')('docs', ...)`). Within a single layout, key the content area on the route tag (e.g. `keyed('div')(model.route._tag, ...)`) so page transitions replace rather than patch.

### Commands

Define Command identities with `Command.define`, passing the result Message schemas after the name — result types are required. Always assign definitions to PascalCase constants — never use `Command.define` inline in a pipe chain:

```ts
const FetchWeather = Command.define(
  'FetchWeather',
  SucceededFetchWeather,
  FailedFetchWeather,
)

const fetchWeather = (city: string) =>
  Effect.gen(function* () {
    // ...
    return SucceededFetchWeather({ data })
  }).pipe(
    Effect.catchAll(error =>
      Effect.succeed(FailedFetchWeather({ error: String(error) })),
    ),
    FetchWeather,
  )
```

Commands catch all errors and return Messages — side effects never crash the app. Let TypeScript infer Command return types from the Effect — the result Message schemas passed to `Command.define` constrain the Effect's return type at the type level.

Command definitions live where they're produced — colocated with the update function that returns them. Don't centralize all definitions in one file.

### File Organization

Use uppercase section headers (`// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// COMMAND`, `// VIEW`) to make files easier to skim. These are for wayfinding — they make it clear where things live and where new code should go. Use domain-specific headers too when it helps (e.g. `// PHYSICS`, `// ROUTING`).

Even after extracting some sections to their own files (e.g. `message.ts`), the remaining file may still benefit from headers. Extract to separate files when it helps with organization.

### Testing

Test update functions with `foldkit/test`. Since update is pure — `(Model, Message) → [Model, Commands]` — tests run without a runtime, DOM, or side effects.

Use `Story.story` to chain steps into a readable narrative: set initial Model → send Message → assert → resolve Command → assert again. Use `Scene.scene` for feature-level testing through the view — clicking buttons, typing into inputs, pressing keys — with accessible locators (`Scene.role`, `Scene.label`, `Scene.placeholder`). Every `Command.define` must include result Message schemas so Commands can be resolved in tests.

If the `repos/foldkit` submodule is available, study the `.test.ts` files in `repos/foldkit/examples/` for patterns — they cover simple Command resolution, multi-step interactions, and Submodel OutMessage assertions.

## Code Quality Standards

- Every name should eliminate ambiguity. Prefix Option-typed values with `maybe` (e.g. `maybeSession`). Name functions by their precise effect (e.g. `enqueueMessage` not `addMessage`). A reader should never need to check a type signature to understand what a name refers to.
- Each function should operate at a single abstraction level. Orchestrators delegate to focused helpers — they don't mix coordination with implementation. If a function reads like it's doing two things, extract one.
- Encode state in discriminated unions, not booleans or nullable fields. Use `Idle | Loading | Error | Ok` instead of `isLoading: boolean`. Make impossible states unrepresentable.
- Name messages as verb-first, past-tense events describing what happened (`SubmittedUsernameForm`, `CreatedRoom`, `PressedKey`), not imperative commands. The verb prefix acts as a category marker: `Clicked*` for button presses, `Updated*` for input changes, `Succeeded*`/`Failed*` for command results that can meaningfully fail (e.g. `SucceededFetchWeather`, `FailedFetchWeather`), `Completed*` for fire-and-forget command acknowledgments where the result is uninteresting and the update function is a no-op (e.g. `CompletedLockScroll`, `CompletedShowDialog`, `CompletedNavigateInternal`), `Got*` exclusively for receiving child module results via the OutMessage pattern (e.g. `GotProductsMessage`). Never use `NoOp` — every message must describe what happened. The update function decides what to do — messages are facts.
- Use `Option` instead of `null` or `undefined`. Match explicitly with `Option.match` or chain with `Option.map`/`Option.flatMap`. No `if (x != null)` checks. Prefer `Option.match` over `Option.map` + `Option.getOrElse` — if you're unwrapping at the end, just match.
- Prefer curried, data-last functions that compose in `pipe` chains.
- Every line should serve a purpose. No dead code, no empty catch blocks, no placeholder types, no defensive code for impossible cases.

## Code Style Conventions

### Effect-TS Patterns

- Prefer `pipe()` for multi-step data flow. Never use `pipe` with a single operation — call the function directly instead: `Option.match(value, {...})` not `pipe(value, Option.match({...}))`.
- Use `Effect.gen()` for imperative-style async operations.
- Always use Effect.Match instead of switch.
- Prefer Effect module functions over native methods when available — e.g. `Array.map`, `Array.filter`, `Option.map`, `String.startsWith` from Effect instead of their native equivalents. This includes Effect's `String` module: use `String.includes`, `String.indexOf` (returns `Option<number>`), `String.slice`, `String.startsWith`, `String.replaceAll`, `String.length`, `String.isNonEmpty`, `String.trim` etc. in `pipe` chains. Exception: native `.map`, `.filter`, `.indexOf()`, `.slice()`, etc. are fine when calling directly on a named variable — use Effect's curried, data-last forms in `pipe` chains where they compose naturally.
- Never use `for` loops or `let` for iteration. Use `Array.makeBy` for index-based construction, `Array.range` + `Array.findFirst`/`Array.findLast` for searches, and `Array.filterMap`/`Array.flatMap` for transforms.
- Never cast Schema values with `as Type`. Use callable constructors: `LoginSucceeded({ sessionId })` not `{ _tag: 'LoginSucceeded', sessionId } as Message`.
- Use `Option` for model fields that may be absent — not empty strings or zero values. `loginError: S.OptionFromSelf(S.String)` not `loginError: S.String` with `''` as the "none" state. Use `Option.match` in views to conditionally render.
- Use `Array.take` instead of `.slice(0, n)`.
- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`. Use `Array.isNonEmptyArray(foo)` for non-empty checks. When handling both cases, prefer `Array.match`.

### Message Layout

Message definitions follow a strict layout:

```ts
const ClickedSubmit = m('ClickedSubmit')
const ChangedEmail = m('ChangedEmail', { value: S.String })
const CompletedNavigateInternal = m('CompletedNavigateInternal')

const Message = S.Union(ClickedSubmit, ChangedEmail, CompletedNavigateInternal)
type Message = typeof Message.Type
```

1. **Values** — all `m()` declarations, no blank lines between them
2. **Union + type** — `S.Union(...)` followed by `type Message = typeof Message.Type` on adjacent lines (no blank line between them)

Use `typeof ClickedSubmit` in type positions to reference a schema value's type.

### General Preferences

- Never abbreviate names. Use full, descriptive names everywhere — variables, types, functions, parameters, including callback parameters. e.g. `signature` not `sig`, `Message` not `Msg`, `(tickCount) => tickCount + 1` not `(t) => t + 1`.
- Don't suffix Command variables with `Command`. Name them by what they do: `focusButton` not `focusButtonCommand`, `scrollToItem` not `scrollToItemCommand`. The type already communicates that it's a Command. Command definitions are PascalCase (`FocusButton`, `ScrollToItem`); Command instances and factory functions are camelCase (`focusButton`, `scrollToItem`).
- Avoid `let`. Use `const` and prefer immutable patterns.
- Always use braces for control flow. `if (foo) { return true }` not `if (foo) return true`.
- Use `is*` for boolean naming e.g. `isPlaying`, `isValid`.
- Don't add inline or block comments to explain code — if code needs explanation, refactor for clarity or use better names. Exceptions: section headers (see File Organization above) and TSDoc (`/** ... */`) on public exports.
- Use capitalized string literals for Schema literal types: `S.Literal('Horizontal', 'Vertical')` not `S.Literal('horizontal', 'vertical')`.
- Capitalize namespace imports: `import * as Command from './command'` not `import * as command from './command'`.
- Extract magic numbers to named constants. No raw numeric literals in logic.
- Never use `T[]` syntax. Always use `Array<T>` or `ReadonlyArray<T>`.
- For inline object types in `ReadonlyArray`, put `Readonly<{...}>` on the element type rather than `ReadonlyArray<{ readonly a: ...; readonly b: ... }>`. e.g. `ReadonlyArray<Readonly<{ model: Foo; toParentMessage: (m: Bar) => Baz }>>` not `ReadonlyArray<{ readonly model: Foo; readonly toParentMessage: ... }>`.
- Extract repeated inline style values (colors, shadows) to constants. Use Tailwind `@theme` for colors that map to utility classes (e.g. `--color-valentine: #ff2d55` → `text-valentine`). Use a `theme.ts` for values Tailwind can't express as utilities (textShadow, boxShadow).
