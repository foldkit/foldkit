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
4. [Blind spots](../generate-program/blindSpots.md): the failure modes that survive typecheck, lint, and tests

These four files are a snapshot. When the audited project vendors `repos/foldkit/`, the live source wins over anything here: read the `.d.ts` or the example rather than grading against a remembered signature.

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
3. **Foldkit modules used**. Grep imports for `AsyncData`, `Calendar`, `File`, `Http`, `Update`, `Port`, `Subscription`, `Command`, `Mount`, `ManagedResource`, `CustomElement`, `Dom` from `foldkit`, plus `foldkit/fieldValidation` and any component imported from `@foldkit/ui`. HTTP usage shows up as `HttpClient` / `HttpClientRequest` imported from `effect/unstable/http`, not as a `foldkit` import, so grep for those separately; `Http` from `foldkit` is only the `layer` that provides the client. Tells you which checklist sections apply.
4. **Tier-matching exemplar**. Pick at least one to read alongside the audited code:
   - Tier 1-2 → `${CLAUDE_SKILL_DIR}/../../examples/counter/src/main.ts`, `${CLAUDE_SKILL_DIR}/../../examples/stopwatch/src/main.ts`
   - Tier 3 → `${CLAUDE_SKILL_DIR}/../../examples/weather/src/main.ts`, `${CLAUDE_SKILL_DIR}/../../examples/form/src/main.ts`
   - Tier 4 → `${CLAUDE_SKILL_DIR}/../../examples/routing/src/main.ts`
   - Tier 5 → `${CLAUDE_SKILL_DIR}/../../examples/kanban/src/`
   - Tier 6 → `${CLAUDE_SKILL_DIR}/../../examples/auth/src/`, `${CLAUDE_SKILL_DIR}/../../examples/job-application/src/`
   - Tier 7 → `${CLAUDE_SKILL_DIR}/../../packages/typing-game/client/src/page/room/`
5. **Foldkit UI integration**. If anything is imported from `@foldkit/ui`, also read `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/main.ts` and `${CLAUDE_SKILL_DIR}/../../examples/ui-showcase/src/ui/` for the wiring pattern.

The exemplar is the comparison target. When you find a pattern that smells off, ask: **does the exemplar do this differently?** If yes, flag it.

## Phase 4: Run the linter, then the mechanical scans

### The linter first

`@foldkit/oxlint-plugin` ships 24 AST rules covering much of what this audit
grades: keyed mapped rows, no array-index keys, hard-coded route strings,
empty-object tagged calls, `Rel` on external links, spread inside `evo`, `Got*`
wrapping of child output, PascalCase `Command.define` bindings, Mount factories
that ignore their element, module-level mutable state, and `NoOp` Messages. They
parse the code, so they catch what a grep misses.

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
- If yes, evaluate the justification. Is it real, or defensive rationalization? Common false-justifications: "would require duplicate state" (most `@foldkit/ui` components have small inline-constructable models, and the controlled render helpers have none at all), "the interaction is too custom" (the `toView` callback handles arbitrary HTML), "we don't want to wire toParentMessage" (that's the unavoidable cost of a11y-correct interactive widgets, paid once per use).
- If no NOTE, it's a finding.

Mechanical scans catch the cheap stuff. They're the floor of the audit, not the ceiling.

## Phase 5: Structural review

Walk every category in [`../generate-program/checklist.md`](../generate-program/checklist.md) against the code. Every category, every item, against the actual files.

### Parallelize via subagents (Tier 4+)

For non-trivial audits, parallelize. Spawn subagents in a single message so they run concurrently. Each owns one dimension and reads the canonical reference plus the relevant audited files in parallel.

Use `Agent` with `subagent_type: general-purpose`. Suggested fan-out:

- **Subagent A (Structural correctness)**. Model schema completeness, Message union coverage, `Message.match` exhaustiveness, every `Succeeded*` paired with `Failed*`, every Command identity defined as a PascalCase constant via `Command.define`, every route variant rendered, no dead state variants. Native web components bound via `CustomElement.define`, not via `OnMount` + Subscription + tag-name registry. Flag any custom element wired through `OnMount` when its surface is just typed properties + observed attributes + dispatched `CustomEvent`s.
- **Subagent B (Effect-TS idioms)**. `pipe` only for multi-step (no single-op pipes), `Option.match` over `Option.map(...).pipe(Option.getOrElse(...))`, `Array.match` for empty/non-empty branching, `Array.match` over `.length === 0` / `.length > 0` for branching on a Model array (the `isArrayEmpty` / `isArrayNonEmpty` predicates take a mutable `Array<A>` and reject `ReadonlyArray`), `evo` over spread, point-free `evo` setters when they only transform the current field, callable constructors over `as Type`, `Array.fromOption` for "zero or one Command", `Equal.equals` in predicates, no `Effect.ignore` on infallible Effects. Also: `AsyncData` over a hand-rolled remote-data union, and the update return type aliased once per file rather than repeated inline at the signature and again inside `M.withReturnType<...>()`. `Update.Return` is the preferred spelling for new code. A hand-written plain-return alias must include `outMessage?: never`. See `repeated-scaffolding` in blindSpots.md.
- **Subagent C (Naming and decomposition)**. `maybe*` reserved for `Option<T>`, `is*` for booleans, no opaque abbreviations or unexplained single-letter names, conventional domain shorthand allowed, `Updated*` not `Changed*`, `Completed*` mirrors Command name verb-first, named helpers use specific verbs not generic ones, handlers over ~15 lines extracted, view branches over ~30 lines extracted, no function exceeds ~40 lines.
- **Subagent D (Foldkit UI and accessibility)**. Hand-rolled `input` / `textarea` / `button` / `dialog` flagged unless NOTE-justified, label/input pairing via `For(id)` + `Id(id)`, dynamic errors announce via `Role('alert')` or `AriaLive('polite')`, icon-only buttons have `AriaLabel`, external links carry `Rel('noopener noreferrer')`, exactly one `h1` per route, semantic landmarks (`main`, `nav`, `header`, `footer`) over `div` soup, focus visibility preserved (no `outline-none` without `focus-visible:` replacement).
- **Subagent E (Testing, Tier 3+)**. `story.test.ts` exists with `story` pipelines, every fallible Command tested for both `Succeeded*` and `Failed*` paths, at least one multi-step interaction test, Submodel tests assert `outMessage`, Commands resolved via `Command.resolve(Definition, resultMessage)` not by running Effects directly. **`scene.test.ts` is REQUIRED at Tier 3+** and is a BLOCKER if absent. Each `scene` block must contain at least one `expect(...)` or interactive resolution. Locators must be accessible (`role`, `label`, `text`) over `placeholder` or CSS selectors.

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
- **Structural fixes** (handler extraction, Submodel introduction, view decomposition, replacing hand-rolled widgets with `@foldkit/ui` components): offer one at a time, confirm each, show the diff before applying.
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

| Focus           | Subagents                                                                                                                                            | Blind spots                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `a11y`          | D                                                                                                                                                    | `hand-rolled-widgets`, `a11y-gaps`, `aria-role-confusion`                                                                                                            |
| `effects`       | B                                                                                                                                                    | `repeated-scaffolding`, `functions-doing-two-things`, `effect-module-inconsistency`, `stuttery-evo-setters`, `hand-rolled-async-state`, `manual-cache-orchestration` |
| `naming`        | C                                                                                                                                                    | `naming-drift`, `messages-naming-the-effect`, `view-named-after-namespace`                                                                                           |
| `decomposition` | C                                                                                                                                                    | `repeated-scaffolding`, `functions-doing-two-things`                                                                                                                 |
| `forms`         | D + form-specific (`Input` / `Textarea` adoption, fieldValidation usage, label/input pairing)                                                        | `hand-rolled-widgets`, `a11y-gaps`                                                                                                                                   |
| `routing`       | A + routing-specific (bidirectional parser usage, route views as identity boundaries with no keyed route branches, `urlToString` in `Internal` case) | `hard-coded-route-paths`, `data-derived-keys`                                                                                                                        |
| `subscriptions` | A + subscription-specific (`Subscription.make` shape, `{}` fields for always-active, message mapping inside `Stream.map`)                            | `state-machine-edges`                                                                                                                                                |
| `testing`       | E                                                                                                                                                    | `missing-scene-test`                                                                                                                                                 |
| `submodels`     | A + submodel-specific (Got\* wrapping, optional `outMessage` returns, parent ↔ child Message isolation)                                              | `flat-parent-message-union`, `view-named-after-namespace`                                                                                                            |
| `types`         | (inline) type-shape and aliasing                                                                                                                     | `array-type-syntax`, `unearned-type-aliases`, `hand-rolled-async-state`                                                                                              |

For focused audits, skip Phase 4's full grep block and run only the greps relevant to the focus (e.g. for `a11y`, run `label without For`, `outline-none without focus-visible`, and the `_blank` scan, reading each hit's attribute block for `Rel`).
