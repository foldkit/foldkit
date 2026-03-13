# Claude Development Notes

This file contains preferences and conventions for Claude when working on this codebase.

## Project Conventions

- "Foldkit" is always capitalized in prose — in READMEs, docs, commit messages, comments, and conversation. The only exception is the npm package name (`foldkit`) and import paths (`from 'foldkit/html'`).
- In prose (docs, comments, conversation), capitalize Foldkit architecture concepts that correspond to actual types: Model, Message, Command, Subscription, Task. Keep lowercase for concepts that are just functions with no corresponding type: view, update, init.
- This is a Foldkit project — a framework built on Effect-TS. Always use Schema types (not plain TypeScript types), full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting). Follow the Submodels and OutMessage patterns used throughout the codebase.
- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS. The project already has a `create-foldkit-app` scaffolding tool — check existing features before suggesting new ones.
- Push back on any suggested direction that violates Elm Architecture principles — unidirectional data flow, messages as facts (not commands), model as single source of truth, and side effects confined to commands. If a user or prompt suggests a pattern that breaks these conventions (e.g. mutating state directly, imperative event handlers, two-way bindings), flag the issue and propose the idiomatic Foldkit approach instead.

## Code Quality Standards

Before writing code, read the exemplar files to internalize the level of care expected:

Library internals (when working in `packages/foldkit/src/`):

- `packages/foldkit/src/runtime/runtime.ts` — orchestration, state management, error recovery
- `packages/foldkit/src/parser.ts` — bidirectional combinators, type-safe composition

Application architecture (when working in `packages/website/`, examples, or apps built with Foldkit):

- `examples/typing-game/client/src/` — Submodels, OutMessage, update/message patterns, view decomposition, commands

Match the quality and thoughtfulness of these files. The principles below apply broadly, but calibrate to the right context — library design when building Foldkit internals, application architecture when building with Foldkit:

- Every name should eliminate ambiguity. Prefix Option-typed values with `maybe` (e.g. `maybeCurrentVNode`, `maybeSession`). Name functions by their precise effect (e.g. `enqueueMessage` not `addMessage`). A reader should never need to check a type signature to understand what a name refers to.
- Each function should operate at a single abstraction level. Orchestrators delegate to focused helpers — they don't mix coordination with implementation. If a function reads like it's doing two things, extract one.
- Encode state in discriminated unions, not booleans or nullable fields. Use `Idle | Loading | Error | Ok` instead of `isLoading: boolean`. Use `EnterUsername | SelectAction | EnterRoomId` instead of `step: number`. Make impossible states unrepresentable.
- Name messages as verb-first, past-tense events describing what happened (`SubmittedUsernameForm`, `CreatedRoom`, `PressedKey`), not imperative commands. The verb prefix acts as a category marker: `Clicked*` for button presses, `Updated*` for input changes, `Succeeded*`/`Failed*` for command results that can meaningfully fail (e.g. `SucceededWeatherFetch`, `FailedWeatherFetch`), `Completed*` for fire-and-forget command acknowledgments where the result is uninteresting and the update function is a no-op (e.g. `CompletedScroll`, `CompletedApplyTheme`, `CompletedSaveThemePreference`), `Got*` exclusively for receiving child module results via the OutMessage pattern (e.g. `GotProductsMessage`). The update function decides what to do — messages are facts.
- Use `Option` instead of `null` or `undefined`. Match explicitly with `Option.match` or chain with `Option.map`/`Option.flatMap`. No `if (x != null)` checks. Prefer `Option.match` over `Option.map` + `Option.getOrElse` — if you're unwrapping at the end, just match. Use `OptionExt.when(condition, value)` instead of `condition ? Option.some(value) : Option.none()`.
- Errors in commands should become messages via `Effect.catchAll(() => Effect.succeed(ErrorMessage(...)))`. Side effects should never crash the app.
- Extract complex update handlers or view sections into their own files when they grow beyond a few cases. Don't let logic pile up.
- Prefer curried, data-last functions that compose in `pipe` chains.
- Every line should serve a purpose. No dead code, no empty catch blocks, no placeholder types, no defensive code for impossible cases.

## Code Style Conventions

### Array Checks

- Always use `Array.isEmptyArray(foo)` instead of `foo.length === 0`
- Use `Array.isNonEmptyArray(foo)` for non-empty checks
- When handling both empty and non-empty cases, prefer `Array.match` over `isEmptyArray`/`isNonEmptyArray` or .length checks

### Effect-TS Patterns

- Prefer `pipe()` for multi-step data flow. Never use `pipe` with a single operation — call the function directly instead: `Option.match(value, {...})` not `pipe(value, Option.match({...}))`.
- Use `Effect.gen()` for imperative-style async operations
- Use curried functions for better composition
- Always use Effect.Match instead of switch
- Prefer Effect module functions over native methods when available — e.g. `Array.map`, `Array.filter`, `Option.map`, `String.startsWith` from Effect instead of their native equivalents. This includes Effect's `String` module: use `String.includes`, `String.indexOf` (returns `Option<number>`), `String.slice`, `String.startsWith`, `String.replaceAll`, `String.length`, `String.isNonEmpty`, `String.trim` etc. in `pipe` chains. Exception: native `.map`, `.filter`, `.indexOf()`, `.slice()`, etc. are fine when calling directly on a named variable (e.g. `commands.map(Effect.map(...))`, `fullUrl.indexOf(prefix)`) — use Effect's curried, data-last forms in `pipe` chains where they compose naturally.
- Never use `for` loops or `let` for iteration. Use `Array.makeBy` for index-based construction, `Array.range` + `Array.findFirst`/`Array.findLast` for searches, and `Array.filterMap`/`Array.flatMap` for transforms.
- Never cast Schema values with `as Type`. Use callable constructors: `LoginSucceeded({ sessionId })` not `{ _tag: 'LoginSucceeded', sessionId } as Message`. Commands should return specific schema types (e.g. `Command<typeof LoginSucceeded | typeof LoginFailed>`) rather than the full Message type.
- Use `Option` for model fields that may be absent — not empty strings or zero values. `loginError: S.OptionFromSelf(S.String)` not `loginError: S.String` with `''` as the "none" state. Use `Option.match` in views to conditionally render.
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

### General Preferences

- Never abbreviate names. Use full, descriptive names everywhere — variables, types, functions, parameters, including callback parameters. e.g. `signature` not `sig`, `cart` not `c`, `Message` not `Msg`, `(tickCount) => tickCount + 1` not `(t) => t + 1`.
- Don't suffix command variables with `Command`. Name them by what they do: `focusButton` not `focusButtonCommand`, `scrollToItem` not `scrollToItemCommand`. The type already communicates that it's a command.
- Avoid `let`. Use `const` and prefer immutable patterns. Only use `let` when mutation is truly unavoidable.
- Always use braces for control flow. `if (foo) { return true }` not `if (foo) return true`.
- Use `is*` for boolean naming e.g. `isPlaying`, `isValid`
- Don't add inline or block comments to explain code — if code needs explanation, refactor for clarity or use better names. Exceptions: section headers (`// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`) and TSDoc (`/** ... */`) on all public exports are required.
- When editing code, follow existing patterns in the codebase exactly. Before writing new code, read 2-3 existing files that do similar things and match their style for naming, spacing, imports, and patterns. Never use placeholder types like `{_tag: string}`.
- Use capitalized string literals for Schema literal types: `S.Literal('Horizontal', 'Vertical')` not `S.Literal('horizontal', 'vertical')`.
- Capitalize namespace imports: `import * as Command from './command'` not `import * as command from './command'`.
- Extract magic numbers to named constants. No raw numeric literals in logic — e.g. `FINAL_PHOTO_INDEX` not `15`.
- Never use `T[]` syntax. Always use `Array<T>` or `ReadonlyArray<T>`.
- For inline object types in `ReadonlyArray`, put `Readonly<{...}>` on the element type rather than `ReadonlyArray<{ readonly a: ...; readonly b: ... }>`. e.g. `ReadonlyArray<Readonly<{ model: Foo; toMessage: (m: Bar) => Baz }>>` not `ReadonlyArray<{ readonly model: Foo; readonly toMessage: ... }>`.
- Don't add type annotations to evo callbacks when the type can be inferred. `gameState: () => 'Loading'` not `gameState: (): GameState => 'Loading'`.

### Application Architecture

- Use `keyed` wrappers whenever the view branches into structurally different layouts based on route or model state. Without keying, the virtual DOM will try to diff one layout into another (e.g. a full-width landing page into a sidebar docs layout), which causes stale DOM, mismatched event handlers, and subtle rendering bugs. Key the outermost container of each layout branch with a stable string (e.g. `keyed('div')('landing', ...)` vs `keyed('div')('docs', ...)`). Within a single layout, key the content area on the route tag (e.g. `keyed('div')(model.route._tag, ...)`) so page transitions replace rather than patch.
- Extract messages to a dedicated `message.ts` file when commands need message constructors — this breaks the circular dependency between command.ts and main.ts. Export all schemas individually and as the `Message` union type.
- Use the `ViteEnvConfig` Effect.Service pattern for environment variables in RPC layers (see `examples/typing-game/client/src/config.ts`). For values needed synchronously in views (e.g. photo URLs), keep a simple module-level `const` alongside the service.
- Extract repeated inline style values (colors, shadows) to constants. Use Tailwind `@theme` for colors that map to utility classes (e.g. `--color-valentine: #ff2d55` → `text-valentine`). Use a `theme.ts` for values Tailwind can't express as utilities (textShadow, boxShadow).

### Commits and Releases

- Use Conventional Commits. Add `!` after the scope for breaking changes (e.g. `refactor(schema)!:` when renaming or removing a public export)
- Do not co-author or mention Claude in commit messages
- Do not mention Claude in release notes
- When merging PRs via `gh pr merge`, always use `--squash` — never create merge commits on main

## Editing Rules

- When making multi-file edits or refactors, apply changes to ALL relevant files — not just a subset. After refactoring, verify that spacing, margins, and visual formatting haven't regressed from the original.

## Communication

- When I ask a question or make a comment that sounds rhetorical, opinion-based, or conversational (e.g., 'what do you think about X?', 'im asking you'), respond with discussion — not code edits. Only make code changes when explicitly asked to.
- When I leave CLAUDE-prefixed comments in code, those are instructions for you. Search for them explicitly and address them. Do not remove or skip them.
