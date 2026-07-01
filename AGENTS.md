# Agent Development Notes

Preferences and conventions for Codex and other coding agents working on this repository. This file is the always-on summary. Read source, examples, and package docs when a rule needs context.

Repo-local `skills/foldkit`, `skills/generate-program`, and `skills/audit-program` target consumer Foldkit apps. Do not treat them as always-on repo-maintenance guidance unless the user explicitly invokes them.

## Project Conventions

- "Foldkit" is always capitalized in prose. The only exception is the npm package name (`foldkit`) and import paths.
- In prose, capitalize architecture types: Model, Message, Command, Subscription, Mount, ManagedResource, CustomElement, Submodel, OutMessage. Keep lowercase for plain functions: view, update, init.
- Always use Schema types, full names like `Message`, and `withReturnType`. Do not use plain TypeScript types, `Msg`, `as const`, or type casting as substitutes.
- Foldkit is tightly coupled to Effect-TS. Do not suggest solutions outside the Effect ecosystem. Check existing features in `create-foldkit-app` before suggesting new ones.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, Messages as facts, Model as single source of truth, and side effects confined to Commands. Flag the issue and propose the idiomatic Foldkit approach.

## Exemplar Files

Read these before writing code. They calibrate the quality bar.

- Library internals: `packages/foldkit/src/runtime/runtime.ts`, `packages/foldkit/src/route/parser.ts`.
- Application architecture: `packages/typing-game/client/src/`, `packages/website/`, and examples built with Foldkit.

Calibrate to the right context: library design when inside `packages/foldkit/src/`, application architecture elsewhere.

## Naming

- Messages are verb-first, past-tense facts: `SubmittedUsernameForm`, `CreatedRoom`, `PressedKey`. Verb prefixes: `Clicked*`, `Updated*`, `Succeeded*` / `Failed*`, `Completed*`, and `Got*` for child Submodel results only.
- Never use `NoOp` Messages. Use descriptive facts even for no-ops: `IgnoredMouseClick`, `SuppressedSpaceScroll`. `Completed*` mirrors the Command name verb-first: `LockScroll` produces `CompletedLockScroll`.
- Commands are verb-first imperatives: `FetchWeather`, `FocusButton`, `LockScroll`.
- Mount Definitions are verb-first imperatives like Commands: `AnchorPopover`, `PortalPopoverBackdrop`, `SyncSidebarScroll`.
- Never abbreviate names anywhere, including callback parameters. Write `(tickCount) => tickCount + 1`, not `(t) => t + 1`.
- When computing the next value for a Model field, name the local const `next<FieldName>`. For example, use `nextRoute` for `route`, `nextPeoplePage` for `peoplePage`, and `nextTabs` for `tabs`.
- Do not suffix Command variables with `Command`. The type already says so.
- Prefix `Option`-typed values with `maybe`. Never prefix `T | undefined` values with `nullable`; name them plainly and let the type carry the optionality.
- Prefix booleans with `is`.
- Name functions by their precise effect: `enqueueMessage`, not `addMessage`.

## State Modeling

- Encode state in discriminated unions, not booleans or nullable fields. Use `Idle | Loading | Error | Ok`, not `isLoading`.
- Use `Option` for model fields that represent absence. Do not use `''`, `0`, or `null` as the none state.
- Use `Option` at boundaries where the value will be matched or chained. Simple presence checks do not need it.
- Errors in Commands become Messages via `Effect.catch(() => Effect.succeed(ErrorMessage(...)))`. Side effects should never crash the app.

## Code Style

- Use Effect's `Match` instead of `switch`. For tagged unions prefer `M.tagsExhaustive({ ... })` over `M.tag(...)` chains.
- `pipe` is for multi-step data flow. Never `pipe` a single operation; call the function directly.
- In `pipe` chains, put the data being piped on its own line.
- Use Effect module functions over native methods in pipes. Native methods are fine when calling directly on a named variable.
- Import Effect modules by their PascalCase name. Alias with a trailing underscore only when shadowing a needed native global.
- Never use sentinel values to signal absence. Use `Option`-returning helpers such as `String.indexOf`, `Array.findFirst`, and `Option.fromNullishOr`.
- When adding or editing `Option` handling, do not use `Option.match` with `onNone: Function.constVoid`; use `Option.isSome` with an explicit `if`.
- Never use `T[]` syntax. Use `Array<T>` or `ReadonlyArray<T>`.
- Never use bracket array indexing. Use `Array.get`, `Array.head`, `Array.last`, or non-empty variants.
- Use `Array.isEmptyArray` / `Array.isNonEmptyArray`, not `.length === 0` / `.length > 0`. Prefer `Array.match` when handling both cases.
- Never cast Schema values with `as Type`. Use callable constructors.
- Capitalize Schema literal strings: `S.Literals(['Horizontal', 'Vertical'])`.
- Capitalize namespace imports: `import * as Command from './command'`.
- Use `const`. Only use `let` when mutation is truly unavoidable. Always brace control flow.
- Extract magic numbers to named constants.
- Never use nested ternaries. Use `Match.value`, an `if` / `else` chain, or a named helper.
- Prefer explicit `if` / `else` when both branches return. Early return reads as "A is exceptional, B is the default"; reserve it for true guards.
- Use `Readonly<{ ... }>` over per-property `readonly` for inline object types.
- Do not add type annotations or `as const` to callbacks whose return type is constrained by the outer API.
- When using `evo`, pass field transformers point-free when the update depends only on that field's current value. Prefer `entries: Array.map(f)`, `currentStep: toNextStep`, and `stepTabs: Tabs.reflectSelectedTab(value, options)` over closures that re-read the same field from the surrounding Model. Use `() => value` when replacing a field with a Message payload, child update result, Command result, or a value derived from another field.
- `Effect.acquireRelease` registers the release only after the acquire body completes. Construct the resource inside the acquire Effect, never before it.

## Comments

Do not add inline or block comments to explain code. If code needs explanation, refactor for clarity or use better names. Exceptions:

- Section headers: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// VIEW`, `// COMMAND`. One word only.
- TSDoc on all public exports.
- `// NOTE:` comments, with a high bar. Use them only for behavior that would mislead a careful reader.

## View Architecture

- Key every branching view. Whenever a DOM position renders different content based on a value, wrap it in a single `keyed` element with a discriminating key.
- Key mapped list items by a stable model identifier, never by array position.
- Key conditional inserts between stable siblings.

## File Organization

- `index.ts` is always a barrel. Real code lives in a named file.
- For a module `foo/`, use `foo/foo.ts` for the code and `foo/index.ts` for the barrel.
- Re-export via `export * from './foo'` and nest children as namespaces via `export * as Child from './child'`.
- Extract Messages to a dedicated `message.ts` when Commands need Message constructors.
- Commands are colocated with the update function that returns them. Never centralize all Commands in one file.
- Expose a `boot()` helper alongside `init()` when a submodel applies a boot-time Message.

## Lifecycle Primitives

Five primitives exist: Command, Mount, Subscription, ManagedResource, CustomElement. Pick by what causes the side effect.

- A Message just dispatched? Command.
- An element exists in the rendered tree, and the factory uses the element to do DOM work? Mount.
- An external event source gated by a Model condition? Subscription.
- Model condition plus Commands need a stateful handle? ManagedResource.
- Rendering a native web component? CustomElement.

If a Mount factory does not read or write its element, re-check the primitive choice. Mount args are captured at mount, not refreshed across renders.

## Reference Repos

`repos/` holds vendored snapshots pulled in as git subtrees, pinned to the version we use. Read directly when API signatures or behavior matter. Treat these as read-only. Never import from `repos/` in package or example source.

- `repos/effect-smol/`: Effect-TS source. Reference for Effect, Schema, Stream, Match, and Result questions.

## Commits

- Use Conventional Commits. Add `!` after the scope for breaking changes, for example `refactor(schema)!:`.
- Valid scopes: package directories (`foldkit`, `ui`, `devtools`, `create-foldkit-app`, `vite-plugin`, `devtools-mcp`, `oxlint-plugin`, `website`, `typing-game`, `examples-e2e`), example directory names, `skills`, `ci`, and `release`. Never internal module names.
- The `skills` scope means the Foldkit app/plugin skills (`skills/foldkit`, `skills/generate-program`, `skills/audit-program`) and their shipped packaging. Do not use `skills` for repo-maintenance helper skills such as `.agents/skills/commit-changes`; omit the scope if no valid scope fits the whole change.
- Before choosing or amending a commit subject or body, inspect the full
  staged diff or full commit diff with `git diff --cached --stat`,
  `git diff --cached --name-status`, or
  `git show --stat --name-status HEAD`. The message must describe the
  whole change set, not just one file or the most recent edit.
- After any amend that changes files, re-audit the commit body against
  `git show --stat --name-status HEAD` and update it in the same amend
  when the final diff has drifted. Do this even for small follow-ups.
- Do not invent broad scopes such as `tooling` or `infrastructure`. Use the literal valid scopes above.
- Do not co-author or mention AI assistants in commit messages or release notes.
- Use `.agents/skills/commit-changes` when the user asks to create a commit in this repo.
- Squash-merge only. Use `gh pr merge --squash` when merging PRs.

## Editing Rules

When making multi-file edits or refactors, apply changes to all relevant files, not just a subset. After refactoring, verify that spacing, margins, and visual formatting have not regressed.

## Workspace Setup

If `pnpm typecheck`, `pnpm lint`, `pnpm build`, or the pre-push hook surfaces errors like `Cannot find module 'foldkit'`, `Cannot find module 'foldkit/html'`, or unexpected Effect API properties, the workspace itself may be out of sync. Run `bash scripts/cloud-session-setup.sh` to reconcile dependencies.

## Debugging Example Apps

Apps in `examples/` ship with `@foldkit/devtools-mcp` wired up. If the Foldkit devtools MCP tools are available, reach for them before adding logs. See `packages/devtools-mcp/README.md` for setup.

## Communication

- When the user asks a rhetorical, opinion-based, or conversational question, respond with discussion rather than code edits. Only make code changes when explicitly asked.
- When code contains `CLAUDE`-prefixed comments, those are existing agent instructions. Search for them explicitly and address them. Do not remove or skip them.

## Prose Style

- Do not use em dashes in prose. Default to a period and a fresh sentence. Commas, semicolons, colons, or parentheses also work.
- Document and page titles use a spaced pipe (`|`) as the breadcrumb separator, never a dash.
- Never describe our own writing as honest. We are honest by default; labeling it reads as a tell.
