# Post-Generation Verification Checklist

Run through each category after generating an app. Fix any issues before presenting the result.

> **This is the canonical reference for mechanical checks.** `SKILL.md` phases 4.5, 5, and 5.5 point here rather than duplicating the grep commands inline, to prevent drift. If you update a grep or add a new one, update it here — the phases will inherit the change.

## Gate commands (run ALL FOUR; fix everything they surface)

- [ ] `npm run format` (or `npx prettier -w .`) — run FIRST; rewrites files so subsequent gates see the committed shape.
- [ ] `npm run lint` (or `npx eslint .`) — output clean. Catches unused imports, unused vars, style-rule violations that `tsc` does not.
- [ ] `npm run typecheck` (or `npx tsc --noEmit`) — no errors.
- [ ] `npm run test` (or `npx vitest run`) — all tests pass.

"Typecheck clean and tests pass" is NOT sufficient. Generated code is rarely Prettier-exact out of the box, and frequently has unused imports (`Invalid`, `NotValidated`, `Valid` imported as values when only used as string-literal tag keys in `M.tag(...)`) that only the linter catches. Skipping either means the user's first `git commit` produces a cascade of formatting/lint fixes they have to clean up.

## Mechanical scans (run on every file before tsc)

These are the fast greps that catch the common write-time violations. Run them against `src/`. Each hit is either a fix or a `// NOTE:` justification — silent hits aren't allowed. Phase 4.5 of SKILL.md runs this block; the reviewer in Phase 6 runs it again as sanity.

```bash
# Empty-object constructor calls — no-field tagged structs should call with no arg
grep -rn "({})" src/

# Hard-coded route paths — use router() / router({params}) instead of template strings
grep -rn "Href('/" src/
grep -rn "navigateInternal('/" src/

# Hand-rolled form inputs — should use Ui.Input.view / Ui.Textarea.view
grep -rn "^\s*input(\[" src/
grep -rn "^\s*textarea(\[" src/

# Hand-rolled buttons — should use Ui.Button.view (except inside a Ui.Button toView callback,
# where ...attributes.button is present). A `button(` line without `...attributes.button` is
# almost always a hand-rolled button that should go through Ui.Button.
grep -rn "^\s*button(" src/

# Option ceremony — Array.findFirst(...)._tag === 'Some' should be Array.some(...)
grep -rn "Array\.findFirst.*_tag" src/

# Unkeyed list rows — li/div inside Array.map over domain entities should use keyed()
# to avoid positional-patch bugs when items are added/removed/reordered.
# Look for: Array.map(items, item => li(...))  — should be keyed('li')(item.id, ...)
grep -rn "Array\.map.*=>\s*\(li\|div\)" src/
grep -rn "^\s*return li(" src/    # row-renderer helpers
grep -rn "^\s*return div(" src/   # same for div-based rows

# Scene tests without assertions — Scene.scene(...) calls that only do Scene.with()
# and nothing else verify only that the view doesn't throw. Each test needs at least
# one Scene.expect(...) OR a Scene.click/type/submit followed by Scene.resolve(...).
# Eyeball every Scene.scene block — if it contains no "Scene.expect" and no "Scene.resolve",
# it's a no-op test.
grep -rn "Scene.scene(" src/ -A 3 | grep -B 2 "Scene.with" | grep -v "Scene.expect\|Scene.resolve\|Scene.click\|Scene.type" || echo "(all Scene.scene blocks appear to contain assertions)"

# Single-op pipe — pipe(x, Option.match(...)) should be Option.match(x, ...)
# These are common patterns; eyeball each hit.
grep -rn "pipe([a-zA-Z_]*,\s*$" src/ -A 1 | grep "Option\.match\|Array\.map\|Effect\.runSync"

# Length checks — use Array.match / Array.isNonEmptyArray / String.isNonEmpty
grep -rn "\.length > 0\|\.length === 0\|\.length !== 0" src/

# Raw spread inside evo — use nested evo instead
grep -rn "evo(.*, {" src/ -A 3 | grep "\.\.\."

# as casts on constructor returns — constructors already return the right type
grep -rn " as [A-Z][a-zA-Z]*State\b\| as [A-Z][a-zA-Z]*Message\b" src/

# Labels without For — should pair with Id on input, or use Ui.Input
grep -rn "label(\[" src/ | grep -v "For("

# maybe* on non-Option — should be nullable* or Option<T>
grep -rn "maybe[A-Z][a-zA-Z]*: [A-Z][a-zA-Z]* | undefined" src/
grep -rn "maybe[A-Z][a-zA-Z]*: string\b\|maybe[A-Z][a-zA-Z]*: number\b\|maybe[A-Z][a-zA-Z]*: boolean\b" src/

# span([], []) — use empty from html<M>()
grep -rn "span(\[\], \[\])" src/

# Effect.ignore on infallible Effects (pushUrl, load, back, forward)
grep -rn "pushUrl.*Effect\.ignore\|load(.*)\.pipe.*Effect\.ignore" src/

# _blank links missing Rel (fast scan; multi-line matches need eyeballing)
grep -rn "Target('_blank')" src/ -A 2 | grep -B 1 "Rel(" || echo "(all _blank have Rel, or none are used)"

# outline-none without focus-visible replacement
grep -rn "outline-none" src/ | grep -v "focus-visible:"
```

Alongside the greps, eyeball each file's imports. Every symbol you imported should be called. ESLint flags this, but so do you — at write-time.

## Structural completeness

- [ ] Every `m()` declaration is included in the `S.Union`
- [ ] Every union member has a case in `M.tagsExhaustive` in update
- [ ] Every route variant has a corresponding view branch
- [ ] Every `Succeeded*` has a paired `Failed*`
- [ ] Every discriminated union variant is handled in both update and view

## Purity

- [ ] update function has no side effects (no DOM, no randomness, no I/O)
- [ ] view function has no side effects
- [ ] init function has no side effects (returns Commands for startup work)
- [ ] No `let` declarations anywhere
- [ ] No mutation (`.push()`, `.splice()`, object mutation)
- [ ] No `Effect.runSync` / `Effect.runPromise` outside of Commands

## Commands

- [ ] Every Command identity defined with `Command.define` and assigned to a PascalCase constant
- [ ] Every `Command.define` includes result Message schemas after the name
- [ ] No inline `Command.define` in pipe chains — always stored as a constant
- [ ] Definitions colocated with the update that produces them
- [ ] Every _fallible_ Command catches all errors: `Effect.catch(() => Effect.succeed(FailedX(...)))`. Infallible Effects (Clock, Random, Task.uuid, Task.getTime) do NOT need catch — if the type system shows no error channel, there's nothing to catch, and no paired `Failed*` Message is needed either.
- [ ] Return types inferred — no explicit `Command<typeof A>` annotations
- [ ] Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- [ ] Fire-and-forget Commands return `Completed*` Messages

## Naming

- [ ] Messages are past-tense, verb-first
- [ ] Input changes use `Updated*` prefix (e.g. `UpdatedEmail`), not `Changed*`
- [ ] `Completed*` uses verb+object order: `CompletedFocusInput` not `CompletedInputFocus`
- [ ] Option fields prefixed with `maybe`
- [ ] Boolean fields prefixed with `is`
- [ ] No abbreviations anywhere
- [ ] Constants for all magic numbers
- [ ] Schema literals are capitalized: `S.Literals(['Active', 'Inactive'])`

## State modeling

- [ ] Discriminated unions for multi-valued state (not booleans)
- [ ] `Option` for absent fields (not empty strings, null, or zero)
- [ ] Impossible states are unrepresentable
- [ ] `ts()` for non-Message tagged structs (Model states, route variants)
- [ ] `m()` only for Message variants

## Effect-TS patterns

- [ ] `pipe()` only for multi-step chains (not single operations)
- [ ] `M.tagsExhaustive` for all Message/state matching (no switch)
- [ ] `Array.isEmptyArray` / `Array.isNonEmptyArray` (not `.length === 0` or `.length > 0`)
- [ ] `evo()` for Model updates (not spread)
- [ ] Callable constructors (not `as` casts or manual `_tag` objects)
- [ ] No-field tagged structs called with NO argument: `Idle()`, `Work()`, `ClickedSubmit()` — never `Idle({})`, `Work({})`, `ClickedSubmit({})`
- [ ] `Option.match` preferred over `Option.map` + `Option.getOrElse`

## View

- [ ] `keyed` wrappers on layout branches (route-based or state-based)
- [ ] Events dispatch Messages, never perform actions directly
- [ ] Semantic HTML elements (`main`, `nav`, `section`, `article`, `header`, `footer`)

## Foldkit UI

- [ ] Foldkit UI components used where interaction matches (Dialog, Tabs, Menu, Combobox, DatePicker, FileDrop, Toast, Tooltip, DragAndDrop, etc.) — never hand-roll accessible widgets
- [ ] **Form inputs use `Ui.Input.view`, `Ui.Textarea.view`, `Ui.Button`.** Hand-rolled `input`/`textarea`/`button` elements in a form are a fail unless the file has a NOTE comment explaining why the component couldn't be used.
- [ ] Each UI component has its Model in the app Model, a `Got*` Message, init in init, and delegation in update
- [ ] `Ui.Toast` uses `Ui.Toast.make(PayloadSchema)` to bind to a consumer-defined payload type
- [ ] No custom keyboard navigation or ARIA attributes for patterns covered by Foldkit UI components

### Mechanical check: no hand-rolling

Run these greps against `src/`. Each should return zero matches (or only matches inside a `NOTE:` justification):

```bash
grep -rn "^\s*input(\[" src/            # raw <input> — should use Ui.Input
grep -rn "^\s*textarea(\[" src/         # raw <textarea> — should use Ui.Textarea
grep -rn "OnClick(.*) .*button(" src/   # raw <button> with click handler — should use Ui.Button
grep -rn "role.*dialog\|role.*menu" src/  # hand-rolled ARIA — should use Ui.Dialog / Ui.Menu
```

The rule: **if the interaction pattern appears in the Ui.\* component table (Phase 2.5 of SKILL.md), use the component.** Hand-rolling is permitted only when: (a) the component doesn't exist yet, AND (b) you add a `// NOTE: hand-rolling because <specific reason>` comment above the element. Without the NOTE, the reviewer treats hand-rolling as a BLOCKER — not a style preference.

**A NOTE is not a free pass.** Before writing one, read the component's `.d.ts` and confirm the concern is real. Common false-justifications to avoid:

- _"Using the Ui component would require a per-row Model instance and duplicate state"_ — check the component's Model shape. Most Ui components (Checkbox, Switch) have small Models (`{ id, isChecked }`) that can be constructed inline from derived state: `Ui.Checkbox.view({ model: { id: ..., isChecked: derivedFromState }, toParentMessage: () => MyMessage(...), ... })`. No app-Model entry needed. The component's internal `update` is never called; your update dispatches your own Message when `toParentMessage` fires.
- _"The component needs a toParentMessage and I don't want to wire one"_ — that's always the wiring cost. The whole point of Ui components is that you pay it once per use and get a11y for free.
- _"The interaction is too custom for the component"_ — check the `toView` callback signature. It lets you render whatever HTML you want inside the component's attribute-scaffolding. Custom visual = fine, custom a11y = never needed.

Reviewers should challenge every NOTE: "Is this justification actually true, or is it defensive rationalization? What does the `.d.ts` say?" Look up the component's actual API before accepting the NOTE.

## Accessibility

Foldkit UI components ARE the a11y pass for their covered patterns. These checks apply to anything NOT covered by a Ui.\* component (raw inputs in a custom context, static content, custom layouts) and to the overall document structure.

- [ ] Exactly one `h1` per route. Headings descend without skipping levels (no `h3` without an `h2` above it).
- [ ] Semantic landmarks used: `main`, `nav`, `header`, `footer`, `aside`, `section`. Not `div` soup.
- [ ] Every `label` is associated with its input: `label([For('email-input')], ['Email'])` paired with `input([Id('email-input'), ...])`. Or use `Ui.Input.view` which handles the association. Grep for `label([` followed by no `For(` → should be zero.
- [ ] Every `input`, `textarea`, and `select` has either an associated `label` OR an explicit `AriaLabel(...)`. Unlabeled form fields are a fail.
- [ ] Icon-only buttons have `AriaLabel(...)` describing the action. `button([OnClick(...)], ['★'])` without an aria label is unreadable to screen readers.
- [ ] Dynamic error messages wrap in `role="alert"` (for immediate errors) or `aria-live="polite"` (for non-urgent updates). Validation errors that appear after blur should be announced. Example: `p([Role('alert'), ...], [errorMessage])`. Grep for error-class CSS (e.g. `text-red`) and verify each error container has `Role('alert')` or a parent with `AriaLive('polite')`.
- [ ] External links (`Target('_blank')`) also have `Rel('noopener noreferrer')`.
- [ ] Images have `Alt(...)`. Decorative images use `Alt('')` explicitly — never omitted.
- [ ] Interactive lists (navigable items, selectable rows) use `ul`/`ol` + `li`, not `div` stacks. Screen readers announce "list with N items" for real lists.
- [ ] Required form fields are marked `AriaRequired(true)` OR the `Ui.Input` `required: true` is set. The `required` HTML attribute alone is not enough for every screen reader.
- [ ] Focus is visible — either via Tailwind's `focus-visible:` classes or the browser default. If you've reset outline, you must replace it. Grep for `outline-none` without a paired `focus-visible:` class.
- [ ] Color is not the only carrier of meaning. A red border on an invalid input needs an accompanying error message or icon. Don't ship "invalid = red only."
- [ ] Page `<title>` is set via `Runtime.makeProgram`'s `title: model => ...` for routed apps. Each route returns a distinct title.

### Mechanical check: a11y

The greps below are **fast starting scans**, not authoritative. Attributes often span multiple lines (`Target('_blank')` on line N, `Rel('noopener noreferrer')` on line N+1), so line-only matches can false-positive. Every hit should be eyeballed in context before flagging it as a bug — but every hit DOES need to be eyeballed.

```bash
grep -rn "label(\[" src/ | grep -v "For("                # labels without For
grep -rn "Target('_blank')" src/ -A 2 | grep -B 1 "Rel("  # _blank paired with rel
grep -rn "outline-none" src/ | grep -v "focus-visible:"  # killed focus outline without replacement
```

For a precise check, read each matching attribute block end-to-end. Alternatively, convert to a short AST-level scan or a structural lint rule; those are the real defense. The greps are for catching obvious misses in under a second.

Each confirmed miss is a concrete a11y bug a screen reader user would hit.

## Forms, dates, and files

- [ ] Form validation uses `foldkit/fieldValidation` (`Field`, `makeRules`, `validate`, `allValid`) — no hand-rolled `Valid | Invalid` unions when validation is the concern
- [ ] Date handling uses the `Calendar` module (`Calendar.CalendarDate`, `Calendar.today.local`) — no raw `Date` objects in Model
- [ ] File handling uses the `File` module with `Ui.FileDrop` — no direct `File` API usage in update/view

## File organization

- [ ] Message layout follows four-group convention (values, union + type)
- [ ] Section headers used in single-file apps: `// MODEL`, `// MESSAGE`, etc.
- [ ] Complex update handlers extracted to separate functions
- [ ] view decomposed when branches exceed ~30 lines

## Testing

**Story tests** (required at every tier):

- [ ] `main.story.test.ts` (or `update.test.ts`) exists with `Story.story` pipelines
- [ ] Every fallible Command (`Succeeded*`/`Failed*` pair) tested for both outcomes
- [ ] At least one multi-step test that chains Messages and Command resolutions
- [ ] Submodel tests assert `outMessage` when the child signals to parent
- [ ] Tests use `Story.resolve(Definition, resultMessage)` — never run Command Effects directly in story tests
- [ ] All tests pass with `npx vitest run`

**Scene tests** (REQUIRED at Tier 3+; strongly encouraged at Tier 2):

For Tier 3+ apps (routing, async Commands, forms), missing `main.scene.test.ts` is a **BLOCKER** — the app has not been tested from the user's perspective without it.

- [ ] `main.scene.test.ts` exists
- [ ] View rendering test — initial view has expected elements (headings, inputs, buttons)
- [ ] User interactions test — click, type, submit produce visible changes
- [ ] At minimum one test per discriminated-union state that has distinct view output (loading, error, empty, populated)
- [ ] Uses accessible locators: `Scene.role(...)`, `Scene.label(...)`, `Scene.text(...)`. Not `Scene.placeholder` or CSS selectors.
- [ ] Scoped queries with `Scene.within` or `Scene.inside` when a parent container contains multiple similar elements

---

# Quality Bar (beyond "it works")

The sections above cover correctness. The sections below cover the craft details that distinguish typing-game / website quality from generic valid code. The bar is: would a careful reader believe this was hand-written by the authors of `packages/typing-game/client/src/` or `packages/website/src/`? If not, keep working.

**Tier-aware:** every item below applies at every tier UNLESS marked otherwise:

- `[T2+]` — applies once the app has subscriptions or persisted state
- `[T3+]` — applies once the app has async Commands or routing
- `[T5+]` — applies once the app has nested domain state, multiple entities, or submodels

Items without a tier marker apply universally (even to a 50-line counter). When in doubt, assume universal.

## Decomposition

- [ ] Every function operates at a single abstraction level — orchestrators delegate, implementations implement. If a function reads like it's doing two things, extract one.
- [ ] **Update handlers over ~15 lines are extracted** to named functions in the same file. [T3+] If a handler exceeds ~50 lines, extract to its own file under `src/update/` (e.g. `update/handleRoomUpdates.ts`).
- [ ] **Extracted handlers are curried `(model: Model) => (message: M) => UpdateReturn`** so they compose in pipelines — not `(model, message) => UpdateReturn`. See `packages/typing-game/client/src/page/home/update/handleKeyPressed.ts:33-40`.
- [ ] **View branches over ~30 lines are extracted** to named view functions (e.g. `enterUsernameView`, `selectActionView`). [T5+] If the view for a single route/state exceeds ~100 lines, extract to `src/view/` or `src/page/*/view.ts`.
- [ ] No function exceeds ~40 lines without extraction. Long functions are the primary smell.

## Effect module usage (consistency, not correctness)

- [ ] Native methods replaced with Effect equivalents _in pipe chains_: `Array.map(items, f)` not `items.map(f)` when composing; `String.startsWith(s, 'foo')` in a pipe not `s.startsWith('foo')`.
- [ ] `Option.match({ onNone, onSome })` preferred over `Option.map(...).pipe(Option.getOrElse(...))`. The labeled branches are self-documenting.
- [ ] `Array.match({ onEmpty, onNonEmpty })` when handling both empty and non-empty cases. Not `isEmptyArray ? ... : ...` ternaries. Grep for `.length > 0` and `.length === 0` on arrays and strings — should be zero. Use `Array.isNonEmptyArray` / `String.isNonEmpty` for pure checks, `Array.match` for branching renders.
- [ ] `Equal.equals(target)` in predicates: `Array.findFirst(items, Equal.equals('Other'))` not `item => item === 'Other'`.
- [ ] `Array.fromOption(maybeCommand)` for "zero or one command based on Option" — not `Option.match` that returns `[]` vs `[cmd]`.
- [ ] `OptionExt.when(condition, value)` instead of `condition ? Option.some(value) : Option.none()`.
- [ ] `pipe(...)` is multi-step only. Never `pipe(x, singleOp(...))` — call `singleOp(x, ...)` directly. (Exception: `.pipe(Effect.catch(...))` as a tail suffix is fine.)
- [ ] When piping, data leads on its own line: `pipe(\n  data,\n  Array.map(f),\n  ...\n)` — not `pipe(data, Array.map(f), ...)`.
- [ ] Callback destructuring when accessing a single field: `({ id }) => id === cardId` not `card => card.id === cardId`.

## Domain organization [T5+]

- [ ] **If the app has multiple domain entities referenced across modules, they live in `src/domain/`**, not inline in `model.ts`. One file per concept (`domain/column.ts`, `domain/card.ts`), with `domain/index.ts` as a barrel re-exporting each via namespaced re-export (`export * as Column from './column'`).
- [ ] **Pure domain logic lives in `domain/*.ts`**, not in update handlers. Examples: `Column.reorder(columns, from, to)`, `Cart.totalPrice(items)`. If the update is doing array surgery on domain entities, that surgery belongs in the domain module.
- [ ] Domain files export schemas AND pure operations on those schemas. Update calls the operations; it doesn't reimplement them.
- [ ] Domain modules never import from `model.ts`, `update.ts`, `view.ts`, or `message.ts`. Domain is the leaf layer.
- [ ] References: `examples/kanban/src/domain/`, `examples/job-application/src/domain/`, `examples/shopping-cart/src/domain/`.

## Naming precision

- [ ] Every Option-typed value is prefixed `maybe*`: `maybeCurrentUser`, `maybeFocusUsernameInput`, `maybeOutMessage`, `maybeNewCardColumnId`. No exceptions.
- [ ] Every native `T | undefined` is prefixed `nullable*`. No `maybe*` for nullable; that's reserved for `Option`. Grep `maybe[A-Z]` against function signatures and variable types — each hit should be `Option<T>`, not `T | undefined`.
- [ ] Internal API boundaries (helper function configs, view builders, domain operations) use `Option<T>` for optional fields, not `T | undefined`. Call sites then read `Option.some(x)` / `Option.none()` instead of `x` / `undefined`. The `T | undefined` form is only acceptable at framework boundaries (React props, vendored library configs, JSON decoding) that already use it.
- [ ] Boolean fields prefixed `is*`: `isPlaying`, `isDismissed`, `isMenuOpen`.
- [ ] Command function names are verbs describing the action: `fetchWeather`, `focusButton`, `scrollToItem`. Never `fetchWeatherCommand` or `weatherFetcher`.
- [ ] Command `define` names are verb-first PascalCase imperatives: `FetchWeather`, `FocusButton`, `LockScroll`.
- [ ] Message names are verb-first past-tense: `ClickedSubmit`, `UpdatedEmail`, `SucceededFetchWeather`. Never noun-first (`SubmitClicked`) or imperative (`FetchWeather` as a Message).
- [ ] `Completed*` Messages mirror the Command name verb-first: Command `LockScroll` → Message `CompletedLockScroll`. Never `CompletedScrollLock`.
- [ ] Named helpers use specific verbs, not generic ones: `enqueueMessage` not `addMessage`, `announceKeyboardDrag` not `announce`, `whenSelectAction` not `handleSelect`. The verb eliminates ambiguity.
- [ ] No abbreviations anywhere: `signature` not `sig`, `tickCount` not `t`, `message` not `msg`, `index` not `i`. Callback parameters included.

## File structure and exports

- [ ] Each source file exports only its public contract: typically `Model`, `Message`, `init`, `update`, `view`, plus named schemas/constants other modules consume. Internal helpers are not exported.
- [ ] Section headers present in files that span multiple sections: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// COMMAND`, `// VIEW`, `// RUN`. Order: Model → Message → Flags (if any) → Init → Update → Command → View → Run.
- [ ] `index.ts` is always a barrel, never implementation. If a module `foo/` has code, the shape is `foo/foo.ts` for code + `foo/index.ts` for `export * from './foo'` and `export * as Child from './child'`.
- [ ] Imports ordered: npm packages first (alphabetized), then `foldkit/*`, then relative imports. No mixed groups.
- [ ] Message definitions exported individually AND as the `Message` union type when used across modules. Internal-only messages stay unexported.

## Submodel and Command extraction [T5+]

- [ ] [T5+] If the app has multiple Submodels, each has its own directory with at minimum `main.ts` (init/update/view), `message.ts` (messages + OutMessage schema), and optionally `command.ts` (submodel Commands).
- [ ] [T3+] If update returns Commands across multiple handlers AND the Commands involve non-trivial Effect pipelines (HTTP, Task compositions), Commands are defined in their own `command.ts` file, not inline in update.
- [ ] Command factories are pre-wrapped and named by action: `const fetchWeather = (city) => ...` returns the Command-wrapped Effect. Call sites read as `[fetchWeather(city)]`, not `[FetchWeather(Effect.gen(...))]`.
- [ ] [T5+] OutMessage unions are explicitly tagged with `// OUT MESSAGE` section comment when they appear in a submodel `message.ts`.

## Subscriptions [T2+]

- [ ] Subscriptions use `Subscription.makeSubscriptions(Deps)<Model, Message>` with a dedicated `Deps` Schema.
- [ ] `modelToDependencies` extracts exactly the data the stream needs from Model — not the full Model. Returns `Option.none()` when the subscription should stop.
- [ ] Always-active subscriptions use `S.Null` as the Deps type and return `null` from `modelToDependencies`.
- [ ] Message mapping happens inside `Stream.map(event => Effect.succeed(UpdatedX({ data: event })))`, not scattered through update.
- [ ] Subscription files live at `src/subscription.ts` (or `src/subscription/` directory for multiple), never inline in `main.ts`.

## Testing quality

- [ ] Test names state the behavior being tested: `it('surfaces a validation error when email is malformed')`, not `it('tests validation')` or `it('handles the reported bug')`.
- [ ] Each `Story.story` pipeline reads as a narrative — initial model → action → assert → action → assert. Not a dump of unrelated assertions.
- [ ] Scene tests use accessible locators — `Scene.role('button', { name: /submit/i })`, `Scene.label('Email')` — over `Scene.placeholder` or CSS selectors.
- [ ] Commands in tests are resolved with `Story.resolve(Definition, resultMessage)`. Never run Command Effects directly.

## Residual code smells (each is a fail)

- [ ] No `console.log`, `console.error`, or any `console.*` outside of test fixtures.
- [ ] No commented-out code blocks. Delete, don't comment.
- [ ] No TODO/FIXME/XXX comments in generated code. If something's incomplete, it shouldn't ship.
- [ ] No `any` types. No `as` casts except where Schema decoders require them at boundaries (and those should be vanishingly rare).
- [ ] No `let` outside tight imperative loops where mutation is genuinely unavoidable (rare — usually `Array.reduce` or `Array.makeBy` replaces it).
- [ ] No inline magic numbers in logic: `if (count > 5)` → `const FINAL_PHOTO_INDEX = 5; if (count > FINAL_PHOTO_INDEX)`.
- [ ] No dead code, unused imports, unused exports, or stub types (`type Foo = {}`).
- [ ] No `globalThis.*` references. Use Effect equivalents.
- [ ] No `T[]` syntax; always `Array<T>` or `ReadonlyArray<T>`.

## Final exemplar comparison

Pick one generated file at random and read it next to the equivalent file in `packages/typing-game/client/src/` or `packages/website/src/page/`. Ask:

- Does the generated file look like it was written by the same hand? If you swapped it into the exemplar's directory, would a reader notice?
- Does the decomposition feel inevitable, or arbitrary?
- If you removed any line, would a reviewer miss it?

If the answer to any of those is "no" or "I'd notice," flag the file for another pass.
