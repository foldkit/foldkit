---
name: audit-program
description: Audit an existing Foldkit program against the architecture, conventions, and quality bar. Use when the user wants to review their Foldkit code, check for anti-patterns, accessibility gaps, or quality regressions. Triggers on phrases like "audit my app", "review this Foldkit code", "check for anti-patterns", "is this idiomatic?", or "what would the reviewer find?"
argument-hint: '[optional: path or focus area like a11y/effects/naming/decomposition/forms/routing/subscriptions/blocks/types/testing]'
---

Audit an existing Foldkit program against the same bar `generate-program` targets: this code should be **indistinguishable in quality from hand-written code in the Foldkit examples and production apps**. Not "works." Not "structurally valid." Exemplar quality.

> **Recommended setup:** the audit is dramatically higher fidelity when `repos/foldkit/` is vendored as a git subtree in the audited project. Without it, you grade against the snapshots in `generate-program/architecture.md` and `conventions.md`. With it, you grade against the live exemplars (`examples/`, `packages/typing-game/`, `packages/website/`) and the framework source (`packages/foldkit/src/blocks/`), which is what those snapshots summarize. If the subtree is missing, recommend adding it before the audit begins, pinned to the release git tag matching the installed `foldkit` package so the exemplars match the APIs the project compiles against: `git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash`. For a canary install, whose version (`x.y.z-canary.<commit>`) has no tag, pin to the full hash of the commit it names instead, which GitHub expands at `https://github.com/foldkit/foldkit/commit/<commit>`.

## Operating principle: report first, change nothing without consent

The audit is **read-only through Phase 6**. The output is a structured report. **Never edit a file before the user has seen the report and explicitly approved fixes**, no matter how unambiguous a finding seems, no matter how trivial the change, no matter how confident you are. Phase 7 (Offer fixes) is opt-in and gated on user consent per item or per batch.

Concretely, this means:

- Phases 1 to 6 are pure investigation: read code, run greps, spawn review subagents, synthesize findings. No `Edit`, no `Write`, no `Bash` commands that modify files.
- After delivering the report at the end of Phase 6, **stop and wait**. Ask whether to apply fixes. Don't bundle a fix into the same response as the report.
- Even after the user invites fixes, structural and semantic changes still need confirmation per item. Mechanical fixes can batch only if the user explicitly accepts the batch.
- If the user says "fix it" or "make the changes" early (before seeing findings), surface the report first anyway. The report is the value the audit provides; jumping to edits skips the consultation that lets the user prioritize and reject items.

The audit's job is to surface findings the user can act on, not to act on them silently.

Resolve `$ARGUMENTS`:

- Empty → audit `src/` end-to-end against every dimension
- A path (file or directory) → narrow to that path, every dimension
- A focus area (`a11y`, `effects`, `naming`, `decomposition`, `forms`, `routing`, `subscriptions`, `blocks`, `types`, `testing`) → audit `src/` along that dimension only
- A path AND a focus → narrow on both axes

If the argument is ambiguous (could be a path OR a focus), ask which. Don't guess.

## The Block shape you are grading against

A Block is a class. The class declares the contract, and `make` returns its Layer:

- `class Search extends Block<Search, Args, ViewInput, Exposed>()('Search', { Model, Message, OutMessage?, Command?: [...], Mount?: [...] }) {}`. The string id matches the class name. Messages, OutMessages, Commands (`Command.define`), and Mounts (`Mount.define` / `Mount.defineStream`) are declared at module level before the class.
- `export const SearchLive = Search.make(Effect.fn(function* (id, args) { ... return { model, start?, update, commands?, mounts?, stream?, subscriptions?, expose?, view } }))`. The constructor runs once per instance, synchronously, when the instance enters its parent's Model. It yields Services and the handlers close over them.
- `update` has one handler per Message tag, returning `{ model, commands?, outMessage?, messages? }`.
- Children are declared in the parent constructor with `yield* new Child(id, args)` or `yield* Child.each(collection, args)`, held in the parent Model (the child class is the field's Schema), rendered with `model.child.view(input?)`, changed only by returning `messages: [model.child.send(Child.Message.RequestedX())]`, and heard through `...child.on({ Tag: (model, outMessage, instance) => result })`.
- `entry.ts` calls `Program.make(Application, { layer, container, routing?, Flags?, devTools? })`, where `layer` is `ApplicationLive` with every child Block Layer and the root `ApplicationLayer` of ordinary Services provided. Then `Runtime.run(program)`.
- Tests use `@effect/vitest`: `it.effect('...', () => story(XLive.pipe(Layer.provide(ChildLive)), args?, ...steps))`, and the same shape for `scene`.

When the vendored source disagrees with this summary, the source wins. Read `repos/foldkit/packages/foldkit/src/blocks/block.ts` and its tests rather than grading against a remembered signature.

## Phase 1: Scope the audit

Sketch the audit plan in one sentence and confirm before reading code:

> "I'll audit `src/page/room/` for naming, decomposition, and Effect-TS idiom consistency, comparing against typing-game's room page. Sound right?"

Skip this confirmation only when the scope is unambiguous (single file, single focus). For everything else, the sketch is cheap and the user can redirect before you spend cycles on the wrong target.

## Phase 2: Read the canonical references

Read the references that match the audited surface:

1. The project's `FOLDKIT.md`, when present: the consumer conventions for the installed Foldkit version. With the subtree vendored, compare it to `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md`; a stale copy is itself a QUALITY finding.
2. [Architecture guide](../generate-program/architecture.md): the TEA loop and primitives present in the app
3. [Conventions guide](../generate-program/conventions.md): the naming, Schema, Effect, and update sections relevant to the audited files
4. [Verification checklist](../generate-program/checklist.md): mechanical checks and the quality bar
5. [Blind spots](../generate-program/blindSpots.md): failures that survive typecheck, lint, and tests
6. [Block composition](../foldkit/references/composition.md): children, OutMessages, view input, exposed values, Layers, and composed-graph tests, when the app has more than one Block

Read the relevant references before grading. Do not load an unrelated guide merely because it exists.

These references are snapshots. When the audited project vendors `repos/foldkit/`, the live source wins over anything here.

Do not skim. The audit's signal-to-noise depends on the auditor having internalized the bar before reading the audited code.

## Phase 3: Map the project

Before deep review, build a model of the audited code:

1. **File tree**. Every file in scope, with a one-line description (`page/people/people.ts: People class and PeopleLive; handles ChangedSearchInput, SubmittedSearch, ...`).
2. **Tier**. Match against the generate-program tier ladder:
   - **Tier 1**: single page, no async, single file
   - **Tier 2**: timers, Subscriptions, simple stateful
   - **Tier 3**: async, loading/error, forms
   - **Tier 4**: routing, multiple pages
   - **Tier 5**: nested domain, CRUD
   - **Tier 6**: child Blocks, OutMessage, multi-step flows
   - **Tier 7**: real-time, WebSocket, stateful handles exposed by child Blocks
3. **Block graph**. Every Block class, its Live Layer, the children each constructor declares (`new Child(...)` and `Child.each(...)`), where each instance lives in the parent Model, and which `.on` handlers the parent registers. Then trace `entry.ts`: which Layers `Program.make` receives and in what order they are provided.
4. **Foldkit modules used**. Grep imports for `AsyncData`, `Calendar`, `File`, `Http`, `Update`, `Port`, `Subscription`, `Command`, `Mount`, `CustomElement`, `Dom` from `foldkit`, plus `foldkit/fieldValidation` and any component imported from `@foldkit/ui`. HTTP usage shows up as `HttpClient` / `HttpClientRequest` imported from `effect/http`, not as a `foldkit` import, so grep for those separately. Tells you which checklist sections apply.
5. **Tier-matching exemplar**. Pick at least one to read alongside the audited code:
   - Tier 1-2 → `${CLAUDE_SKILL_DIR}/../../examples/counter/src/`, `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/`
   - Tier 3 → `${CLAUDE_SKILL_DIR}/../../examples/weather/src/`, `${CLAUDE_SKILL_DIR}/../../examples/form/src/`
   - Tier 4 → `${CLAUDE_SKILL_DIR}/../../examples/routing/src/` (`application.ts`, `entry.ts`, `page/people/people.ts`, `story.test.ts`)
   - Tier 5 → `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/`
   - Tier 6 → `${CLAUDE_SKILL_DIR}/../../examples/auth/src/`, `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/`
   - Tier 7 → `${CLAUDE_SKILL_DIR}/../../examples/websocket-chat/src/` (`chatSocket.ts` exposes the socket), `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/page/room/`
6. **Foldkit UI integration**. If anything is imported from `@foldkit/ui`, also read `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/`. Each stateful component is declared in its parent's constructor (`yield* new Dialog.Dialog('dialog', { id })`, or `const ResultListbox = Listbox.makeBlock<Result>()` at module scope for a generic factory), stored in the parent Model, rendered with `model.dialog.view({ toView, ... })`, driven by `send`, and heard through `.on`. Its Layer (`Dialog.DialogLive`, `ResultListbox.Live`) is provided to every parent Layer that creates it.

The exemplar is the comparison target. When you find a pattern that smells off, ask: **does the exemplar do this differently?** If yes, flag it.

## Phase 4: Run the linter, then the mechanical scans

### The linter first

`@foldkit/oxlint-plugin` ships AST rules covering much of what this audit grades. For example: keyed mapped rows, no array-index keys, hard-coded route strings, empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`, PascalCase Command definitions, Mount handlers that ignore their element, module-level mutable state, and `NoOp` Messages. They parse the code, so they catch what a grep misses.

Establish whether the rules are actually **active**, which is not the same as finding the package name. **The config is the authority here, not the lint output.** Locate the config before reading anything out of it. A lint script may name one with `--config`, and in a workspace the config usually sits above the app rather than beside it:

```bash
grep -n '"lint"' package.json
find . .. ../.. -maxdepth 1 -name '.oxlintrc.json' 2>/dev/null
```

**Finding no config is a different outcome from finding one without Foldkit in it, and the two look identical if you only read stdout.** A grep against a missing file and a grep against a config that doesn't mention Foldkit both print nothing. Branch on whether the `find` located a file at all:

- **No config located**: the outcome is Undetermined, never Not active. The project may well be linted from a parent workspace this audit didn't reach.
- **Config located**: grep it for `foldkit`. A hit under `extends` pointing at the plugin's `recommended.json`, which is what the scaffold writes, or a `jsPlugins` entry naming the plugin by path specifier, which is how a monorepo or vendored setup wires it, means the rules are Active. No hit, but the config has an `extends` entry pointing somewhere else, means follow that file and repeat: a shared internal config can wire the plugin one level up. No hit and nothing left to follow is Not active.

Lint output can confirm activation but can never rule it out. Diagnostics are labelled `foldkit(rule-name)`, so seeing `foldkit(` proves the rules ran, and grepping for `foldkit/` finds nothing even when every rule is running. Zero `foldkit(` matches proves nothing at all: that is what a passing project looks like. Never infer "not active" from a quiet lint run.

- **Active**: run the project's lint script. Every `foldkit(...)` diagnostic is a finding, reported like any other, and it outranks a grep hit on the same subject because the rule actually parsed the code. Do not re-derive those findings by hand.
- **Not active**: report it as the first **QUALITY** item, worded as tooling. Don't file it as a BLOCKER: that bucket is defined for code that is structurally wrong and its item format requires a `file:line`, which a missing devDependency doesn't have. It is still usually the highest-leverage fix in the audit, so lead the QUALITY list with it: one devDependency and one `extends` line buy continuous enforcement of two dozen invariants, where this audit is a snapshot. Then fall back to the greps, and say in the report that they are a weaker substitute, since they miss wrapped calls and renamed helpers. A clean grep run on an unlinted project is weak evidence, not a pass.
- **Undetermined**: run the lint script anyway and treat any `foldkit(...)` diagnostic as the Active case, since one diagnostic settles the question. With no diagnostics, fall back to the greps as above, but say the wiring was undetermined rather than missing, and name the paths you searched. Do not recommend installing a plugin that may already be enforcing these rules.

A project scaffolded by `create-foldkit-app` has the plugin installed and wired by default, so an audited project lacking it usually predates the scaffold or dropped the config. If the config enables a rule the installed plugin no longer ships, report that as tooling drift rather than a code finding.

### Stale API scan

Run this before the checklist scans. Foldkit replaced its earlier Block authoring API with class Blocks, and leftover usage means the project is pinned to an old release or half-migrated:

```bash
grep -rnE 'makeDefinition|makeComposition|prepareBlock|Block\.assemble|FromAssembly|makeNamespace|makeBinding|makeMapBinding|makeVariantBinding|withOutMessagePolicy|makeOutMessageFold|makeOutMessageForward|make(Fields|Commands|OutMessage|Noop)?Step\b|makeInit\b|makeUpdate\b|makeView\b|ViewBuilderFor|EffectsLayer|makeSubscriptions|makeManagedResources|makeResource\b|embedView|h\.block\(|toParentMessage|bindingInit|ChildInitContext|replaceEffectsLayer|provideHandlers|program\.provide\(' src
```

Then check the installed `foldkit` version against the vendored subtree (or the release notes) to decide which case applies:

- **Installed Foldkit has class Blocks**: every hit is a BLOCKER, because the identifiers no longer exist and the code cannot compile against the installed package. Group them under one **Stale API** heading inside BLOCKERS, one line per file, and point the user to the migration: `class X extends Block<...>()('X', {...})` plus `XLive = X.make(...)` in place of Definition, Composition, and assembly; `yield* new Child(...)` / `Child.each(...)` in place of Bindings; `.on` in place of OutMessage folds and forwards; `send` in place of operations; `model.child.view()` in place of embedded views; module-level `Command.define` with handlers under `commands` in place of handler recipes and `EffectsLayer`; `stream` / `subscriptions` in place of subscription registries; a child Block with `expose` in place of ManagedResources; `Program.make(Application, { layer })` in place of `program.provide`. With the subtree vendored, cite the matching exemplar file for each.
- **Installed Foldkit predates class Blocks**: the code matches its package, and this audit's Block guidance does not apply to it. Say so at the top of the report, recommend upgrading Foldkit and migrating, and limit the rest of the audit to the conventions that do not depend on the Block API (naming, state modeling, Effect idiom, view, accessibility).

Do not grade old-API code against old-API conventions. This skill teaches only the class-Block shape.

### Then the scans

Run the canonical greps from the **Mechanical scans** block in [`../generate-program/checklist.md`](../generate-program/checklist.md). That checklist is the source of truth. It covers ground no rule touches (API drift, `@foldkit/ui` adoption, Effect idiom, a11y detail, test shape) plus the deliberate edges of rules that are narrow by design; each such grep names the rule it complements and where that rule stops. Don't duplicate the commands here, and don't delete a scan just because a rule shares its subject: check whether the rule actually covers the case. Note too that `recommended.json` disables every rule for `**/*.test.ts` and `**/*.test.tsx`, so the linter contributes nothing to the test-shape checks in Subagent E. Each hit is either a finding or a `// NOTE:` justification. Silent hits aren't allowed.

For every hit, decide:

- Is there a `// NOTE:` above it justifying the deviation?
- If yes, evaluate the justification. Is it real, or defensive rationalization? Common false-justifications: "would require duplicate state" (most `@foldkit/ui` components take a few constructor args and own their state), "the interaction is too custom" (the `toView` view input handles arbitrary HTML), or "the child is too hard to wire" (a child is one `yield* new Child(...)`, one Model field, and one provided Layer).
- If no NOTE, it's a finding.

Mechanical scans catch the cheap stuff. They're the floor of the audit, not the ceiling.

## Phase 5: Structural review

Walk every category in [`../generate-program/checklist.md`](../generate-program/checklist.md) against the code. Every category, every item, against the actual files.

### Parallelize via subagents (Tier 4+)

For non-trivial audits, parallelize. Spawn subagents in a single message so they run concurrently. Each owns one dimension and reads the canonical reference plus the relevant audited files in parallel.

Use `Agent` with `subagent_type: general-purpose`. Suggested fan-out:

- **Subagent A (Structural correctness and Blocks)**. Model Schema completeness, Message union coverage, one `update` handler per Message tag, every `Succeeded*` paired with `Failed*`, every route variant rendered, no dead state variants. Then the Block checks:
  - Every Command and Mount listed on the class has a handler under `commands` / `mounts`. A listed definition without a handler fails at runtime, not at typecheck, so trace each list by hand.
  - Commands are module-level PascalCase `Command.define` constants, belong to the Block whose update returns them, and convert expected failures to result Messages with `Effect.catch`.
  - Constructors do no asynchronous work. Fetches, sleeps, or awaited Effects in the constructor body belong in a Command listed in `start`. Yielding Services and synchronous setup is fine.
  - Handlers do not capture per-dispatch values in the constructor: current time, Command args, Subscription dependencies, or a DOM element read once at construction and reused. Constructor-scoped values are Services and stable configuration only.
  - The parent changes a child only through `messages: [model.child.send(Child.Message.X())]`. Writing `model.child.model` fields, rebuilding a child Model in the parent, or constructing the child's state by hand is a BLOCKER.
  - The parent reads child facts through `.on` handlers spread into its `update` record, and forwards upward by returning `outMessage` from an `.on` handler. Handlers name each OutMessage variant.
  - Child Model fields use the child class itself as the Schema (`search: Search`, `Schema.Option(Dialog)`, `Schema.Array(Column)`), not `Child.Model`.
  - Instances live in Struct fields, `Option`, arrays, Records, or tagged union variants. An instance inside a `HashMap`, `HashSet`, or class instance is a BLOCKER.
  - Instance ids are unique within the parent and stable. `Child.each(...)` keys come from a stable domain identifier, never array position, a counter reset on render, or displayed text. Keys reused after removal construct a fresh instance, so check that removal is intentional.
  - Removing an instance from the Model ends its lifecycle (Streams, Subscriptions, finalizers, pending results). Check that route changes or conditional rendering do not drop an instance whose draft or pending save must survive.
  - Every child Block's Live Layer reaches every parent Layer that creates it, in `entry.ts` and in every test. A child that itself creates Blocks either provides their Layers inside its own Layer or receives one merged Layer.
  - `entry.ts` calls `Program.make(Application, { layer, ... })` (or `Program.makeElement`) and `Runtime.run`. The root's args match the Program options: `{ url }` with `routing`, `{ flags }` with `Flags`.
  - `stream` is for sources that run the whole life of the instance; Model-gated sources use `subscriptions` with `dependencies`, returning `Stream.empty` when off. A stateful handle that Commands need lives in a child Block that acquires it with `Effect.acquireRelease` and shares it through `expose`, read by parent Commands with `instance.use` (which fails with `NotConnected` while the child is absent).
  - View input functions passed to `model.child.view(...)` are stable (module-level or memoized) when the child caches on them, and attributes the child hands back use `childAttributes(...)`.
  - Native web components are bound via `CustomElement.define`, not via `OnMount` plus a Subscription plus a tag-name registry.
- **Subagent B (Effect-TS idioms)**. Check that `pipe` keeps a transformed value as the subject of clear left-to-right data flow rather than merely rearranging an ordinary call. Prefer `Option.match` over `Option.map(...).pipe(Option.getOrElse(...))`, `Array.match` for empty/non-empty branching, `modifyFields` over spread, point-free `modifyFields` setters when they only transform the current field, callable constructors over `as Type`, `Array.fromOption` for "zero or one Command", `Equal.equals` in predicates, and no `Effect.ignore` on infallible Effects. Check `AsyncData` over a hand-rolled remote-data union.

  Trace mutable handler and Service state to execution bookkeeping, such as worker availability or protocol request IDs. Flag pending work shown to the user, selections, or submission rules hidden in a handler or Service: those belong in the Model and update. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

  Update handlers return results directly. Extracted single-Message handlers are named `handle<MessageTag>`; reusable Model-first transitions end in `Step` and sequence with `Update.combineSteps`. Handlers omit `commands` and `messages` when they statically create none and return computed collections without checking whether they are empty; they never write a literal `commands: []`. Keep each update-like result bound to an operation-named value and consume it with dot access; do not destructure or rename `model`, `commands`, or `outMessage`. Commands read time, randomness, and UUIDs inside the handler Effect, never in update. See `repeated-scaffolding` and `manual-update-return-unpacking` in blindSpots.md.

- **Subagent C (Naming and decomposition)**. Block classes are named for the feature with a `Live` Layer (`Search` / `SearchLive`), and the string id matches the class name. One file, one Block: each Block lives in a file named for it in camelCase (`issueBoard.ts`), with no `index.ts` barrel, and no Block is split across `message.ts`, `model.ts`, `update.ts`, `command.ts`, or `view.ts`. A Block too large to read is a finding whose fix is extracting a child Block, not slicing the file. `maybe*` reserved for `Option<T>`, `is*` for booleans, no opaque abbreviations or unexplained single-letter names, conventional domain shorthand allowed, `Updated*` not `Changed*`, `Completed*` mirrors the Command name verb-first, parent-sent Messages are `Requested*` or `InformedOf*`, named helpers use specific verbs not generic ones, handlers over ~15 lines extracted, view branches over ~30 lines extracted, no function exceeds ~40 lines. A render-only helper turned into a Block for symmetry is a finding. Comments are sparse and mark a surprising constraint; they do not narrate ordinary control flow.
- **Subagent D (Foldkit UI and accessibility)**. Hand-rolled `input` / `textarea` / `button` / `dialog` flagged unless NOTE-justified, label/input pairing via `For(id)` + `Id(id)`, dynamic errors announce via `Role('alert')` or `AriaLive('polite')`, icon-only buttons have `AriaLabel`, external links carry `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks (`main`, `nav`, `header`, `footer`) over `div` soup, focus visibility preserved (no `outline-none` without `focus-visible:` replacement).
- **Subagent E (Testing, Tier 3+)**. Tests import `describe`, `expect`, and `it` from `@effect/vitest` and wrap each case in `it.effect(...)`; `@effect/vitest` is in devDependencies. `story` and `scene` receive a Block's Layer (`story(PeopleLive, args, ...)`), with child Layers attached through `Layer.provide`, not `Layer.merge`, and constructor Services supplied with `.pipe(Effect.provide(TestLayer))`. A test that hands `story` or `scene` an update function or a view is stale API. `story.test.ts` exists, every fallible Command is tested for both `Succeeded*` and `Failed*` paths, at least one multi-step interaction test exists, child Block tests assert `outMessage`, and the TypeScript project includes test files. Commands resolve via `Command.resolve(Definition, resultMessage)` rather than running Effects directly. Child Messages, including Stream and Subscription emissions, are delivered with `message(Block.deliver(Child, path, Child.Message.X()))`. `given` sets state but does not add or remove instances; tests that need a new instance send the Message that creates it. **`scene.test.ts` is REQUIRED at Tier 3+** and is a BLOCKER if absent. Each `scene` block must contain at least one `expect(...)` or interactive resolution. Locators must be accessible (`role`, `label`, `text`) over `placeholder` or CSS selectors. A Block that takes a view input is tested through a small test-only parent Block. Handler execution tests provide controlled Services to the production Layer rather than replacing the handler.

Each subagent prompt is self-contained: the canonical references to read, the file list to audit, the Block shape summary above, the dimension to grade, and the report format from Phase 6. Each returns its findings as a slice of the eventual report.

For Tier 1-2 or focused audits, do the review inline. The surface is small enough that subagent fan-out adds more overhead than it saves.

### Walk these blind spots

Walk every entry in [`../generate-program/blindSpots.md`](../generate-program/blindSpots.md). That file is the canonical list, shared with `generate-program`'s review loop, so the two skills grade against one bar. For each entry, output one line in your notes: `<slug>: clean | flagged at <file:line>: <issue>`. Silence is not a pass.

### Final exemplar comparison

Pick one audited file at random and read it next to the equivalent file in the tier-matching exemplar. Ask:

- Does the audited file look like it was written by the same hand?
- Does the decomposition feel inevitable, or arbitrary?
- If you removed any line, would a reviewer miss it?

If the answer to any of those is "no" or "I'd notice", flag the file in the report.

## Phase 6: Synthesize findings

Output the report in EXACTLY this structure. No editorializing, no padding. Every line is a finding the user can act on.

```
## BLOCKERS
Items that are structurally wrong, logically buggy, or violate
Foldkit invariants. Must fix. Stale API usage goes here under its
own "Stale API" heading.
Each item: `path/to/file.ts:line: <what's wrong>. Fix: <action>`.
If none: write `None.`

## QUALITY
Items that work but fall short of the bar: generic naming, inline
handlers that should be extracted, native methods instead of Effect
modules in pipes, views that should be decomposed, branch keys or
key-only wrapper elements that view identity makes redundant, etc. Should fix.
Each item: `path/to/file.ts:line: <the gap>. Idiomatic version: <what to write>`.
Cite the exemplar when relevant: "examples/routing does this as X at
src/page/people/people.ts:33-40".
If none: write `None.`

## NICE-TO-HAVE
Polish items that would push quality further but aren't required:
additional tests, slightly better names, minor refactors.
If none: write `None.`

## VERDICT
One of:
- `PASS`: the code is at the bar.
- `NEEDS-WORK`: there are BLOCKERS or QUALITY items to address.
```

Be specific. Be brutal. Don't grade on a curve. If unsure whether something is at the bar, compare to the exemplar. If the exemplar wouldn't write it that way, flag it.

For every finding, include enough context that a reader can act without re-reading the file:

- **Bad**: `search.ts:47: naming issue`
- **Good**: `search.ts:47: Message named 'ChangeEmail' should be 'UpdatedEmail' to match the verb-first past-tense convention used elsewhere in this file (UpdatedPassword, UpdatedUsername)`

When findings overlap (for example, one helper has both a naming issue and a length issue), report each separately. Don't merge: the user needs to act on each independently.

## Phase 7: Offer fixes (opt-in)

**Stop after delivering the report.** Send it as its own message. Do not stage edits, do not pre-write a fix plan that bundles changes, do not include "I'll start applying these" in the same response as the report.

Then, in a separate turn, ask whether to apply fixes. Group by reversibility and blast radius:

- **Mechanical fixes** (single-line edits, name changes, import reorders, `({})` → `()`): offer to batch as one pass. Even the batch needs explicit consent. "Apply all 12 mechanical fixes?" is a real question with a real answer; don't proceed on assumed yes.
- **Structural fixes** (handler extraction, Block introduction, view decomposition, replacing hand-rolled widgets with `@foldkit/ui` components, migrating stale API to class Blocks): offer one at a time, confirm each, show the diff before applying.
- **Semantic fixes** (changing state shape, swapping booleans for discriminated unions, restructuring update logic): describe the change in prose, get explicit approval, then apply.

Don't apply fixes silently. Don't apply fixes the user didn't approve. Don't bundle a structural change into a "mechanical" batch. If the user said "audit my app" without saying "and fix what you find", treat that as report-only and ask before doing anything else.

If the user declines fixes, the audit ends with the report.

If they accept some, apply those, then run the four gate commands and report whether they pass:

```bash
npm run format      # FIRST: rewrites files
npm run lint
npm run typecheck
npm run test
```

Run format first because it rewrites files. Lint, typecheck, and test then verify the exact code that will be committed. If any gate fails after applying fixes, surface the failure verbatim. Don't auto-revert. Don't suppress.

End with a summary diff: which findings were resolved, which were declined, which remain open.

## Notes on focus areas

When `$ARGUMENTS` narrows to a focus area, Phase 5 reduces to the relevant subagents and blind spots. The report still uses the BLOCKERS / QUALITY / NICE-TO-HAVE / VERDICT structure, just scoped. The stale API scan runs for every focus, since stale usage changes what the rest of the audit can say.

Blind spots are named by their slug in [`../generate-program/blindSpots.md`](../generate-program/blindSpots.md). Cross-reference by slug, never by position. If a slug below is missing from that file, walk the entry that covers the same failure.

| Focus           | Subagents                                                                                                                                                     | Blind spots                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`          | D                                                                                                                                                             | `hand-rolled-widgets`, `a11y-gaps`, `aria-role-confusion`                                                                                                                                                       |
| `effects`       | B + the Command, Mount, constructor, and handler-capture checks from A                                                                                        | `repeated-scaffolding`, `manual-update-return-unpacking`, `functions-doing-two-things`, `effect-module-inconsistency`, `stuttery-modifyFields-setters`, `hand-rolled-async-state`, `manual-cache-orchestration` |
| `naming`        | C                                                                                                                                                             | `naming-drift`, `messages-naming-the-effect`, `view-named-after-namespace`                                                                                                                                      |
| `decomposition` | C                                                                                                                                                             | `repeated-scaffolding`, `functions-doing-two-things`, `split-block-file`                                                                                                                                        |
| `forms`         | D + form-specific (`Input` / `Textarea` adoption, fieldValidation usage, label/input pairing)                                                                 | `hand-rolled-widgets`, `a11y-gaps`                                                                                                                                                                              |
| `routing`       | A + routing-specific (bidirectional parser usage, route views as identity boundaries with no keyed route branches, `InformedOfRouteChange` sent to pages)     | `hard-coded-route-paths`, `data-derived-keys`                                                                                                                                                                   |
| `subscriptions` | A + subscription-specific (`stream` for always-on sources, `subscriptions` entries with `dependencies` for Model-gated ones, Message mapping in `Stream.map`) | `state-machine-edges`                                                                                                                                                                                           |
| `testing`       | E                                                                                                                                                             | `missing-scene-test`                                                                                                                                                                                            |
| `blocks`        | A (all Block checks) + C (Block and file naming)                                                                                                              | `manual-update-return-unpacking`, `view-named-after-namespace`                                                                                                                                                  |
| `types`         | (inline) type-shape and aliasing                                                                                                                              | `manual-update-return-unpacking`, `array-type-syntax`, `schema-type-aliases`, `hand-rolled-async-state`                                                                                                         |

For focused audits, skip Phase 4's full grep block and run only the greps relevant to the focus (for example, for `a11y`, run `label without For`, `outline-none without focus-visible`, and the `_blank` scan, reading each hit's attribute block for `Rel`).
