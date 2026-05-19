---
name: audit-program
description: Audit an existing Foldkit program against the architecture, conventions, and quality bar. Use when the user wants to review their Foldkit code, check for anti-patterns, accessibility gaps, or quality regressions. Triggers on phrases like "audit my app", "review this Foldkit code", "check for anti-patterns", "is this idiomatic?", or "what would the reviewer find?"
argument-hint: '[optional: path or focus area like a11y/effects/naming/decomposition/forms/routing/subscriptions/submodels/types/testing]'
---

Audit an existing Foldkit program against the same bar `generate-program` targets: this code should be **indistinguishable in quality from hand-written code in `packages/typing-game/client/src/` or `packages/website/src/`**. Not "works." Not "structurally valid." Typing-game quality.

> **Recommended setup:** the audit is dramatically higher fidelity when `repos/foldkit/` is vendored as a git subtree in the audited project. Without it, you grade against the snapshots in `generate-program/architecture.md` and `conventions.md`. With it, you grade against the live exemplars (`examples/`, `packages/typing-game/`, `packages/website/`), which is what those snapshots are summarizing in the first place. If the subtree is missing, recommend adding it with `git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git main --squash` before the audit begins.

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
- A focus area (`a11y`, `effects`, `naming`, `decomposition`, `forms`, `routing`, `subscriptions`, `submodels`, `types`, `testing`) → audit `src/` along that dimension only
- A path AND a focus → narrow on both axes

If the argument is ambiguous (could be a path OR a focus), ask which. Don't guess.

## Phase 1: Scope the audit

Sketch the audit plan in one sentence and confirm before reading code:

> "I'll audit `src/page/room/` for naming, decomposition, and Effect-TS idiom consistency, comparing against typing-game's room page. Sound right?"

Skip this confirmation only when the scope is unambiguous (single file, single focus). For everything else, the sketch is cheap and the user can redirect before you spend cycles on the wrong target.

## Phase 2: Read the canonical references

Read these in order. Every audit, no shortcuts. They're the spec the audit grades against.

1. [Architecture guide](../generate-program/architecture.md): TEA invariants, Submodel and OutMessage pattern, Flags, Subscriptions, Mount / Command / ManagedResource / CustomElement selection
2. [Conventions guide](../generate-program/conventions.md): naming, Effect-TS idioms, Schema patterns, view conventions
3. [Verification checklist](../generate-program/checklist.md): the canonical mechanical-check + quality-bar reference

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
   - **Tier 6**: Submodels, OutMessage, multi-step flows
   - **Tier 7**: real-time, WebSocket, ManagedResources
3. **Foldkit modules used**. Grep imports for `Calendar`, `File`, `FieldValidation`, `Ui.*`, `Subscription`, `Command`, `Mount`, `ManagedResource`, `CustomElement`, `Dom`, `HttpClient`, etc. Tells you which checklist sections apply.
4. **Tier-matching exemplar**. Pick at least one to read alongside the audited code:
   - Tier 1-2 → `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`, `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/main.ts`
   - Tier 3 → `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts`, `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts`
   - Tier 4 → `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts`
   - Tier 5 → `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/`
   - Tier 6 → `${CLAUDE_SKILL_DIR}/../../examples/auth/src/`, `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/`
   - Tier 7 → `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/page/room/`
5. **Foldkit UI integration**. If any `Ui.*` is imported, also read `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/main.ts` for the wiring pattern.

The exemplar is the comparison target. When you find a pattern that smells off, ask: **does the exemplar do this differently?** If yes, flag it.

## Phase 4: Mechanical scans

Run the canonical greps from the **Mechanical scans** block in [`../generate-program/checklist.md`](../generate-program/checklist.md). That checklist is the source of truth. Don't duplicate the commands here. Each hit is either a finding or a `// NOTE:` justification. Silent hits aren't allowed.

For every hit, decide:

- Is there a `// NOTE:` above it justifying the deviation?
- If yes, evaluate the justification. Is it real, or defensive rationalization? Common false-justifications: "would require duplicate state" (most Ui components have small inline-constructable models), "the interaction is too custom" (the `toView` callback handles arbitrary HTML), "we don't want to wire toParentMessage" (that's the unavoidable cost of a11y-correct interactive widgets, paid once per use).
- If no NOTE, it's a finding.

Mechanical scans catch the cheap stuff. They're the floor of the audit, not the ceiling.

## Phase 5: Structural review

Walk every category in [`../generate-program/checklist.md`](../generate-program/checklist.md) against the code. Every category, every item, against the actual files.

### Parallelize via subagents (Tier 4+)

For non-trivial audits, parallelize. Spawn subagents in a single message so they run concurrently. Each owns one dimension and reads the canonical reference plus the relevant audited files in parallel.

Use `Agent` with `subagent_type: general-purpose`. Suggested fan-out:

- **Subagent A (Structural correctness)**. Model schema completeness, Message union coverage, `M.tagsExhaustive` exhaustiveness, every `Succeeded*` paired with `Failed*`, every Command identity defined as a PascalCase constant via `Command.define`, every route variant rendered, no dead state variants. Native web components bound via `CustomElement.define`, not via `OnMount` + Subscription + tag-name registry. Flag any custom element wired through `OnMount` when its surface is just typed properties + observed attributes + dispatched `CustomEvent`s.
- **Subagent B (Effect-TS idioms)**. `pipe` only for multi-step (no single-op pipes), `Option.match` over `Option.map(...).pipe(Option.getOrElse(...))`, `Array.match` for empty/non-empty branching, `Array.isEmptyArray` over `.length === 0`, `evo` over spread, callable constructors over `as Type`, `Array.fromOption` for "zero or one Command", `Equal.equals` in predicates, no `Effect.ignore` on infallible Effects.
- **Subagent C (Naming and decomposition)**. `maybe*` reserved for `Option<T>`, `nullable*` for `T | undefined`, `is*` for booleans, no abbreviations, `Updated*` not `Changed*`, `Completed*` mirrors Command name verb-first, named helpers use specific verbs not generic ones, handlers over ~15 lines extracted, view branches over ~30 lines extracted, no function exceeds ~40 lines.
- **Subagent D (Foldkit UI and accessibility)**. Hand-rolled `input` / `textarea` / `button` / `dialog` flagged unless NOTE-justified, label/input pairing via `For(id)` + `Id(id)`, dynamic errors announce via `Role('alert')` or `AriaLive('polite')`, icon-only buttons have `AriaLabel`, external links carry `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks (`main`, `nav`, `header`, `footer`) over `div` soup, focus visibility preserved (no `outline-none` without `focus-visible:` replacement).
- **Subagent E (Testing, Tier 3+)**. `main.story.test.ts` exists with `Story.story` pipelines, every fallible Command tested for both `Succeeded*` and `Failed*` paths, at least one multi-step interaction test, Submodel tests assert `outMessage`, Commands resolved via `Story.Command.resolve(Definition, resultMessage)` not by running Effects directly. **`main.scene.test.ts` is REQUIRED at Tier 3+** and is a BLOCKER if absent. Each `Scene.scene` block must contain at least one `Scene.expect(...)` or interactive resolution. Locators must be accessible (`Scene.role`, `Scene.label`, `Scene.text`) over `Scene.placeholder` or CSS selectors.

Each subagent prompt is self-contained: the canonical references to read, the file list to audit, the dimension to grade, and the report format from Phase 6. Each returns its findings as a slice of the eventual report.

For Tier 1-2 or focused audits, do the review inline. The surface is small enough that subagent fan-out adds more overhead than it saves.

### Walk these blind spots

These are the failure modes that pass typecheck and tests but fall short of the bar. Hit each one explicitly. For each, output one line in your notes: `[#N] <dimension>: clean | flagged at <file:line>: <issue>`.

1. **Off-by-one errors.** Logic with "after N", modulo, "every Nth", counter thresholds, or cycle boundaries. Trace for N=0, N=1, and the first transition. `count % 4 === 0` triggers on count=0. Intended or bug?

2. **Skip / reset semantics.** Skip, reset, cancel, undo. Trace what each does to counters and derived state. Does skip increment the counter or bypass it? Does reset preserve it? Is the behavior consistent with what a user would expect?

3. **State machine edges.** For every discriminated-union state, ask: can the code transition INTO every state? OUT of every state? Are there dead states (created, never entered)? Impossible-but-reachable states?

4. **Redundant derived data in Model.** Fields that could be computed from others. `endTime` AND `remainingMs` on the same state. One can drift. Flag unless there's a documented reason (view needs pure data, etc.).

5. **Repeated inline patterns.** Three or four handlers sharing the same 5-line scaffold (`M.tag` + `M.orElse`, `Option.match` + fallback) want a named helper. Genuinely duplicated decision logic, not coincidental similar shape. Specific case to check: `Match.withReturnType<readonly [Model, readonly Command<Message>[]]>()` written inline at every update site, especially when repeated across files. The convention is to extract once per file: `type UpdateReturn = readonly [Model, ReadonlyArray<Command<Message>>]; const withUpdateReturn = M.withReturnType<UpdateReturn>()`. Inline repetition is a tell that the author hasn't internalized the idiom.

6. **Functions that do two things.** Orchestrators mixing "decide what to do" with "do it." Helpers with `if` branching into unrelated behaviors. Handlers that conflate state and command decisions.

7. **Naming drift, and Messages that name the EFFECT instead of the EVENT.** Two related smells.

   First: `Updated*` here, `Changed*` there for the same kind of event. `whenX` here, `handleX` there for analogous cases. Diverging naming is a quality regression.

   Second: a Message named `Incremented` (the count was incremented) describes the resulting state change, not the user action. The Foldkit convention is verb-first past-tense for the EVENT that caused the update: `ClickedIncrement` (the user clicked the increment button). `Incremented` is past-tense in form but it names the consequence, not the cause. Same trap: `Saved`, `Deleted`, `Added` as Message names. The right names: `ClickedSave`, `ClickedDelete`, `ClickedAdd`, `SucceededSave`, `SucceededDelete`. Look for Messages that read like state mutations rather than user actions or external events.

8. **Effect module inconsistency.** Mixing `items.map(f)` and `Array.map(items, f)` in the same file. Mixing `Option.match` and `Option.map(...).pipe(Option.getOrElse(...))` for similar code. One file should use one idiom throughout.

9. **Empty-object constructor calls.** No-field tagged structs called with `({})`: `Idle({})`, `Work({})`, `ClickedSubmit({})`. Should be `Idle()`, `Work()`, `ClickedSubmit()`. Both compile; exemplars uniformly use no-arg.

10. **Dead state variants, unused fields, and no-op Commands.** Variants set but never observed by the view or other updates. Fields written but never read. Commands that resolve to Messages whose handlers are `[model, []]` (do nothing).

    The **no-op startup Command** pattern shows up at app boot: `init` returns `[DEFAULT_MODEL, [triggerApplicationStarted]]`, the Command resolves to `ApplicationStarted()`, and the update handler is `ApplicationStarted: () => [model, []]`. The Command does nothing. It's bureaucratic ceremony. Either give the Command real work (load preferences, fetch initial data, focus first input, restore session) or delete the Command and the Message together. A Command whose Message handler is a pure no-op is dead code dressed up as architecture.

    The **navigate-before-save** pattern is another instance: if `update` returns BOTH `saveState(...)` AND `navigateInternal(...)` in the same handler, the navigation races the save. A failure surfaced on the old page is unreachable. Idiomatic: emit save only, then navigate in the `Succeeded*` handler. Errors then surface on the page the user is still looking at.

11. **Hard-coded route paths.** `Href('/')`, `navigateInternal('/new')`, ``Href(`/tag/${name}`)``. Routers are bidirectional. Call them as printers: `Href(homeRouter())`, `navigateInternal(newLinkRouter())`, `Href(tagFilterRouter({ tag: name }))`.

12. **Hand-rolled accessible widgets.** Raw `input`, `textarea`, `button`, `dialog`, anything with `role="menu"` / `role="dialog"` / `role="tab"`. `Ui.Input`, `Ui.Textarea`, `Ui.Button`, `Ui.Dialog`, `Ui.Menu`, `Ui.Tabs` exist for a reason. A hand-rolled element without a NOTE explaining why is a BLOCKER, not a style preference. Hand-rolling skips accessibility work.

13. **A11y gaps.** For anything outside `Ui.*` coverage: label/input pairing via `For(id)` + `Id(id)`, dynamic errors announced via `Role('alert')` or `AriaLive('polite')`, icon-only buttons with `AriaLabel`, external links with `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks over `div` soup. Color is not the only carrier of meaning.

14. **Missing scene test (Tier 3+).** `main.scene.test.ts` is REQUIRED at Tier 3+. Absent? BLOCKER. Present but no `Scene.expect(...)` or `Scene.Command.resolve(...)` in any block? Same. A Scene that only does `Scene.with(model)` only verifies the view doesn't throw; it doesn't test anything.

15. **ARIA role confusion.** Checkboxes use `Role('checkbox')` + `AriaChecked(boolean)`. Toggle buttons (Play/Pause, Bold on/off, formatting toggles) use `AriaPressed(string)`. Mistaking one for the other is a semantic bug screen readers expose. Ask: does the label say "Mark as done" (checkbox) or "toggle bold" (pressed button)?

16. **Unkeyed list rows.** Rows in `Array.map(items, ...)` carrying `OnClick` handlers bound to specific item ids, without `keyed('li')(item.id, ...)`, are a snabbdom patching bug. Delete from the middle, the OLD row's click handler patches onto a different row. User clicks "Delete B" and habit A is deleted. Subtle: invisible until a delete or reorder happens mid-list. Every row renderer that consumes a domain entity with an `id` should return `keyed('li')(item.id, ...)` or `keyed('div')(item.id, ...)`.

17. **`T[]` syntax for array types.** `readonly Command<Message>[]` and `MyType[]` should be `ReadonlyArray<Command<Message>>` and `Array<MyType>`. Cosmetic but every exemplar is uniform on this. A common spot to find it: the inline `update` return type written as `readonly [Model, readonly Command<Message>[]]` should be `readonly [Model, ReadonlyArray<Command<Message>>]` (and ideally extracted to a `type UpdateReturn` alias, see blind spot #5).

18. **Redundant `type Foo = typeof Foo.Type` declarations on internal app schemas.** Writing `export const Model = S.Struct({...})` followed by `export type Model = typeof Model.Type` is noise when the schema is internal to the app. `typeof Model` works in type positions, and TypeScript merges value-and-type bindings under one name. The exception is library exports where the type is part of a public API consumed externally (e.g. `ViewConfig` callback parameters). For app code, the alias adds a line and a maintenance burden without helping any consumer.

19. **Flat parent Message Union absorbing a child's Messages instead of `Got*` wrapping.** When a parent's `Message = S.Union([ChildMessage, ParentLocalMessage])` directly includes the child's Message variants, every parent handler must know the child's tag names and the child can't grow its Message vocabulary without leaking into the parent. The canonical Submodel pattern wraps: `const GotChildMessage = m('GotChildMessage', { message: Child.Message })`, and the parent's `M.tagsExhaustive` has one `GotChildMessage` case that delegates: `Child.update(model.child, message)`. Flat unions work for trivial cases but don't scale and don't isolate child concerns. If you see a parent handling a child's tags directly, suggest the `Got*` wrapping for any Submodel that's likely to grow (or if the child needs to communicate to the parent via OutMessage).

20. **View functions named after the namespace they're imported under.** A counter feature exporting `counter(model)` reads as `Counter.counter(model)` at call sites, which is awkward and asks the reader to parse "namespace.same-word". The convention from the typing-game and website exemplars: name the primary view function `view`, so call sites read `Counter.view(model)`, `Home.view(model)`, `Room.view(model)`. The namespace already disambiguates; the function name carries the role.

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
modules in pipes, views that should be decomposed, missing keyed
wrappers, etc. Should fix.
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
- **Structural fixes** (handler extraction, Submodel introduction, view decomposition, replacing hand-rolled widgets with `Ui.*`): offer one at a time, confirm each, show the diff before applying.
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

| Focus           | Subagents                                                                                                                    | Blind spots     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `a11y`          | D                                                                                                                            | #12, #13, #15   |
| `effects`       | B                                                                                                                            | #5, #6, #8, #17 |
| `naming`        | C                                                                                                                            | #7, #9, #20     |
| `decomposition` | C                                                                                                                            | #5, #6          |
| `forms`         | D + form-specific (Ui.Input adoption, fieldValidation usage, label/input pairing)                                            | #12, #13        |
| `routing`       | A + routing-specific (bidirectional parser usage, keyed branches on `route._tag`, `urlToString` in `Internal` case)          | #11             |
| `subscriptions` | A + subscription-specific (`Subscription.make` shape, `S.Struct({})` for always-active, message mapping inside `Stream.map`) | none            |
| `testing`       | E                                                                                                                            | #14             |
| `submodels`     | A + submodel-specific (Got\* wrapping, three-tuple update returns with OutMessage, parent ↔ child Message isolation)         | #19             |
| `types`         | (inline) type-shape and aliasing                                                                                             | #17, #18        |

For focused audits, skip Phase 4's full grep block and run only the greps relevant to the focus (e.g. for `a11y`, run `label without For`, `outline-none without focus-visible`, `_blank without Rel`).
