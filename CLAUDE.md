# Claude Development Notes

Preferences and conventions for Claude when working on this codebase. This file is the always-on summary. Depth lives in three places:

- The `foldkit` Claude Code skill (vendored source, conventions, examples).
- Website docs at `packages/website/src/page/` (Mount, Command, Subscription, Submodels, OutMessage, best practices).
- The exemplar files below.

Read those when a rule needs context.

## Project Conventions

- "Foldkit" is always capitalized in prose. The only exception is the npm package name (`foldkit`) and import paths.
- In prose, capitalize architecture types: Model, Message, Command, Subscription, Mount, ManagedResource, CustomElement, Submodel, OutMessage. Keep lowercase for plain functions: view, update, init.
- Always use Schema types (not plain TypeScript types), full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Foldkit is tightly coupled to Effect-TS. Do not suggest solutions outside the Effect ecosystem. Check existing features in `create-foldkit-app` before suggesting new ones.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, Messages as facts, Model as single source of truth, side effects confined to Commands. Flag the issue and propose the idiomatic Foldkit approach.

## Exemplar Files

Read these before writing code. They calibrate the quality bar.

- Library internals (`packages/foldkit/src/`): `runtime/runtime.ts`, `route/parser.ts`.
- Application architecture (`packages/website/`, examples, apps built with Foldkit): `packages/typing-game/client/src/` for Submodels, OutMessage, update/Message patterns, view decomposition.

The principles below apply broadly. Calibrate to the right context: library design when inside `packages/foldkit/src/`, application architecture elsewhere.

## Naming

- Messages are verb-first, past-tense facts: `SubmittedUsernameForm`, `CreatedRoom`, `PressedKey`. Verb prefixes: `Clicked*`, `Updated*`, `Succeeded*`/`Failed*` (when failure is meaningful), `Completed*` (fire-and-forget Command acks), `Got*` (child Submodel results only).
- Never `NoOp` messages. Use descriptive facts even for no-ops: `IgnoredMouseClick`, `SuppressedSpaceScroll`. `Completed*` mirrors the Command name verb-first: `LockScroll` produces `CompletedLockScroll`.
- Commands are verb-first imperatives: `FetchWeather`, `FocusButton`, `LockScroll`.
- Mount Definitions are verb-first imperatives like Commands: `AnchorPopover`, `PortalPopoverBackdrop`, `SyncSidebarScroll`. Result Messages follow the standard Message convention.
- Never abbreviate names anywhere, including callback parameters. Write `(tickCount) => tickCount + 1`, not `(t) => t + 1`.
- Don't suffix Command variables with `Command`. The type already says so.
- Prefix `Option`-typed values with `maybe`. Never prefix `T | undefined` values with `nullable`; name them plainly and let the type carry the optionality.
- Prefix booleans with `is`.
- Name functions by their precise effect: `enqueueMessage`, not `addMessage`. A reader should never need to check a type signature to understand what a name refers to.
- Name a value an update handler constructs before assigning it `next<Field>` (`nextSelectedDate` for `selectedDate`). Threading a destructured payload straight through (`username: () => value`) needs no intermediate.

## State Modeling

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading`. Make impossible states unrepresentable.
- Use `Option` for model fields that represent absence. Not `''` or `0` as the "none" state. Form inputs that start as `''` are actual values, not absent.
- Use `Option` at boundaries where the value will be matched or chained (`Option.match`, `Option.map`, `Option.flatMap`). Simple presence checks don't need it. Don't wrap in `Option` just to check `isSome`.
- Errors in Commands become Messages via `Effect.catch(() => Effect.succeed(ErrorMessage(...)))`. Side effects should never crash the app.
- Fold a Submodel OutMessage by matching on it: `Option.match(maybeOutMessage, { onNone: ..., onSome: M.type<X.OutMessage>().pipe(M.tagsExhaustive({ ... })) })`. Always match on the tag, even when the union has one variant, in app code, docs, snippets, and examples alike. Never destructure the OutMessage payload in `onSome` without naming the variant.

## Code Style

- Use Effect's `Match` instead of `switch`. For tagged unions prefer `M.tagsExhaustive({ ... })` over `M.tag(...)` chains.
- `pipe` is for multi-step data flow. Never `pipe` a single operation; call the function directly.
- In `pipe` chains, put the data being piped on its own line.
- Use Effect module functions over native methods in pipes (`Array.map`, `String.includes`, `String.indexOf`, etc.). Native methods are fine when calling directly on a named variable.
- Import Effect modules by their PascalCase name (`Array`, `String`, `Number`, `Function`, `Option`). Alias with a trailing `_` only when shadowing a needed native global.
- Never use sentinel values to signal absence (`-1` from `.indexOf()`, `null`, empty strings, `NaN`). Use `Option`-returning helpers like `String.indexOf`, `Array.findFirst`, `Option.fromNullishOr`.
- Never use `T[]` syntax. Use `Array<T>` or `ReadonlyArray<T>`.
- Never use bracket array indexing (`xs[0]`, `xs[xs.length - 1]`). Use `Array.get`, `Array.head`, `Array.last`, or non-empty variants.
- Use `Array.isArrayEmpty` / `Array.isArrayNonEmpty`, not `.length === 0` / `.length > 0`. Prefer `Array.match` when handling both cases.
- Never cast Schema values with `as Type`. Use callable constructors.
- Capitalize Schema literal strings: `S.Literals(['Horizontal', 'Vertical'])`.
- Capitalize namespace imports: `import * as Command from './command'`.
- Use `const`. Only use `let` when mutation is truly unavoidable. Always brace control flow.
- Extract magic numbers to named constants.
- Never use nested ternaries. Use `Match.value`, an `if`/`else` chain, or a named helper.
- Prefer explicit `if`/`else` when both branches return. Early-return reads as "A is exceptional, B is the default"; reserve it for true guards.
- Use `Readonly<{...}>` over per-property `readonly` for inline object types.
- Don't add type annotations or `as const` to callbacks whose return type is constrained by the outer API (e.g. evo callbacks, `Option.match`, `M.tagsExhaustive`). Let inference work.
- `Effect.acquireRelease` registers the release only after the acquire body completes. Construct the resource inside the acquire Effect, never before it. Anything else leaks on interruption.

## Comments

Don't add inline or block comments to explain code. If code needs explanation, refactor for clarity or use better names. Exceptions:

- Section headers: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`, `// COMMAND`. One word, no suffixes like `ACTIONS` or `HELPERS`.
- TSDoc (`/** ... */`) on all public exports.
- `// NOTE:` comments, with a high bar. Only for behavior that would mislead a careful reader (timing dependency, upstream bug workaround, browser quirk). Not for normal patterns, state machine shapes, framework idioms, or what a function does.

## View Architecture

- Key every branching view. Whenever a DOM position renders different content based on a value (route tag, top-level model variant, sub-model, any tagged union), wrap it in a single `keyed` element with a discriminating key. Same rule applies to `Match`, `if/else`, and ternaries.
- One key per branch, never shared. If two branches would share a key, restructure them into a single branch whose internal differences are keyed conditional inserts. Sharing a key across branches encodes an identity claim the branch structure contradicts, and it rots into cross-branch patching.
- Keys carry identity, never data. A key answers which branch or item occupies a position, not what it currently shows. Never derive a key from displayed data (field values, booleans, formatted strings) to force a refresh; content changes patch in place, and a data-derived key tears down live DOM state (focus, scroll, an open `details`) on every change. If a key can change while the same conceptual thing stays on screen, the key is wrong.
- Key mapped list items by a stable model identifier, never by array position.
- Key conditional inserts between stable siblings.

## File Organization

- `index.ts` is always a barrel; real code lives in a named file. For a module `foo/`, the shape is `foo/foo.ts` for the code and `foo/index.ts` for the barrel. Re-export via `export * from './foo'` and nest children as namespaces via `export * as Child from './child'`.
- Extract Messages to a dedicated `message.ts` when Commands need Message constructors. This breaks the circular dependency between `command.ts` and `main.ts`.
- Commands are colocated with the update function that returns them. Never centralize all Commands in one file.
- Expose a `boot()` helper alongside `init()` when a submodel applies a boot-time Message. `init()` returns clean state with no boot effects. `boot()` applies the boot Message via `update` and returns `[Model, Commands]`.

## Choosing Lifecycle Primitives

Five primitives: Command, Mount, Subscription, ManagedResource, CustomElement. Pick by what causes the side effect. The `foldkit` skill and the docs at `packages/website/src/page/core/` cover this in depth. Read them when ambiguous. Quick rule:

- A Message just dispatched? Command.
- An element exists in the rendered tree, and the factory uses the element to do DOM work? Mount. Use `Mount.define` for one-shot acquire-with-cleanup, `Mount.defineStream` for continuous events from listeners or observers. Both require at least one declared result Message.
- An external event source gated by a Model condition? Subscription.
- Model condition plus Commands need a stateful handle? ManagedResource.
- Rendering a native web component? CustomElement.

If a Mount factory doesn't read or write its element, you've misidentified the cause. Mount args are captured at mount, not refreshed across renders.

## Reference Repos

`repos/` holds vendored snapshots pulled in as git subtrees, pinned to the version we use. Read directly when API signatures or behavior matter; faster and more authoritative than docs or `.d.ts` files. Treat as read-only. Never import from `repos/` in package or example source.

- `repos/effect-smol/`: Effect-TS source. Reference for any Effect / Schema / Stream / Match / Result question.

## Commits and Releases

- Conventional Commits. Add `!` after the scope for breaking changes (e.g. `refactor(schema)!:`).
- Valid scopes: package directories (`foldkit`, `ui`, `devtools`, `create-foldkit-app`, `vite-plugin`, `devtools-mcp`, `oxlint-plugin`, `website`, `typing-game`, `examples-e2e`), example directory names, `skills`, `ci`, and `release`. Never internal module names.
- Before choosing or amending a commit subject, inspect the full staged diff or the full commit diff with `git diff --cached --stat` / `git diff --cached --name-status` or `git show --stat --name-status HEAD`. The subject must describe the whole change set, not just one file or the most recent edit.
- Do not invent broad scopes such as `tooling` or `infrastructure`. Use the literal valid scopes above.
- Do not co-author or mention Claude in commit messages or release notes.
- Squash-merge only. `gh pr merge --squash`.

## Editing Rules

When making multi-file edits or refactors, apply changes to ALL relevant files, not just a subset. After refactoring, verify that spacing, margins, and visual formatting haven't regressed.

## Workspace Setup Errors Are Not Pre-Existing

If `pnpm typecheck`, `pnpm lint`, `pnpm build`, or the pre-push hook surfaces errors like `Cannot find module 'foldkit'`, `Cannot find module 'foldkit/html'`, or unexpected `Property X does not exist` against an Effect API, the workspace itself is out of sync. These are not pre-existing branch failures. Run `bash scripts/cloud-session-setup.sh` to reconcile. The SessionStart hook runs this automatically, so it's only relevant if dependencies drift mid-session.

## Debugging Example Apps

Apps in `examples/` ship with `@foldkit/devtools-mcp` wired up. Reach for the `foldkit_*` MCP tools before adding logs. See `packages/devtools-mcp/README.md` for setup.

## Communication

- When I ask a question or make a comment that sounds rhetorical, opinion-based, or conversational ("what do you think about X?", "im asking you"), respond with discussion, not code edits. Only make code changes when explicitly asked.
- When I leave CLAUDE-prefixed comments in code, those are instructions for you. Search for them explicitly and address them. Do not remove or skip them.

## Prose Style

No em dashes in prose. You compulsively reach for `—` as a substitute for a period, comma, colon, parentheses, or semicolon, and the user has been removing them by hand for a long time. Default to a period and a fresh sentence. Comma, semicolon, parentheses, or colon also work. Applies to comments, TSDoc, docs, snippets, website copy, conversation, commit messages, and changesets. Document and page titles use a spaced pipe (`|`) as the breadcrumb separator (`"Calendar | API | Foldkit"`), never a dash. The only fine structural use of `—` is as a table cell separator. Only fix em dashes when removing them makes the writing clearer.

Never describe our own writing as honest ("an honest note", "an honest ledger", "honestly"). We are honest by default; labeling it reads as a tell and implies the rest is less honest. Delete the label and say the thing plainly. Applies everywhere: docs, page metadata, commit messages, conversation.
