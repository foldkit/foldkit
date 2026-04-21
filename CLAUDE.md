# Claude Development Notes

This file contains preferences and conventions for Claude when working on this codebase.

## Project Conventions

- "Foldkit" is always capitalized in prose — in READMEs, docs, commit messages, comments, and conversation. The only exception is the npm package name (`foldkit`) and import paths (`from 'foldkit/html'`).
- In prose (docs, comments, conversation), capitalize Foldkit architecture concepts that correspond to actual types or named patterns: Model, Message, Command, Subscription, Task, Submodel, OutMessage. Keep lowercase for concepts that are just functions with no corresponding type or pattern: view, update, init.
- This is a Foldkit project — a framework built on Effect-TS. Always use Schema types (not plain TypeScript types), full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting). Follow the Submodels and OutMessage patterns used throughout the codebase.
- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS. The project already has a `create-foldkit-app` scaffolding tool — check existing features before suggesting new ones.
- Push back on any suggested direction that violates Elm Architecture principles — unidirectional data flow, Messages as facts (not commands), Model as single source of truth, and side effects confined to Commands. If a user or prompt suggests a pattern that breaks these conventions (e.g. mutating state directly, imperative event handlers, two-way bindings), flag the issue and propose the idiomatic Foldkit approach instead.

## Code Quality Standards

Before writing code, read the exemplar files to internalize the level of care expected:

Library internals (when working in `packages/foldkit/src/`):

- `packages/foldkit/src/runtime/runtime.ts` — orchestration, state management, error recovery
- `packages/foldkit/src/parser.ts` — bidirectional combinators, type-safe composition

Application architecture (when working in `packages/website/`, examples, or apps built with Foldkit):

- `examples/typing-game/client/src/` — Submodels, OutMessage, update/Message patterns, view decomposition, Commands

Match the quality and thoughtfulness of these files. The principles below apply broadly, but calibrate to the right context — library design when building Foldkit internals, application architecture when building with Foldkit:

- Every name should eliminate ambiguity. Prefix Option-typed values with `maybe` (e.g. `maybeCurrentVNode`, `maybeSession`). Name functions by their precise effect (e.g. `enqueueMessage` not `addMessage`). A reader should never need to check a type signature to understand what a name refers to.
- Each function should operate at a single abstraction level. Orchestrators delegate to focused helpers — they don't mix coordination with implementation. If a function reads like it's doing two things, extract one.
- Encode state in discriminated unions, not booleans or nullable fields. Use `Idle | Loading | Error | Ok` instead of `isLoading: boolean`. Use `EnterUsername | SelectAction | EnterRoomId` instead of `step: number`. Make impossible states unrepresentable.
- Name Messages as verb-first, past-tense events describing what happened (`SubmittedUsernameForm`, `CreatedRoom`, `PressedKey`), not imperative commands. The verb prefix acts as a category marker: `Clicked*` for button presses, `Updated*` for input changes, `Succeeded*`/`Failed*` for Command results that can meaningfully fail (e.g. `SucceededFetchWeather`, `FailedFetchWeather`), `Completed*` for fire-and-forget Command acknowledgments where the result is uninteresting and the update function is a no-op (e.g. `CompletedLockScroll`, `CompletedShowDialog`, `CompletedNavigateInternal`), `Got*` exclusively for receiving child module results via the Submodel pattern (e.g. `GotTransitionMessage`, `GotProductsMessage`). The update function decides what to do — Messages are facts.
- Never use `NoOp` as a Message. Every Message must carry meaning about what happened. Fire-and-forget Commands use `Completed*` Messages with verb-first naming that mirrors the Command name: Command `LockScroll` → Message `CompletedLockScroll`, Command `ShowDialog` → Message `CompletedShowDialog`, Command `FocusInput` → Message `CompletedFocusInput`. View-dispatched no-ops use descriptive facts: `IgnoredMouseClick`, `SuppressedSpaceScroll`.
- Use `Option` for values that flow through chains or pattern matching — `Option.match`, `Option.map`, `Option.flatMap`. Use `Option.fromNullable` at boundaries where the value will be matched or chained, not as a verbose synonym for `!== undefined`. Simple presence checks are fine when you're not chaining — don't wrap in Option just to immediately check `isSome`. Prefer `Option.match` over `Option.map` + `Option.getOrElse` — if you're unwrapping at the end, just match. Use `OptionExt.when(condition, value)` instead of `condition ? Option.some(value) : Option.none()`.
- Name Commands as verb-first imperatives describing what to do (`FetchWeather`, `FocusButton`, `LockScroll`) — they're instructions to the runtime. Messages describe the past, Command names command the present. UI component Commands use simple action names: `FocusButton`, `ScrollIntoView`, `NextFrame`, `WaitForTransitions`. App Commands use domain-specific names: `FetchWeather`, `ValidateEmail`, `SaveTodos`, `NavigateToRoom`. Composite Commands (e.g. lock scroll + show modal) are named by their primary action: `ShowDialog`, `CloseDialog`.
- Errors in Commands should become Messages via `Effect.catchAll(() => Effect.succeed(ErrorMessage(...)))`. Side effects should never crash the app.
- Extract complex update handlers or view sections into their own files when they grow beyond a few cases. Don't let logic pile up.
- Prefer curried, data-last functions that compose in `pipe` chains.
- Every line should serve a purpose. No dead code, no empty catch blocks, no placeholder types, no defensive code for impossible cases.

## Code Style Conventions

### Array Checks

- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`
- Use `Array.isNonEmptyArray(foo)` for non-empty checks
- When handling both empty and non-empty cases, prefer `Array.match` over `isEmptyArray`/`isNonEmptyArray` or .length checks

### Effect-TS Patterns

- **`pipe` is for multi-step data flow. Never use `pipe` for a single operation.** Call the function directly. Read this rule again before writing any `pipe()`.

  ```ts
  // ❌ WRONG — one operation, no pipe needed
  pipe(value, Option.match({ onNone: ..., onSome: ... }))
  pipe(xs, Array.map(f))
  pipe(maybeX, Option.getOrElse(() => fallback))

  // ✅ RIGHT — call the function directly
  Option.match(value, { onNone: ..., onSome: ... })
  Array.map(xs, f)
  Option.getOrElse(maybeX, () => fallback)

  // ✅ RIGHT — multiple operations, pipe is justified
  pipe(
    xs,
    Array.filter(isEnabled),
    Array.map(toDisplay),
    Array.take(5),
  )
  ```

  The test: if the `pipe` has only one argument after the data, you do not need `pipe`. Call the function directly. Wrapping a single call in `pipe()` adds zero value, costs a closure allocation, and obscures the code.

- **When composing two or more data transformations, prefer `pipe` to nested calls.** `pipe(xs, Array.head, Option.exists(p))` reads top-to-bottom as "take xs, take the head, check if it exists and satisfies p" — the data flow is on the page. `Option.exists(Array.head(xs), p)` reads inside-out and hides the pipeline. Applies to any chain of 2+ transforms.

- **Use `Effect.runSync(effect)` directly, not `effect.pipe(Effect.runSync)`**, for running a synchronous Effect. Same rule as "no pipe for single op" — the pipe form is a habit trap that single-step effects fall into.

- **Use `Equal.equals` for curried equality in callbacks.** `Option.exists(maybeItem, Equal.equals('Other'))` is cleaner than `Option.exists(maybeItem, item => item === 'Other')`. Same for `Array.findFirst(items, Equal.equals(target))` and similar. Point-free when the predicate is just "is this value equal to a known one."

- Use `Effect.gen()` for imperative-style async operations
- Use curried functions for better composition
- Always use Effect.Match instead of switch
- **Don't use if-return chains when you're dispatching on a single value.** A sequence of `if (x === 'A') { return ... }  if (x === 'B') { return ... }  ...  return default` is a switch in disguise — use `Match.value` with `M.when` / `M.whenOr` / `M.exhaustive` instead. The signal: if every early return tests the same variable against a different literal/tag, it's pattern matching spelled as control flow.
- **Prefer explicit `if` / `else` over `if { return ... }` + fallthrough return.** When both branches of a condition return, write both inside `if` / `else` blocks. Early-return reads as "A is the exceptional case, B is the default", which misrepresents a symmetric either/or. Early-return is correct only when it's a true guard (the other branch falls through to code after the `if`). For three or more branches on the same discriminant, use `Match.value` (see above).
- Prefer Effect module functions over native methods when available — e.g. `Array.map`, `Array.filter`, `Option.map`, `String.startsWith` from Effect instead of their native equivalents. This includes Effect's `String` module: use `String.includes`, `String.indexOf` (returns `Option<number>`), `String.slice`, `String.startsWith`, `String.replaceAll`, `String.length`, `String.isNonEmpty`, `String.trim` etc. in `pipe` chains. Exception: native `.map`, `.filter`, `.indexOf()`, `.slice()`, etc. are fine when calling directly on a named variable (e.g. `commands.map(Effect.map(...))`, `fullUrl.indexOf(prefix)`) — use Effect's curried, data-last forms in `pipe` chains where they compose naturally.
- **Never use sentinel values to signal absence.** `-1` from `.indexOf()`, `null`, empty strings, `NaN` — any "magic value that means not-here" is a code smell that leaks into every caller (`if (x === -1)`, `if (x !== null)`, etc.). Use `Option` instead. When you'd need to check for a sentinel, reach for the Effect module that returns `Option`: `String.indexOf` over `.indexOf()`, `Array.findFirst` over `.findIndex()`, `Option.fromNullable` at boundaries that hand you `T | null`. Native `.indexOf()` is acceptable only for membership tests expressed as `includes` — and even then prefer `String.includes` / `Array.contains`. The signal: if you're writing `=== -1` or `!== -1` right after an `indexOf`, stop and use `String.indexOf` / `Array.findFirst` + `Option.match`.
- **Import Effect modules by their PascalCase name; alias with a trailing underscore on collision.** Write `import { Array, String, Number, Function, Option } from 'effect'` — never abbreviate (`N`, `Arr`, `Str`). When the import would shadow a native global used in the same file, alias with `_` (e.g. `String as String_`, `Array as Array_`, `Number as Number_`). Only alias if you actually need the native global in the file — often `.toString()` or template literals sidestep the collision entirely.
- Prefer functional iteration — `Array.map`, `Array.reduce`, `Array.findFirst`, `Array.filterMap`, `Array.flatMap`, `Array.makeBy`. Use `for` loops and `let` only when bounded imperative loops with early exit are genuinely clearer than the functional alternative.
- Never cast Schema values with `as Type`. Use callable constructors: `LoginSucceeded({ sessionId })` not `{ _tag: 'LoginSucceeded', sessionId } as Message`. Let TypeScript infer Command return types from the Effect — explicit `Command.Command<typeof Foo>` annotations are unnecessary when using `Command.define`. The result Message schemas passed to `Command.define` constrain the Effect's return type at the type level.
- Use `Option` for model fields that represent absence — not empty strings or zero values as "none" states. `loginError: S.OptionFromSelf(S.String)` not `loginError: S.String` with `''` as the "none" state. Form input values that genuinely start as `''` are actual values, not absent — those stay as `S.String`. Use `Option.match` in views to conditionally render.
- Use `Array.take` instead of `.slice(0, n)` — especially avoid casting Schema arrays with `as readonly T[]` just to call `.slice`.

### Message Layout

Message definitions follow a strict four-group layout, whether in a dedicated message file or a message block within a larger file (like main.ts). Each group is separated by a blank line:

```ts
const A = m('A')
const B = m('B', { value: S.String })

const Message = S.Union(A, B)
type Message = typeof Message.Type
```

1. **Values** — all `m()` declarations, no blank lines between them
2. **Union + type** — `S.Union(...)` followed by `type Message = typeof Message.Type` on adjacent lines (no blank line between them)

Individual `type A = typeof A.Type` declarations are not needed — use `typeof A` in type positions (e.g. `Command<typeof A>`) to reference a schema value's type. Only create individual type aliases in library components where the type is part of a public API (e.g. `ViewConfig` callback parameters).

### Command Definitions

Create Commands with `Command.define`, which returns a `CommandDefinition` — the only way to construct a Command. Result Message schemas are required — pass every Message the Command can return after the name. Always assign definitions to PascalCase constants; never use `Command.define` inline in a pipe chain.

```ts
// Good — definition wraps the Effect (direct call, name leads)
const FetchWeather = Command.define('FetchWeather', SucceededFetchWeather, FailedFetchWeather)
const ScrollToTop = Command.define('ScrollToTop', CompletedScroll)
const scrollToTop = ScrollToTop(
  Effect.sync(() => { ... return CompletedScroll() }),
)

// Also fine — pipe-last when composing with an existing Effect pipeline
const fetchWeather = (city: string) =>
  Effect.gen(function* () { ... }).pipe(
    Effect.catchAll(() => Effect.succeed(FailedFetchWeather())),
    FetchWeather,
  )

// Bad — definition created and discarded (same as the old Command.make)
someEffect.pipe(Command.define('FetchWeather', SucceededFetchWeather, FailedFetchWeather))
```

Prefer the direct-call style (`Definition(effect)`) over pipe-last (`effect.pipe(Definition)`). The definition wraps the Effect — it's a type boundary (Effect → Command), not a pipeline step. The name leading makes Commands scannable in the COMMAND section.

Command definitions live where they're produced — colocated with the update function that returns them:

- **Single-module app** — define Commands in the `// COMMAND` section of `main.ts`, above the implementations
- **Multi-module app** — each module defines its own Commands (e.g. `search/command.ts` for search Commands, `main.ts` for app-level Commands)
- **Shared Commands** — define in the module that owns the concept, import from there
- **Never centralize** all Command definitions in a single file

### General Preferences

- **Never use nested ternaries.** `a ? x : b ? y : z` is dense at two levels and unreadable past three. Extract to an `if`/`return` chain, a `Match.value`, or a named helper function that encodes the decision in one place. A ternary is fine for a single boolean branch; nesting is not.
- Never abbreviate names. Use full, descriptive names everywhere — variables, types, functions, parameters, including callback parameters. e.g. `signature` not `sig`, `cart` not `c`, `Message` not `Msg`, `(tickCount) => tickCount + 1` not `(t) => t + 1`.
- Don't suffix Command variables with `Command`. Name them by what they do: `focusButton` not `focusButtonCommand`, `scrollToItem` not `scrollToItemCommand`. The type already communicates that it's a Command. Command definitions are PascalCase (`FocusButton`, `ScrollToItem`); Command instances and factory functions are camelCase (`focusButton`, `scrollToItem`).
- Avoid `let`. Use `const` and prefer immutable patterns. Only use `let` when mutation is truly unavoidable.
- Always use braces for control flow. `if (foo) { return true }` not `if (foo) return true`.
- Use `is*` for boolean naming e.g. `isPlaying`, `isValid`
- Don't add inline or block comments to explain code — if code needs explanation, refactor for clarity or use better names. Exceptions: section headers (`// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`), TSDoc (`/** ... */`) on all public exports, and `// NOTE:` comments. The bar for `NOTE:` is **high** — reserve it for behavior that would mislead a careful reader into breaking things: a timing dependency that's silent if violated, a workaround for a specific upstream bug, a browser quirk that costs real debugging time to rediscover. **Do not write `NOTE:` comments to explain normal patterns, state machine shapes, architectural choices, dynamic imports, framework idioms, what a function does, or why a submodel was introduced — anything a reader can derive from the surrounding file does not need one.** When in doubt, delete it. If the behavior turns out to be genuinely surprising, the first person to break it will write a proper explanation after they debug it.
- When editing code, follow existing patterns in the codebase exactly. Before writing new code, read 2-3 existing files that do similar things and match their style for naming, spacing, imports, and patterns. Never use placeholder types like `{_tag: string}`.
- Use capitalized string literals for Schema literal types: `S.Literal('Horizontal', 'Vertical')` not `S.Literal('horizontal', 'vertical')`.
- Capitalize namespace imports: `import * as Command from './command'` not `import * as command from './command'`.
- Extract magic numbers to named constants. No raw numeric literals in logic — e.g. `FINAL_PHOTO_INDEX` not `15`.
- Never use `T[]` syntax. Always use `Array<T>` or `ReadonlyArray<T>`.
- Never use `globalThis.Array` or other `globalThis.*` references. Use Effect module equivalents: `Array.fromIterable(nodeList)` not `globalThis.Array.from(nodeList)`.
- For inline object types, use `Readonly<{...}>` instead of writing `readonly` on each property. e.g. `Readonly<{ model: Foo; toParentMessage: (m: Bar) => Baz }>` not `{ readonly model: Foo; readonly toParentMessage: ... }`.
- In `pipe` chains, put the data being piped on its own line: `pipe(\n  data,\n  Array.map(f),\n)` not `pipe(data, Array.map(f))`. The data source leads, transforms follow.
- In callbacks, destructure the parameter when accessing a single field: `({ id }) => id === cardId` not `card => card.id === cardId`. Clearer what's being accessed without reading the full body.
- Don't add type annotations to evo callbacks when the type can be inferred. `gameState: () => 'Loading'` not `gameState: (): GameState => 'Loading'`.
- Don't annotate callback return types when the surrounding context already constrains them. `onNone: () => [model, []]` not `onNone: (): UpdateReturn => [model, []]`. This applies to `Option.match`, `M.tagsExhaustive`, `Effect.map`, and any other callback whose return type flows from the outer API. If inference fails, annotate the outermost context (e.g. the `M.withReturnType<T>()` call), not every inner callback.
- Never use bracket array indexing like `xs[0]` or `xs[xs.length - 1]`. Use `Array.get(index)` (returns `Option`), `Array.head` / `Array.last` (return `Option`), or `Array.headNonEmpty` / `Array.lastNonEmpty` (when the array is non-empty at the type level). Compose with `pipe` + `Option.match` / `Option.getOrElse`. Same goes for `xs.length === 0` / `xs.length > 0` — use `Array.isEmptyArray` / `Array.isNonEmptyArray`.

### Application Architecture

- **Key every branching view.** Whenever a DOM position can render different content based on a value (a route tag, a top-level model variant, a sub-model, or any other tagged union), wrap it in a single `keyed` element whose key is a discriminating string: `keyed('div')(model.route._tag, [], [routeContent])`. The same rule applies to any control-flow branch that produces different content: `Match`, `if/else`, and ternaries. Without a key, snabbdom patches one version into another, which can cause stale input state, mismatched event handlers, and carried-over focus.
- **Key mapped list items by a stable model identifier**, never by array position. `entry.id` not `index`. Positional diffing looks correct until an entry is removed from the middle of the list or the list is reordered. Snabbdom then patches the old row's DOM into what should be a different row.
- **Key conditional inserts between stable siblings.** When rendering `[a, ...(cond ? [b] : []), c]`, give each of a/b/c a key. Snabbdom's diff can often handle this correctly by matching elements on their tag and classes, but that's implicit behavior. Explicit keys make the intent clear and stay correct across refactors.
- **`index.ts` is always a barrel; real code lives in a named file.** For a module `foo/`, the shape is `foo/foo.ts` for the code and `foo/index.ts` for the barrel. `index.ts` re-exports via `export * from './foo'` and nests child modules as namespaces via `export * as Child from './child'`. Never put implementation code in `index.ts`. This applies everywhere — domain modules (`domain/step.ts` + `domain/index.ts` re-exports), submodels with children (`step/education/education.ts` + `step/education/entry.ts` + `step/education/index.ts` barrel), nested UI components. Consumer imports read as `import { Education } from '../step'` → `Education.Model`, `Education.Entry.Model`. The hierarchy is visible in the file tree AND in the namespace.
- Extract Messages to a dedicated `message.ts` file when Commands need Message constructors — this breaks the circular dependency between command.ts and main.ts. Export all schemas individually and as the `Message` union type.
- Use the `ViteEnvConfig` Effect.Service pattern for environment variables in RPC layers (see `examples/typing-game/client/src/config.ts`). For values needed synchronously in views (e.g. photo URLs), keep a simple module-level `const` alongside the service.
- Extract repeated inline style values (colors, shadows) to constants. Use Tailwind `@theme` for colors that map to utility classes (e.g. `--color-valentine: #ff2d55` → `text-valentine`). Use a `theme.ts` for values Tailwind can't express as utilities (textShadow, boxShadow).

### Commits and Releases

- Use Conventional Commits. Add `!` after the scope for breaking changes (e.g. `refactor(schema)!:` when renaming or removing a public export)
- **Commit messages are historical records, not live docs.** Time-bound claims ("first component to X", "replaces the old Y approach", "before this, Z") are appropriate in commit bodies — they describe the state of the world at the moment the commit landed. A reader of `git log` already understands they're reading through time. Don't flag such claims as "will rot" during commit review; rotting is a concern for TSDoc, README, and live documentation, not the git log.
- Scope must identify the **package or example**, not an internal module. Valid scopes:
  - Packages: `foldkit`, `create-foldkit-app`, `vite-plugin`, `website`
  - Examples: the directory name — `pixel-art`, `auth`, `weather`, `counter`, etc.
  - Infrastructure: `ci`, `release`
  - Never use internal module names as scopes (e.g. `devtools`, `runtime`, `html`)
- Do not co-author or mention Claude in commit messages
- Do not mention Claude in release notes
- When merging PRs via `gh pr merge`, always use `--squash` — never create merge commits on main

## Editing Rules

- When making multi-file edits or refactors, apply changes to ALL relevant files — not just a subset. After refactoring, verify that spacing, margins, and visual formatting haven't regressed from the original.

## Communication

- When I ask a question or make a comment that sounds rhetorical, opinion-based, or conversational (e.g., 'what do you think about X?', 'im asking you'), respond with discussion — not code edits. Only make code changes when explicitly asked to.
- When I leave CLAUDE-prefixed comments in code, those are instructions for you. Search for them explicitly and address them. Do not remove or skip them.

## Prose Style

- **No em dashes.** You compulsively reach for them and the user is sick of removing them. Default to periods. A comma, semicolon, parentheses, or a colon will also almost always work. Before typing `—`, stop: a period and a fresh sentence is the right answer 99% of the time. "It runs at startup — useful for QA" should be "It runs at startup. Useful for QA." Applies to comments, TSDoc, docs, snippets, website copy, conversation, and especially anything user-facing. The only place em dashes are allowed: commit messages. Everywhere else, treat `—` as a typo.
