---
name: audit-program
description: Audit an existing Foldkit program against the architecture, conventions, and quality bar. Use when the user wants to review their Foldkit code, check for anti-patterns, accessibility gaps, or quality regressions. Triggers on phrases like "audit my app", "review this Foldkit code", "check for anti-patterns", "is this idiomatic?", or "what would the reviewer find?"
argument-hint: '[optional: path or focus area like a11y/effects/naming/decomposition/forms/routing/subscriptions/blocks/types/testing]'
---

Audit an existing Foldkit program against the same bar `generate-program` targets: this code should be **indistinguishable in quality from hand-written code in `packages/typing-game/client/src/` or `packages/website/src/`**. Not "works." Not "structurally valid." Typing-game quality.

> **Recommended setup:** the audit is dramatically higher fidelity when `repos/foldkit/` is vendored as a git subtree in the audited project. Without it, you grade against the snapshots in `generate-program/architecture.md` and `conventions.md`. With it, you grade against the live exemplars (`examples/`, `packages/typing-game/`, `packages/website/`), which is what those snapshots are summarizing in the first place. If the subtree is missing, recommend adding it before the audit begins, pinned to the release git tag matching the installed `foldkit` package so the exemplars match the APIs the project compiles against: `git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash`. For a canary install, whose version (`x.y.z-canary.<commit>`) has no tag, pin to the full hash of the commit it names instead, which GitHub expands at `https://github.com/foldkit/foldkit/commit/<commit>`.

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

Ordinary source Block export review: verify one private zero-argument preparation producer named `prepare` and the actual four-shape `Block.FromAssemblyWith*` declaration header immediately after it with no blank line before a parent Schema consumes `ChildBlock.Model`. A descriptive producer name is valid only when one file genuinely contains multiple preparation producers. The initializer is exactly `Block.assemble(prepare)`, and the producer must return the real Composition's `prepareBlock` result. The raw producer result is opaque and unfinished. Feature barrels keep Model and authoring contracts internal; independently public domain Schemas and published generic UI contracts remain intentional. Treat casts, `satisfies`, raw producer calls, annotations alone, and helper-shaped names as insufficient evidence.

For a package shipping declarations, name each ordinary public completed contract with a same-name interface extending the matching checked `FromAssembly*<typeof Model, typeof prepare>`, followed by `export const FeatureBlock: FeatureBlock = Block.assemble(prepare)`. Keep producer, interface, and value adjacent as one assembly unit. A reusable named generic `Completed` interface can provide that boundary for a generic factory. JavaScript-only applications retain the existing checked value annotation. Verify declaration emission for actual public entrypoints and external consumption; `noEmit` alone is insufficient and there is no reliable child-count threshold. Naming the header prevents repeated child expansion, but it does not guarantee arbitrary root serialization or seal deliberate ambient augmentation.

Author an exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record. Each case receives the contextual Model and exact Message payload, and operations retain the selected case's Command requirements and OutMessage contract. Use `makeUpdate.withContext(context => cases)` for additional dispatch arguments; the factory runs for local dispatch, not routed child-only delivery. Generic Step values inside that context factory may need `model => step(model)` for inference. Ordinary handlers return results directly; do not wrap every case with `makeStep`. A Model-preserving no-op record value is `Definition.makeNoopStep()`, not the bare factory.

`Composition.makeUpdate` accepts only an exhaustive handler record; its callback overload is removed. Use `makeUpdate({})` when there are no local Messages. Each handler receives `(model, message)`; name extracted single-Message handlers `handle<MessageTag>` and pass compatible handlers or Steps directly. Keep shared Steps named for their operation. If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected; ordinary raw-only handlers can return results directly. Do not hide errors with casts or broad return annotations: a later wrapper cannot recover channels already erased upstream.

## Phase 1: Scope the audit

Sketch the audit plan in one sentence and confirm before reading code:

> "I'll audit `src/page/room/` for naming, decomposition, and Effect-TS idiom consistency, comparing against typing-game's room page. Sound right?"

Skip this confirmation only when the scope is unambiguous (single file, single focus). For everything else, the sketch is cheap and the user can redirect before you spend cycles on the wrong target.

## Phase 2: Read the canonical references

Read the references that match the audited surface:

1. [Architecture guide](../generate-program/architecture.md): the TEA loop and
   primitives present in the app
2. [Conventions guide](../generate-program/conventions.md): the naming, Schema,
   Effect, and update sections relevant to the audited files
3. [Block composition and Layers](../foldkit/references/composition.md): Blocks,
   stateful UI components, child Bindings, Mounts, OutMessages, startup policy,
   handler recipes, and Service Layers
4. [Verification checklist](../generate-program/checklist.md): mechanical checks
   and the quality bar
5. [Blind spots](../generate-program/blindSpots.md): failures that survive
   typecheck, lint, and tests

Read the relevant references before grading. Do not load an unrelated guide
merely because it exists.

These references are snapshots. When the audited project vendors
`repos/foldkit/`, the live source wins over anything here: read the `.d.ts` or
the example rather than grading against a remembered signature.

Do not skim. The audit's signal-to-noise depends on the auditor having internalized the bar before reading the audited code.

## Phase 3: Map the project

Before deep review, build a model of the audited code:

1. **File tree**. Every file in scope, with a one-line description (`update.ts: handlers for ClickedSubmit, UpdatedEmail, ...`).
2. **Tier**. Match against the generate-program tier ladder:
   - **Tier 1**: single page, no async, single file
   - **Tier 2**: timers, subscriptions, simple stateful
   - **Tier 3**: async, loading/error, forms
   - **Tier 4**: routing, multiple pages
   - **Tier 5**: nested domain, CRUD
   - **Tier 6**: Blocks, OutMessage, multi-step flows
   - **Tier 7**: real-time, WebSocket, ManagedResources
3. **Foldkit modules used**. Grep imports for `AsyncData`, `Calendar`, `File`, `Http`, `Update`, `Port`, `Subscription`, `Command`, `Mount`, `ManagedResource`, `CustomElement`, `Dom` from `foldkit`, plus `foldkit/fieldValidation` and any component imported from `@foldkit/ui`. HTTP usage shows up as `HttpClient` / `HttpClientRequest` imported from `effect/http`, not as a `foldkit` import, so grep for those separately; `Http` from `foldkit` is only the `layer` that provides the client. Tells you which checklist sections apply.
4. **Tier-matching exemplar**. Pick at least one to read alongside the audited code:
   - Tier 1-2 → `${CLAUDE_SKILL_DIR}/../../examples/counter/src/application.ts`, `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/application.ts`
   - Tier 3 → `${CLAUDE_SKILL_DIR}/../../examples/weather/src/command.ts` and `update.ts`, `${CLAUDE_SKILL_DIR}/../../examples/form/src/update.ts`
   - Tier 4 → `${CLAUDE_SKILL_DIR}/../../examples/routing/src/update.ts`
   - Tier 5 → `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/`
   - Tier 6 → `${CLAUDE_SKILL_DIR}/../../examples/auth/src/`, `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/`
   - Tier 7 → `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/page/room/`
5. **Foldkit UI integration**. If anything is imported from `@foldkit/ui`, also read `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/composition.ts`, `update.ts`, and `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/` for the wiring pattern. Verify that each stateful component enters through `ParentDefinition.makeBinding(FeatureBlock, config)` and is included in the parent's Composition `bindings`. Ordinary features export a completed `FooBlock`; generic component factories return an exact completed Block named locally. Trace the root from `ApplicationDefinition = Block.makeDefinition('Application', { Model, Message })` through `ApplicationComposition`, its authored init, update, and view, the private `prepare` producer, and the annotated `ApplicationBlock = Block.assemble(prepare)`. Verify that `entry.ts` passes the Block and host options to `Program.make` or `Program.makeElement`, supplies `ApplicationLayer` through `program.provide`, and starts it with the Runtime. Verify generated delivery uses `delivery.when`, `delivery.toUpdateContext`, and `keySchema` where their policies apply, without an authored parent `Got*` wrapper or Message mapper. Check that the canonical view uses the Composition's `makeView` or `makeView.withInputs` with an inferred `h`, and that child views render through `h.block(binding.embedView(...))`.

The exemplar is the comparison target. When you find a pattern that smells off, ask: **does the exemplar do this differently?** If yes, flag it.

## Phase 4: Run the linter, then the mechanical scans

### The linter first

`@foldkit/oxlint-plugin` ships AST rules covering much of what this audit
grades: keyed mapped rows, no array-index keys, hard-coded route strings,
empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`,
parent construction of child-owned Messages, PascalCase named Command definitions, Mount handler
factories that ignore their element, module-level mutable state, and `NoOp` Messages.
They parse the code, so they catch what a grep misses.

Establish whether the rules are actually **active**, which is not the same as
finding the package name. **The config is the authority here, not the lint
output.** Locate the config before reading anything out of it. A lint script may
name one with `--config`, and in a workspace the config usually sits above the
app rather than beside it:

```bash
grep -n '"lint"' package.json
find . .. ../.. -maxdepth 1 -name '.oxlintrc.json' 2>/dev/null
```

**Finding no config is a different outcome from finding one without Foldkit in
it, and the two look identical if you only read stdout.** A grep against a
missing file and a grep against a config that doesn't mention Foldkit both print
nothing. Branch on whether the `find` located a file at all:

- **No config located**: the outcome is Undetermined, never Not active. The
  project may well be linted from a parent workspace this audit didn't reach.
- **Config located**: grep it for `foldkit`. A hit under `extends` pointing at
  the plugin's `recommended.json`, which is what the scaffold writes, or a
  `jsPlugins` entry naming the plugin by path specifier, which is how a monorepo
  or vendored setup wires it and how the Foldkit repo itself does it, means the
  rules are Active. No hit, but the config has an `extends` entry pointing
  somewhere else, means follow that file and repeat: a shared internal config can
  wire the plugin one level up. No hit and nothing left to follow is Not active.

Lint output can confirm activation but can never rule it out. Diagnostics are
labelled `foldkit(rule-name)`, so seeing `foldkit(` proves the rules ran, and
grepping for `foldkit/` finds nothing even when every rule is running. Zero
`foldkit(` matches proves nothing at all: that is what a passing project looks
like. Never infer "not active" from a quiet lint run.

- **Active**: run the project's lint script. Every `foldkit(...)` diagnostic is a
  finding, reported like any other, and it outranks a grep hit on the same
  subject because the rule actually parsed the code. Do not re-derive those
  findings by hand.
- **Not active**: report it as the first **QUALITY** item, worded as tooling.
  Don't file it as a BLOCKER: that bucket is defined for code that is
  structurally wrong and its item format requires a `file:line`, which a missing
  devDependency doesn't have. Filing it there would also fail every hand-written
  app on tooling grounds alone. It is still usually the highest-leverage fix in
  the audit, so lead the QUALITY list with it: one devDependency and one
  `extends` line buy continuous enforcement of two dozen invariants, where this
  audit is a snapshot. Then fall back to the greps, and say in the report that
  they are a weaker substitute, since they miss wrapped calls and renamed
  helpers. A clean grep run on an unlinted project is weak evidence, not a pass.
- **Undetermined**: run the lint script anyway and treat any `foldkit(...)`
  diagnostic as the Active case, since one diagnostic settles the question. With
  no diagnostics, fall back to the greps as above, but say the wiring was
  undetermined rather than missing, and name the paths you searched. Do not
  recommend installing a plugin that may already be enforcing these rules.

A project scaffolded by `create-foldkit-app` has the plugin installed and wired
by default, so an audited project lacking it usually predates the scaffold or
dropped the config.

### Then the scans

Run the canonical greps from the **Mechanical scans** block in [`../generate-program/checklist.md`](../generate-program/checklist.md). That checklist is the source of truth. It covers ground no rule touches (API drift, `@foldkit/ui` adoption, Effect idiom, a11y detail, test shape) plus the deliberate edges of rules that are narrow by design; each such grep names the rule it complements and where that rule stops. Don't duplicate the commands here, and don't delete a scan just because a rule shares its subject: check whether the rule actually covers the case. Note too that `recommended.json` disables every rule for `**/*.test.ts` and `**/*.test.tsx`, so the linter contributes nothing to the test-shape checks in Subagent E. Each hit is either a finding or a `// NOTE:` justification. Silent hits aren't allowed.

For every hit, decide:

- Is there a `// NOTE:` above it justifying the deviation?
- If yes, evaluate the justification. Is it real, or defensive rationalization? Common false-justifications: "would require duplicate state" (most `@foldkit/ui` components have small inline-constructable models, and the controlled render helpers have none at all), "the interaction is too custom" (the `toView` callback handles arbitrary HTML), or "the child is too hard to bind" (generated delivery removes parent-authored Message wiring).
- If no NOTE, it's a finding.

Mechanical scans catch the cheap stuff. They're the floor of the audit, not the ceiling.

## Phase 5: Structural review

Walk every category in [`../generate-program/checklist.md`](../generate-program/checklist.md) against the code. Every category, every item, against the actual files.

### Parallelize via subagents (Tier 4+)

For non-trivial audits, parallelize. Spawn subagents in a single message so they run concurrently. Each owns one dimension and reads the canonical reference plus the relevant audited files in parallel.

Use `Agent` with `subagent_type: general-purpose`. Suggested fan-out:

- **Subagent A (Structural correctness)**. Model schema completeness, Message union coverage, `Message.match` exhaustiveness, every `Succeeded*` paired with `Failed*`, every Command identity defined as a PascalCase constant via the owning named feature’s `makeCommand`, every route variant rendered, no dead state variants. For attached handlers, verify that the generator captures only application-scoped services and returns a function that receives current Command args, Subscription dependencies, or a Mount element on each invocation. A definition without `handler` must be an external host contract whose `toLayer` implementation is supplied at the host boundary. Native web components are bound via `CustomElement.define`, not via `OnMount` + Subscription + tag-name registry. Flag any custom element wired through `OnMount` when its surface is just typed properties + observed attributes + dispatched `CustomEvent`s.
- **Subagent B (Effect-TS idioms)**. Check that `pipe` keeps a transformed value as the subject of clear left-to-right data flow rather than merely rearranging an ordinary call. A single transformation is valid when that order carries meaning, including attaching an OutMessage to an existing update return. Prefer `Option.match` over `Option.map(...).pipe(Option.getOrElse(...))`, `Array.match` for empty/non-empty branching, `Array.match` over `.length === 0` / `.length > 0` for branching on a Model array (the `isArrayEmpty` / `isArrayNonEmpty` predicates take a mutable `Array<A>` and reject `ReadonlyArray`), `modifyFields` over spread, point-free `modifyFields` setters when they only transform the current field, callable constructors over `as Type`, `Array.fromOption` for "zero or one Command", `Equal.equals` in predicates, and no `Effect.ignore` on infallible Effects. Check `AsyncData` over a hand-rolled remote-data union. Inline an update return type when one `Message.match` is its only use. Create an `UpdateReturn` alias when another matcher, helper, or exported signature reuses the type. Do not repeat a return annotation on an update already constrained by `Message.match<UpdateReturn>`.

  Trace mutable handler/service state to execution bookkeeping, such as worker availability or protocol request IDs. Flag pending work shown to the user, selections, or submission rules hidden in a handler/service: those belong in the Model and update. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

  Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. A missing `outMessage` field means that update emitted nothing. The `outMessage?: never` guard prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. A hand-written alias must preserve that guard. Producers omit `commands` when they statically create none. They return computed Commands collections without checking whether they are empty, and never write the literal `commands: []`.

  Keep each result bound to an operation-named value and consume it with dot access. Do not destructure or rename `model`, `commands`, or `outMessage`. Optional Commands pass directly to `Command.mapMessages`; `result.commands ?? []` is for operations that require a concrete array. Dot access keeps the operation and all of its returned fields visible together but does not prevent someone from ignoring `outMessage`. See `repeated-scaffolding` and `manual-update-return-unpacking` in blindSpots.md.

Use `Definition.makeFieldsStep(producer)` for owning field transformations, `Definition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `Definition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `Definition.makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use `Definition.makeStep` for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

Flag local `makeStep` branches that construct and immediately apply another local Step merely to express that branch; return the result directly, including `{ model }` when unchanged. Keep calls to existing reusable operations, sequential composition, and canonical local Steps needed for mixed connected recipes so their result channels and registration evidence remain intact.

The `makeCommandsStep` callback receives the contextually typed current Model when the Step is applied; constructing the Step defers the callback. The Step returns that same Model object. Use `Definition.makeCommandsStep(() => [FocusField()])` when the Model is unused. Effects run later in the Runtime.

A Binding's `write` or `writeAt` places the next child Model into parent storage. Keep parent reactions to child transitions in its OutMessage policy. Do not compare old and new child state in a writer to generate announcements, trigger sibling changes, or maintain unrelated parent fields. Nested storage, keyed replacement, presence checks, and preservation of wrapper metadata remain legitimate custom writes. If a parent needs a child fact that is not exposed, add a truthful public OutMessage rather than using the writer as an event hook.

Check both direct-field writer coordination caught by `foldkit/no-binding-write-coordination` and complex writers outside its conservative coverage. Do not flag legitimate wrapper metadata, keyed replacement, or absence checks merely because a custom writer touches several fields.

Review child retention, rendering, and activity separately. Route-driven deletion should have a product reason. When editors are retained by identity, view must select the active child from the Route; hidden save completions must still reach their occurrence. Check that route-wide delivery gates do not discard those results. Require interaction cleanup only when the product actually needs it; do not add exhaustive navigation/interleaving policy to a normal example application. Name conditional initialization `initialize...IfMissing` and pure transitions for their actual Model change; vague `sync` or `observe` helpers can conceal several responsibilities.

For a pure append to a keyed array that already declares `init.instances` and
`init.toItem`, prefer `initAndAppend(Binding, model, { key, args })` from
`foldkit/bindingInit` over repeating its wrapper writer. Verify the caller owns
the absent-key decision. Keep explicit `Binding.init` for other storage,
replacement, or cohesive changes to additional parent fields or Commands.
Do not require a startup policy solely to enable this helper.

For Block, Binding, Composition, OutMessage, startup, handler Layer, and root
Service review, read
[Block composition and Layers](../foldkit/references/composition.md). Trace the
actual graph and check every invariant in its final review list. Report the
concrete ownership or lifecycle consequence rather than copying the reference
into a finding. Verify one Definition and Composition per owner, one
registration per selected Binding, exact storage and inverse routing,
exhaustive OutMessage policy, explicit startup ownership, local-only handler
recipes, child graph propagation, root-only ordinary Services, and passive
assembly before Runtime start.

Preserve inferred Command requirements in Composition update and owned Steps.
Build a local child fold with the parent Definition's `makeOutMessageFold`
and the whole completed child Block. Require direct named variant handlers,
no repeated Step or payload types, and an inferred second handler argument
only where `FoldContext` is used. Retain a purposeful keyed factory or adapter
when policy needs call-site context. Build forwarding policy with the parent
Definition's `makeOutMessageForward`, require every variant to return a
declared parent OutMessage or `undefined`, and require at least one variant to
forward. Verify that the full Binding selected through `withOutMessagePolicy`
is registered. For self-referential or reciprocal policy, require original
`FooBinding` values first and selected `FooBindingWithOutMessagePolicy` values
afterward; raw child matchers, annotations, casts, and generic argument lists
are not inference workarounds. Whole-feature recipe replacement happens
before binding, while ordinary execution tests replace Service providers
beneath real handlers.

- **Subagent C (Naming and decomposition)**. `maybe*` reserved for `Option<T>`, `is*` for booleans, no opaque abbreviations or unexplained single-letter names, conventional domain shorthand allowed, `Updated*` not `Changed*`, `Completed*` mirrors Command name verb-first, named helpers use specific verbs not generic ones, handlers over ~15 lines extracted, view branches over ~30 lines extracted, no function exceeds ~40 lines. Comments are sparse and mark architecture handoffs or a genuinely surprising constraint; they do not narrate ordinary control flow.
- **Subagent D (Foldkit UI and accessibility)**. Hand-rolled `input` / `textarea` / `button` / `dialog` flagged unless NOTE-justified, label/input pairing via `For(id)` + `Id(id)`, dynamic errors announce via `Role('alert')` or `AriaLive('polite')`, icon-only buttons have `AriaLabel`, external links carry `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks (`main`, `nav`, `header`, `footer`) over `div` soup, focus visibility preserved (no `outline-none` without `focus-visible:` replacement).
- **Subagent E (Testing, Tier 3+)**. `story.test.ts` exists with `story` pipelines, every fallible Command tested for both `Succeeded*` and `Failed*` paths, at least one multi-step interaction test, Block tests assert `outMessage`, and the TypeScript project includes test files. Commands and Mounts match their original Definition identities instead of displayed names; child resolutions supply raw child Messages instead of generated envelopes. UI tests take matcher Definitions from public `test` namespaces and result Messages from completed Blocks. Commands resolve via `Command.resolve(Definition, resultMessage)` rather than running Effects directly. **`scene.test.ts` is REQUIRED at Tier 3+** and is a BLOCKER if absent. Each `scene` block must contain at least one `expect(...)` or interactive resolution. Locators must be accessible (`role`, `label`, `text`) over `placeholder` or CSS selectors. A Scene using `Subscription.emit` must register `subscriptions` in its config, pass the exact entry, and emit only Messages declared by that entry; Scene validates both the selected source and its Message Schema before applying lift mappings. Lifted entries take raw child Messages. Whole-application execution tests keep the real handler Layers and replace deterministic providers below them. A test that replaces an entire handler exercises only code above that seam.

Each subagent prompt is self-contained: the canonical references to read, the file list to audit, the dimension to grade, and the report format from Phase 6. Each returns its findings as a slice of the eventual report.

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
Foldkit invariants. Must fix.
Each item: `path/to/file.ts:line: <what's wrong>. Fix: <action>`.
If none: write `None.`

## QUALITY
Items that work but fall short of the bar: generic naming, inline
handlers that should be extracted, native methods instead of Effect
modules in pipes, views that should be decomposed, branch keys or
key-only wrapper elements that view identity makes redundant, etc. Should fix.
Each item: `path/to/file.ts:line: <the gap>. Idiomatic version: <what to write>`.
Cite the exemplar when relevant: "typing-game does this as X at
page/home/update/handleKeyPressed.ts:33-40".
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

- **Bad**: `update.ts:47: naming issue`
- **Good**: `update.ts:47: Message named 'ChangeEmail' should be 'UpdatedEmail' to match the verb-first past-tense convention used elsewhere in this file (UpdatedPassword, UpdatedUsername)`

When findings overlap (e.g. one helper has both a naming issue and a length issue), report each separately. Don't merge: the user needs to act on each independently.

## Phase 7: Offer fixes (opt-in)

**Stop after delivering the report.** Send it as its own message. Do not stage edits, do not pre-write a fix plan that bundles changes, do not include "I'll start applying these" in the same response as the report.

Then, in a separate turn, ask whether to apply fixes. Group by reversibility and blast radius:

- **Mechanical fixes** (single-line edits, name changes, import reorders, `({})` → `()`): offer to batch as one pass. Even the batch needs explicit consent. "Apply all 12 mechanical fixes?" is a real question with a real answer; don't proceed on assumed yes.
- **Structural fixes** (handler extraction, Block introduction, view decomposition, replacing hand-rolled widgets with `@foldkit/ui` components): offer one at a time, confirm each, show the diff before applying.
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

When `$ARGUMENTS` narrows to a focus area, Phase 5 reduces to the relevant subagents and blind spots. The report still uses the BLOCKERS / QUALITY / NICE-TO-HAVE / VERDICT structure, just scoped.

Blind spots are named by their slug in [`../generate-program/blindSpots.md`](../generate-program/blindSpots.md). Cross-reference by slug, never by position.

| Focus           | Subagents                                                                                                                                            | Blind spots                                                                                                                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`          | D                                                                                                                                                    | `hand-rolled-widgets`, `a11y-gaps`, `aria-role-confusion`                                                                                                                                                       |
| `effects`       | B                                                                                                                                                    | `repeated-scaffolding`, `manual-update-return-unpacking`, `functions-doing-two-things`, `effect-module-inconsistency`, `stuttery-modifyFields-setters`, `hand-rolled-async-state`, `manual-cache-orchestration` |
| `naming`        | C                                                                                                                                                    | `naming-drift`, `messages-naming-the-effect`, `view-named-after-namespace`                                                                                                                                      |
| `decomposition` | C                                                                                                                                                    | `repeated-scaffolding`, `functions-doing-two-things`                                                                                                                                                            |
| `forms`         | D + form-specific (`Input` / `Textarea` adoption, fieldValidation usage, label/input pairing)                                                        | `hand-rolled-widgets`, `a11y-gaps`                                                                                                                                                                              |
| `routing`       | A + routing-specific (bidirectional parser usage, route views as identity boundaries with no keyed route branches, `urlToString` in `Internal` case) | `hard-coded-route-paths`, `data-derived-keys`                                                                                                                                                                   |
| `subscriptions` | A + subscription-specific (`Subscription.make` shape, name-only entries for always-active Layer-backed Streams, message mapping inside `Stream.map`) | `state-machine-edges`                                                                                                                                                                                           |
| `testing`       | E                                                                                                                                                    | `missing-scene-test`                                                                                                                                                                                            |
| `blocks`        | A + block-specific (generated delivery policy, optional `outMessage` returns, parent ↔ child Message isolation)                                      | `manual-update-return-unpacking`, `authored-child-delivery-message`, `view-named-after-namespace`                                                                                                               |
| `types`         | (inline) type-shape and aliasing                                                                                                                     | `manual-update-return-unpacking`, `array-type-syntax`, `unearned-type-aliases`, `hand-rolled-async-state`                                                                                                       |

For focused audits, skip Phase 4's full grep block and run only the greps relevant to the focus (e.g. for `a11y`, run `label without For`, `outline-none without focus-visible`, and the `_blank` scan, reading each hit's attribute block for `Rel`).

For focused `blocks` or `effects` audits, read
[Block composition and Layers](../foldkit/references/composition.md) and apply
its decision tables and review invariants to the selected files. Include startup
policy in that trace; do not infer TypeScript initializer arity from Runtime
metadata.
