# Post-Generation Verification Checklist

Run through each category after generating an app. Fix any issues before presenting the result.

> **This is the canonical reference for mechanical checks.** `SKILL.md` phases 4.5, 5, and 5.5 point here rather than duplicating the grep commands inline, to prevent drift. If you update a grep or add a new one, update it here. The phases will inherit the change.
> Example paths assume a consumer project with the Foldkit subtree vendored at `repos/foldkit/`. Working inside the Foldkit repo itself, drop that prefix; the same paths exist at the project root.

## Gate commands (run ALL FOUR; fix everything they surface)

- [ ] `format`: run FIRST; rewrites files so subsequent gates see the committed shape. The scaffold wires prettier.
- [ ] `lint`: output clean. This is the substantive structural gate, not just a style pass: the scaffold wires oxlint **and** `@foldkit/oxlint-plugin`, whose 24 `foldkit/*` rules enforce keyed rows, route printing, `Got*` wrapping, Command naming, and more. Treat any `foldkit(...)` diagnostic as a blocker; that is how they are labelled in the output. It also catches the unused imports `tsc` does not.
- [ ] `typecheck`: no errors. The scaffold wires `tsc --noEmit`.
- [ ] `test`: all tests pass. The scaffold wires vitest.

The project's configured script is the contract for each gate; the tools named
are what `create-foldkit-app` happens to wire up. If a project swapped one out,
run its script, not the tool named here.

Invoke each through the package manager the project was scaffolded with (`npm run lint`, `pnpm run lint`, `yarn lint`, `bun run lint`). If a script is missing, run the project-local binary through that manager's exec (`pnpm exec oxlint src`, `npm exec --no-install oxlint src`, `yarn exec oxlint src`, `bun x --no-install oxlint src`). Avoid bare `npx`, which fetches from the registry when the binary isn't installed locally.

"Typecheck clean and tests pass" is NOT sufficient. Generated code is rarely Prettier-exact out of the box, and frequently has unused imports (`Invalid`, `NotValidated`, `Valid` imported as values when only used as string-literal tag keys in `M.tag(...)`) that only the linter catches. Skipping either means the user's first `git commit` produces a cascade of formatting/lint fixes they have to clean up.

## Mechanical scans (run on every file before tsc)

**Run the linter before any of these.** `@foldkit/oxlint-plugin` ships 24 AST
rules, all `error` in its `recommended.json`, and `create-foldkit-app` installs
and wires it, so `npm run lint` already enforces them in a scaffolded project.
Those rules are the real structural check: they parse the code instead of
matching text, so they don't miss a wrapped call or a renamed helper the way a
grep does. Confirm the rules are actually active rather than that the package is named
somewhere, and read the config to confirm it rather than the lint output: a
monorepo or vendored setup wires the plugin by path specifier under `jsPlugins`
and never extends `recommended.json`. Diagnostics are labelled
`foldkit(rule-name)`, so grepping for `foldkit/` finds nothing even when every
rule is running, and a run with zero `foldkit(` matches is what a passing project
looks like. Never read a quiet lint run as the rules being off.
If the rules aren't active, turning them on is a bigger win than any scan below.

Among others, the plugin enforces keyed mapped rows, hard-coded route strings,
empty-object tagged calls, `Rel` on external links, spread inside `evo`, `Got*`
wrapping of child output, PascalCase `Command.define` bindings, and no `NoOp`
Messages. Don't re-implement a rule wholesale.

**A rule being green is not the same as the subject being clean.** Several rules
are deliberately narrow, and the greps below deliberately cover their edges. Each
such grep says which rule it complements and where that rule stops. Note also
that `recommended.json` turns every rule off for `**/*.test.ts` and
`**/*.test.tsx`, so the linter
contributes nothing to test files; Scene and Story shape is on you.

The rest of the block covers ground no rule touches: API drift where a name moved
between packages, `@foldkit/ui` component adoption, Effect idiom, a11y detail,
and test shape. Each hit is either a fix or a `// NOTE:` justification. Silent
hits aren't allowed. Phase 4.5 of SKILL.md runs this block; the reviewer in
Phase 6 runs it again as sanity.

```bash
# Empty-object constructor calls. foldkit/no-empty-object-tagged-call covers bare
# constructors and `Message.*` calls. Other namespace calls such as
# `Todo.ClickedDelete({})` are unflagged.
grep -rn "({})" src/

# External links missing Rel. foldkit/require-rel-for-external-link bails when the
# attribute array contains a spread, so `h.a([...baseAttrs, Target('_blank')], ...)`
# is unflagged. Read each hit's attribute block for Rel.
grep -rn "_blank" src/

# `as` casts on constructor returns. Rejected by oxlint's
# typescript/consistent-type-assertions, which the SCAFFOLD sets but
# recommended.json does not, so a project that only extends recommended.json has
# no coverage here.
grep -rn " as [A-Z][a-zA-Z]*State\b\| as [A-Z][a-zA-Z]*Message\b" src/

# Unkeyed list rows. foldkit/keyed-required-for-mapped-rows is narrow by design:
# it fires only when the callback references `.id` (or destructures a property
# literally named `id`) AND the row element is one of li/div/tr/article/section.
# Rows keyed on slug/name/uuid, or rows returning h.a / h.button / a component
# call, pass it silently. This triage covers those: it lists files that map a list
# and bind a per-item handler, with map-site and keyed counts. Read every map site
# in a listed file: one keyed row does not clear it, since a file can key one
# list and leave a second unkeyed.
for f in $(grep -rl "Array\.map(\|\.map(" src/); do
  grep -qE "OnClick\(|OnInput\(|OnChange\(|onClick:|onInput:|onChange:" "$f" || continue
  echo "READ MAP SITES: $f (maps=$(grep -c 'Array\.map(\|\.map(' "$f") keyed=$(grep -c 'keyed(' "$f"))"
done

# Wrong package for UI components: they come from '@foldkit/ui', and there is
# no Ui namespace on foldkit. Any Ui.Something is a stale import.
grep -rn "\bUi\.[A-Z]" src/

# Wrong origin for HttpClient. It lives in 'effect/unstable/http'. Assert that
# rather than blacklisting one wrong package: it also gets imported from 'effect'
# and from '@effect/platform', and a blacklist misses whichever one you didn't list.
# Check per FILE, not per line: `import { ... HttpClient ... } from '...'` usually
# wraps, so the name and the module specifier land on different lines and any
# single-line pattern sees neither together.
# (@effect/platform-browser is fine; that's KeyValueStore and Crypto.)
for f in $(grep -rl "HttpClient" src/); do
  grep -q "from 'effect/unstable/http'" "$f" || echo "WRONG HttpClient ORIGIN: $f"
done

# Update return type written inline at a match site instead of aliased once
# per file. Check Message.match and Effect Match sites, including wrapped
# generics. Every hit is an inline record to replace or a wrapped alias to
# inspect. Also inspect every hand-written UpdateReturn record: a plain return
# must include outMessage?: never, while an OutMessage return names its channel.
grep -rn "Message\.match<\s*$\|Message\.match<Readonly<{" src/
grep -rn "withReturnType<\s*$\|withReturnType<Readonly<{" src/
grep -rn "type UpdateReturn = Readonly<{" src/

# T[] syntax in the return type: use ReadonlyArray<Command<Message>>
grep -rn "readonly Command<.*>\[\]" src/

# Hand-rolled remote-data union: use AsyncData.Schema(Data, Error).
# Eyeball each hit; a non-remote state machine with these names is fine.
grep -rn "ts('Loading')" src/

# Stale Effect array predicate names (the real ones are isArrayEmpty /
# isArrayNonEmpty). Note both real ones take a MUTABLE Array<A>: on a Model
# field from S.Array(...) use Array.match instead.
grep -rn "isEmptyArray\|isNonEmptyArray" src/

# Array predicates applied to a Model field: won't compile on ReadonlyArray
grep -rn "isArrayEmpty(model\.\|isArrayNonEmpty(model\." src/

# Hand-rolled form controls: should use Input.view / Textarea.view / Button.view
# from '@foldkit/ui'. Views build elements off their `h` parameter, so the call
# shape is `h.input(...)`, not a bare `input(...)`; match both, and don't assume
# the element starts the line or that OnClick precedes it.
#
# Legitimate exception: inside the component's own `toView` callback you DO render
# the element, spreading the component's attribute group into it. Those calls
# contain `...attributes.input` / `...attributes.textarea` / `...attributes.button`,
# usually on a different line, so the exclusion has to be eyeballed per hit rather
# than grepped. A hit whose enclosing call has no such spread is hand-rolled.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?(input|textarea|button)\(" src/

# Spread inside evo. foldkit/no-spread-in-evo only inspects a Property whose
# value is an arrow updater, and skips bodies with a computed key, so a spread in
# the evo updates object itself is unflagged. Use a nested evo instead.
#
# Don't window this with -A: an updates object runs past any fixed number of lines,
# and piping the window through a second grep drops the file:line that would let you
# find the hit again. Narrow to files that call evo, then print every spread in them
# with its own location. Most hits are unrelated spreads (array literals, attribute
# groups); read each one's enclosing call to see whether it sits in an evo updates
# object. Few enough hits to eyeball, which listing every evo call site is not.
grep -rl "evo(" src/ | xargs grep -Hn "\.\.\."

# Option ceremony: Array.findFirst(...)._tag === 'Some' should be Array.some(...)
grep -rn "Array\.findFirst.*_tag" src/

# Scene tests without assertions: a scene(...) block that only does given(model)
# verifies the view doesn't throw and nothing else. Each block needs at least
# one expect(...) OR a click/type/submit followed by Command.resolve(...).
# Lists every scene block with its following lines. Eyeball each: if it contains
# no expect(...) and no Command.resolve(...), it's a no-op test.
grep -rnE -A 6 "(^|[^.[:alnum:]_])scene\(" src/ --include="*.test.ts"

# Single-op pipe: pipe(x, Option.match(...)) should be Option.match(x, ...)
# These are common patterns; eyeball each hit.
grep -rn "pipe([a-zA-Z_]*,\s*$" src/ -A 1 | grep "Option\.match\|Array\.map\|Effect\.runSync"

# Length checks: use Array.match on a Model array (the predicates reject
# ReadonlyArray), or String.isNonEmpty for strings
grep -rn "\.length > 0\|\.length === 0\|\.length !== 0" src/

# Stuttery evo setters: when a setter only transforms that same field, pass
# the transformer directly. Look for `field: () => f(model.field)`,
# `field: () => Array.map(model.field, f)`, or
# `field: () => Reflect.helper(model.field, ...)`.
# Prefer `field: f`, `field: Array.map(f)`, or `field: Reflect.helper(...)`.

# Labels without For: should pair with Id on the input, or use Input from
# '@foldkit/ui'. The attribute array often starts on the next line, so match the
# call and read its attribute block rather than filtering the matched line: a
# `grep -v "For("` on one line silently passes every multiline label.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?label\(" src/

# maybe* on non-Option: should be Option<T>
grep -rn "maybe[A-Z][a-zA-Z]*: [A-Z][a-zA-Z]* | undefined" src/
grep -rn "maybe[A-Z][a-zA-Z]*: string\b\|maybe[A-Z][a-zA-Z]*: number\b\|maybe[A-Z][a-zA-Z]*: boolean\b" src/

# h.span([]): use h.empty (the empty value on the view's builder `h`). The
# children argument is optional, so the placeholder has two spellings.
grep -rnE "(^|\.)span\(\[\](, \[\])?\)" src/

# Effect.ignore on infallible Effects (pushUrl, load, back, forward)
grep -rn "pushUrl.*Effect\.ignore\|load(.*)\.pipe.*Effect\.ignore" src/

# outline-none without focus-visible replacement
grep -rn "outline-none" src/ | grep -v "focus-visible:"
```

Alongside the greps, eyeball each file's imports. Every symbol you imported should be called. The linter flags this, but so do you, at write-time.

## Structural completeness

- [ ] Every Message variant is declared once in `defineMessageUnion()`
- [ ] Every Message variant has a case in `Message.match` in update
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
- [ ] No inline `Command.define` in pipe chains. Always stored as a constant
- [ ] Definitions colocated with the update that produces them
- [ ] Every _fallible_ Command catches all errors: `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Infallible Effects (`Clock.currentTimeMillis`, `Random.nextIntBetween`, `Effect.uuid`, `Calendar.today.local`) do NOT need catch. If the type system shows no error channel, there's nothing to catch, and no paired `Failed*` Message is needed either.
- [ ] Return types inferred. No explicit `Command<typeof A>` annotations
- [ ] Factory functions named by action: `fetchWeather`, not `fetchWeatherCommand`
- [ ] Commands that can't meaningfully fail return `Completed*` Messages, payload-carrying ones included

## Mount, Command, Subscription, ManagedResource, CustomElement: pick by what causes the side effect

- [ ] **One-time effect after a Message dispatched** → Command. Focus-on-open, navigation, network, storage, analytics, scroll lock paired with a modal opening/closing all belong in `update`'s return, not in `OnMount`.
- [ ] **Per-instance lifecycle bound to a VNode existing**, where the live `Element` handle is needed → Mount. Anchor positioning, backdrop portaling, attaching observers/listeners to a specific element, third-party library instantiation that takes the element as host. Two constructors picked by emission cardinality: `Mount.define(name, ...results)(element => Effect<Message>)` for one-shot Mounts that produce exactly one Message at acquire (anchor setup, portal-to-body, library instantiation); `Mount.defineStream(name, ...results)(element => Stream<Message>)` for continuous-event Mounts where the element produces a stream of events from listeners or observers (scroll listeners, IntersectionObservers, MutationObservers). Both compose cleanup via `Effect.acquireRelease` and keep the scope open until destroy.
- [ ] **External event source gated by a Model condition** → Subscription. Timers, document/window events, system theme changes, WebSocket message streams. The factory returns `Stream<Message>` whose lifetime is gated by `modelToDependencies`. Subscriptions look like `Mount.defineStream` in shape (Stream + `Effect.acquireRelease` cleanup), but the cause anchor differs: Mount = element existence, Subscription = Model condition.
- [ ] **Stateful runtime object** (websocket, camera stream, library instance) keyed on a Model condition, with Commands consuming the handle via `yield*` → ManagedResource. Not a generic "lifecycle on Model condition". There must be a handle for Commands to use.
- [ ] **Native web component** (Shoelace, vanilla-colorful, emoji-picker-element, anything that speaks typed JS properties + observed attributes + dispatched `CustomEvent`s) → CustomElement. Side-effect-import the package to register the element with the browser, then declare its surface with `CustomElement.define({ tag, properties, events })` to get a typed inline builder. Do NOT reach for Mount + Subscription + tag-name registry to wrap a web component; `CustomElement.define` is the higher-level fit when those three surfaces are available.

### Two practical rules for Mount (both must hold)

- [ ] **The factory uses the element parameter.** If the factory doesn't read or write the element, Mount is the wrong primitive. Pick Command (transition-driven) or paired Commands (lifecycle-bound but element-handle-not-used).
- [ ] **The work is DOM measurement, DOM manipulation, or continuous element-scoped event listening on that element.** Read geometry, mutate CSS, attach an observer/listener, portal the element, hand it to a third-party library. Anything else (network, storage, analytics, focus-on-transition, scroll lock for the page) is a Command.

### Replay safety

- [ ] Mount factories re-run during DevTools time-travel renders. The two rules above keep Mount work inherently replay-safe (read-only DOM measurement, idempotent DOM mutation, paired observer attachment+cleanup via `Effect.acquireRelease`). If your Mount touches the live world in a way that disrupts replay (focus stealing, scroll locking the live page, library re-instantiation), it shouldn't be a Mount.

### Smell check

- [ ] **Don't reach for Mount just because the work happens to coincide with an element appearing.** Check what causes the work. If a Message just dispatched (e.g. `Opened*`, `Submitted*`), the cause is the Message, not the element. Use a Command returned from `update`'s handler. Example: focusing a search input when its dialog opens. The cause is `Opened`, not the input's existence; return a `FocusInput` Command from the `Opened` handler.
- [ ] **`Effect.acquireRelease` construction lives INSIDE the acquire body, not before it.** If your acquire body reads as `Effect.sync(() => alreadyExistingValue)`, the construction happened earlier and your release is dangling. `acquireRelease` only guarantees atomicity of "acquire body completes → release is registered"; anything constructed outside the acquire body, even one `yield*` earlier, is unprotected against interruption. Fix: express the construction as the success value of the acquire Effect (`Effect.tryPromise(...).pipe(Effect.map(({ Lib }) => new Lib(...)))` for async imports, `Effect.sync(() => new Thing(...))` for sync construction). Applies anywhere `acquireRelease` is used: Mount.define factories, Subscription bodies, anywhere a release function depends on a value produced inside an Effect chain.

### Naming

- [ ] Mount Definition names are verb-first imperatives: `AnchorPopover`, `PortalPopoverBackdrop`, `AttachComboboxPreventBlur`, not `PopoverAnchor` or `ComboboxPreventBlurAttachment`. Mount result Messages are verb-first past-tense: `CompletedAnchorPopover`.

## Naming

- [ ] Messages are past-tense, verb-first
- [ ] Input changes use `Updated*` prefix (e.g. `UpdatedEmail`), not `Changed*`
- [ ] `Completed*` uses verb+object order: `CompletedFocusInput` not `CompletedInputFocus`
- [ ] Option fields prefixed with `maybe`
- [ ] Boolean fields prefixed with `is`
- [ ] No opaque abbreviations or unexplained single-letter names
- [ ] Constants for all magic numbers
- [ ] Schema literals are capitalized: `S.Literals(['Active', 'Inactive'])`

## State modeling

- [ ] Discriminated unions for multi-valued state (not booleans)
- [ ] `Option` for absent fields (not empty strings, null, or zero)
- [ ] Impossible states are unrepresentable
- [ ] `ts()` for non-Message tagged structs (Model states, route variants)
- [ ] `defineMessageUnion()` for Message and OutMessage unions
- [ ] **Remote data uses `AsyncData`, not a hand-rolled union.** `AsyncData.Schema(DataSchema, ErrorSchema)` supplies `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success` plus `match`, `isPending`, `hasData`, `revalidate`, and the rest. A hand-rolled `Idle | Loading | Error | Ok` is missing `Refreshing` and `Stale`, which is what forces a refetch to blank the screen and a failed refetch to discard good data. Reference: `repos/foldkit/examples/weather/src/main.ts`

## Framework modules over hand-rolled equivalents

Foldkit ships these; reaching past them is a finding, not a style choice.

- [ ] Update return type is aliased once per file and passed to `Message.match<UpdateReturn>`. The update signature does not repeat `: UpdateReturn`. Use `M.withReturnType<UpdateReturn>()` only for an Effect `Match` over another tagged union inside a handler. `Update.Return<Model, Message>` (or `Update.ReturnWithOutMessage<Model, Message, OutMessage>`) is the preferred alias. A hand-written plain-return alias must include `outMessage?: never`
- [ ] Multi-step post-mutation handlers use `Update.combine(model, [...])` and `Update.refresh({ read, revalidate, write, load })` rather than hand-threaded `evo` chains and conditional Command arrays
- [ ] Child Submodel Commands are re-tagged with `Command.mapMessages(commands, toParentMessage)`
- [ ] HTTP uses `HttpClient` / `HttpClientRequest` from `effect/unstable/http`, with `Effect.provide(effect, Http.layer)` to supply the client. Not `@effect/platform` (`@effect/platform-browser` is separate and is for `BrowserKeyValueStore` / `BrowserCrypto`)
- [ ] UI components are imported from `@foldkit/ui` by name (`import { Dialog, Input } from '@foldkit/ui'`). There is no `Ui` namespace on `foldkit`

## Effect-TS patterns

- [ ] `pipe()` only for multi-step chains (not single operations)
- [ ] `Message.match` for exhaustive Message matching; Effect `Match` for state unions, partial matches, fallbacks, and shared multi-tag handlers (no switch)
- [ ] `Array.match({ onEmpty, onNonEmpty })` for branching on a Model array (not `.length === 0` / `.length > 0`, and not `Array.isArrayEmpty` / `Array.isArrayNonEmpty`, which take a mutable `Array<A>` and reject the `ReadonlyArray` that `S.Array(...)` decodes to)
- [ ] `evo()` for Model updates (not spread)
- [ ] Callable constructors (not `as` casts or manual `_tag` objects)
- [ ] Message and OutMessage constructors stay on their owning namespace; no constructor destructuring
- [ ] No-field tagged structs called with NO argument: `Idle()`, `Work()`, `Message.ClickedSubmit()`. Never `Idle({})`, `Work({})`, `Message.ClickedSubmit({})`
- [ ] `Option.match` preferred over `Option.map` + `Option.getOrElse`

## View

- [ ] Branches are never keyed; each branch renders through a view function (identity boundary), with a same-tag inline ternary extracted into named view functions when switching must reset DOM state
- [ ] Events dispatch Messages, never perform actions directly
- [ ] Semantic HTML elements (`main`, `nav`, `section`, `article`, `header`, `footer`)

## Foldkit UI

- [ ] Foldkit UI components used where interaction matches (Dialog, Tabs, Menu, Combobox, DatePicker, FileDrop, Toast, Tooltip, DragAndDrop, etc.). Never hand-roll accessible widgets
- [ ] **Form inputs use `Input.view`, `Textarea.view`, `Button.view` from `@foldkit/ui`.** Hand-rolled `input`/`textarea`/`button` elements in a form are a fail unless the file has a NOTE comment explaining why the component couldn't be used.
- [ ] Each stateful UI component has its Model in the app Model, a `Got*` Message, init in init, and delegation in update. Stateless render helpers (`Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`) are called directly in view and dispatch parent Messages; the controlled ones (`Checkbox`, `Switch`, `Disclosure`) take the current value in from the parent Model, which stores the new value on toggle
- [ ] `Toast` uses `Toast.make(PayloadSchema)` to bind to a consumer-defined payload type
- [ ] No custom keyboard navigation or ARIA attributes for patterns covered by Foldkit UI components

### Mechanical check: no hand-rolling

Run these greps against `src/`. Every hit needs an explanation: a sanctioned `toView` spread, a `NOTE:` justification, or a fix.

```bash
# Raw input / textarea / button: should use Input, Textarea, Button.
# Matches both `input(...)` and the usual `h.input(...)`, anywhere on the line.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?(input|textarea|button)\(" src/

# Hand-rolled ARIA: should use Dialog / Menu / Tabs. Capital-R `Role(` is the
# view attribute; lowercase `role(` is a test locator and is not a finding.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?Role\(['\"](dialog|menu|tab)" src/
```

Eyeball every hit from the first grep. A call that spreads the component's own
attribute group (`...attributes.input`, `...attributes.textarea`,
`...attributes.button`) is the sanctioned `toView` case, not a finding. The spread
usually sits on a later line than the element call, which is why this exclusion is
a read rather than a `grep -v`.

The rule: **if the interaction pattern appears in the `@foldkit/ui` component table (Phase 2.5 of SKILL.md), use the component.** The gate is about the interaction, not the tag, so a hit is only a finding once you know which of these it is:

- **Inside the component's own `toView`** (the call spreads `...attributes.input` / `.textarea` / `.button` / `.label`): sanctioned, not a finding.
- **A form control** (a text input, textarea, or button in a form): must go through `Input`, `Textarea`, or `Button`. Raw here is a BLOCKER unless a `// NOTE: hand-rolling because <specific reason>` comment sits above it.
- **A deliberate non-form control** (a search field, an inline editor, anything intentionally below the component layer, per the form-inputs rule in Phase 2.5): allowed. Still check it directly against the Accessibility section below, since nothing is supplying the label wiring, focus ring, or ARIA for you.

Hand-rolling a control the table covers is permitted only when the component genuinely doesn't fit, and only with the NOTE. Without the NOTE, the reviewer treats it as a BLOCKER, not a style preference.

**A NOTE is not a free pass.** Before writing one, read the component's `.d.ts` and confirm the concern is real. Common false-justifications to avoid:

- _"Using the component would require a per-row Model instance and duplicate state"_: first check whether the component is stateful. Stateless controlled helpers like `Checkbox`, `Switch`, and `Disclosure` do not add a child Model. Store the value in the parent Model and pass it to `view` with an `onToggle` Message. For stateful components, the component Model holds UI state (focus, open/closed, typeahead key buffer), not your domain value, so holding it is not duplication.
- _"The component needs a toParentMessage and I don't want to wire one"_: that's always the wiring cost. The whole point of Ui components is that you pay it once per use and get a11y for free.
- _"The interaction is too custom for the component"_: check the `toView` callback signature. It lets you render whatever HTML you want inside the component's attribute-scaffolding. Custom visual = fine, custom a11y = never needed.

Reviewers should challenge every NOTE: "Is this justification actually true, or is it defensive rationalization? What does the `.d.ts` say?" Look up the component's actual API before accepting the NOTE.

## Accessibility

Foldkit UI components ARE the a11y pass for their covered patterns. These checks apply to anything NOT covered by a `@foldkit/ui` component (raw inputs in a custom context, static content, custom layouts) and to the overall document structure.

- [ ] Exactly one `h1` per route. Headings descend without skipping levels (no `h3` without an `h2` above it).
- [ ] Semantic landmarks used: `main`, `nav`, `header`, `footer`, `aside`, `section`. Not `div` soup.
- [ ] Every `label` is associated with its input: `label([For('email-input')], ['Email'])` paired with `input([Id('email-input'), ...])`. Or use `Input.view` which handles the association. Grep the `label(` calls and read each one's attribute block for `For(`; a single-line `grep -v` misses labels whose attributes wrap. A `...attributes.label` spread is the component's own `toView` and is not a finding.
- [ ] Every `input`, `textarea`, and `select` has either an associated `label` OR an explicit `AriaLabel(...)`. Unlabeled form fields are a fail.
- [ ] Icon-only buttons have `AriaLabel(...)` describing the action. `button([OnClick(...)], ['★'])` without an aria label is unreadable to screen readers.
- [ ] Dynamic error messages wrap in `role="alert"` (for immediate errors) or `aria-live="polite"` (for non-urgent updates). Validation errors that appear after blur should be announced. Example: `p([Role('alert'), ...], [errorMessage])`. Grep for error-class CSS (e.g. `text-red`) and verify each error container has `Role('alert')` or a parent with `AriaLive('polite')`.
- [ ] External links (`Target('_blank')`) also have `Rel('noopener noreferrer')`.
- [ ] Images have `Alt(...)`. Decorative images use `Alt('')` explicitly. Never omitted.
- [ ] Interactive lists (navigable items, selectable rows) use `ul`/`ol` + `li`, not `div` stacks. Screen readers announce "list with N items" for real lists.
- [ ] Required form fields are marked `AriaRequired(true)` on the rendered input. `Input.view` has no `required` option, so pass it through the `toView` callback's `input` attribute group. The `required` HTML attribute alone is not enough for every screen reader.
- [ ] Focus is visible, either via Tailwind's `focus-visible:` classes or the browser default. If you've reset outline, you must replace it. Grep for `outline-none` without a paired `focus-visible:` class.
- [ ] Color is not the only carrier of meaning. A red border on an invalid input needs an accompanying error message or icon. Don't ship "invalid = red only."
- [ ] Page `<title>` is set via the `title` field of the `Document` returned by `view` (with `Runtime.makeApplication`). For routed apps, each route returns a distinct title.

### Mechanical check: a11y

The greps below are **fast starting scans**, not authoritative. `foldkit/require-rel-for-external-link` is the real check for the external-link case, but it bails when the attribute array contains a spread, so the scan stays for that edge. Attributes also span multiple lines (`Target('_blank')` on line N, `Rel('noopener noreferrer')` several lines later, or ordered the other way), so a fixed `-A` window silently passes anchors whose `Rel` falls outside it. Each scan lists candidates; you confirm by reading the whole attribute block. Every hit needs eyeballing in context before it is called a bug, and every hit does need it.

```bash
grep -rnE "(^|[^.[:alnum:]_])(h\.)?label\(" src/       # labels: read each block for For(
grep -rn "_blank" src/                                  # then read each anchor's block for Rel(
                                                        # foldkit/require-rel-for-external-link
                                                        # bails on spread attribute arrays
grep -rn "outline-none" src/ | grep -v "focus-visible:"  # killed focus outline without replacement
```

For a precise check, read each matching attribute block end-to-end. Alternatively, convert to a short AST-level scan or a structural lint rule; those are the real defense. The greps are for catching obvious misses in under a second.

Each confirmed miss is a concrete a11y bug a screen reader user would hit.

## Forms, dates, and files

- [ ] Form validation uses `foldkit/fieldValidation` (`Field`, `makeRules`, `validate`, `allValid`). No hand-rolled `Valid | Invalid` unions when validation is the concern
- [ ] Date handling uses the `Calendar` module (`Calendar.CalendarDate`, `Calendar.today.local`). No raw `Date` objects in Model
- [ ] File handling uses the `File` module with `FileDrop` from `@foldkit/ui`. No direct `File` API usage in update/view

## File organization

- [ ] Message layout follows four-group convention (values, union + type)
- [ ] Section headers used in single-file apps: `// MODEL`, `// MESSAGE`, etc.
- [ ] Complex update handlers extracted to separate functions
- [ ] view decomposed when branches exceed ~30 lines

## Testing

**Story tests** (required at every tier):

- [ ] `story.test.ts` exists with `story` pipelines (sibling pages or component variants use a subject prefix: `login.story.test.ts`)
- [ ] Every fallible Command (`Succeeded*`/`Failed*` pair) tested for both outcomes
- [ ] At least one multi-step test that chains Messages and Command resolutions
- [ ] Submodel tests assert `outMessage` when the child signals to parent
- [ ] Tests use `Command.resolve(Definition, resultMessage)`. Never run Command Effects directly in story tests
- [ ] All tests pass with the project's test script

**Scene tests** (REQUIRED at Tier 3+; strongly encouraged at Tier 2):

For Tier 3+ apps (routing, async Commands, forms), missing `scene.test.ts` is a **BLOCKER**. The app has not been tested from the user's perspective without it.

- [ ] `scene.test.ts` exists: a root-level file for flows that cross pages, plus one in any page folder whose own rendering and interaction warrant it
- [ ] View rendering test: initial view has expected elements (headings, inputs, buttons)
- [ ] User interactions test: click, type, submit produce visible changes
- [ ] At minimum one test per discriminated-union state that has distinct view output (loading, error, empty, populated)
- [ ] Uses accessible locators: `role(...)`, `label(...)`, `text(...)`. Not `placeholder` or CSS selectors.
- [ ] Scoped queries with `within` or `inside` when a parent container contains multiple similar elements

---

# Quality Bar (beyond "it works")

The sections above cover correctness. The sections below cover the craft details that distinguish typing-game / website quality from generic valid code. The bar is: would a careful reader believe this was hand-written by the authors of `packages/typing-game/client/src/` or `packages/website/src/`? If not, keep working.

**Tier-aware:** every item below applies at every tier UNLESS marked otherwise:

- `[T2+]`: applies once the app has subscriptions or persisted state
- `[T3+]`: applies once the app has async Commands or routing
- `[T5+]`: applies once the app has nested domain state, multiple entities, or submodels

Items without a tier marker apply universally (even to a 50-line counter). When in doubt, assume universal.

## Decomposition

- [ ] Every function operates at a single abstraction level: orchestrators delegate, implementations implement. If a function reads like it's doing two things, extract one.
- [ ] **Update handlers over ~15 lines are extracted** to named functions in the same file. [T3+] If a handler exceeds ~50 lines, extract to its own file under `src/update/` (e.g. `update/handleRoomUpdates.ts`).
- [ ] **Extracted handlers are curried `(model: Model) => (message: M) => UpdateReturn`** so they compose in pipelines, not `(model, message) => UpdateReturn`. See `packages/typing-game/client/src/page/home/update/handleKeyPressed.ts:33-40`.
- [ ] **View branches over ~30 lines are extracted** to named view functions (e.g. `enterUsernameView`, `selectActionView`). [T5+] If the view for a single route/state exceeds ~100 lines, extract to `src/view/` or `src/page/*/view.ts`.
- [ ] No function exceeds ~40 lines without extraction. Long functions are the primary smell.

## Effect module usage (consistency, not correctness)

- [ ] Native methods replaced with Effect equivalents _in pipe chains_: `Array.map(items, f)` not `items.map(f)` when composing; `String.startsWith(s, 'foo')` in a pipe not `s.startsWith('foo')`.
- [ ] `Option.match({ onNone, onSome })` preferred over `Option.map(...).pipe(Option.getOrElse(...))`. The labeled branches are self-documenting.
- [ ] `Array.match({ onEmpty, onNonEmpty })` when handling both empty and non-empty cases, and for any branch on a Model array at all, since the predicates reject `ReadonlyArray`. Not `isArrayEmpty ? ... : ...` ternaries. Grep for `.length > 0`, `.length === 0`, and `.length !== 0` on arrays and strings; should be zero. Use `Array.isArrayNonEmpty` / `String.isNonEmpty` for pure checks, `Array.match` for branching renders.
- [ ] `Equal.equals(target)` in predicates: `Array.findFirst(items, Equal.equals('Other'))` not `item => item === 'Other'`.
- [ ] `Array.fromOption(maybeCommand)` for "zero or one command based on Option", not `Option.match` that returns `[]` vs `[cmd]`.
- [ ] `Option.liftPredicate(value, predicate)` instead of `condition ? Option.some(value) : Option.none()`. The predicate may be a constant `() => condition` when the check doesn't use the value.
- [ ] `pipe(...)` is multi-step only. Never `pipe(x, singleOp(...))`; call `singleOp(x, ...)` directly. (Exception: `.pipe(Effect.catch(...))` as a tail suffix is fine.)
- [ ] When piping, data leads on its own line: `pipe(\n  data,\n  Array.map(f),\n  ...\n)`, not `pipe(data, Array.map(f), ...)`.
- [ ] `evo` setters are point-free when they only transform that same field: `entries: Array.map(f)` not `entries: () => Array.map(model.entries, f)`, `count: Number.increment` not `count: () => Number.increment(model.count)`. Keep `() => value` for replacement values from Messages, child updates, Commands, or other Model fields.
- [ ] Callback destructuring when accessing a single field: `({ id }) => id === cardId` not `card => card.id === cardId`.

## Domain organization [T5+]

- [ ] **If the app has multiple domain entities referenced across modules, they live in `src/domain/`**, not inline in `model.ts`. One file per concept (`domain/column.ts`, `domain/card.ts`), with `domain/index.ts` as a barrel re-exporting each via namespaced re-export (`export * as Column from './column'`).
- [ ] **Pure domain logic lives in `domain/*.ts`**, not in update handlers. Examples: `Column.reorder(columns, from, to)`, `Cart.totalPrice(items)`. If the update is doing array surgery on domain entities, that surgery belongs in the domain module.
- [ ] Domain files export schemas AND pure operations on those schemas. Update calls the operations; it doesn't reimplement them.
- [ ] Domain modules never import from `model.ts`, `update.ts`, `view.ts`, or `message.ts`. Domain is the leaf layer.
- [ ] References: `repos/foldkit/examples/kanban/src/domain/`, `repos/foldkit/examples/job-application/src/domain/`, `repos/foldkit/examples/shopping-cart/src/domain/`.

## Naming precision

- [ ] Every Option-typed value is prefixed `maybe*`: `maybeCurrentUser`, `maybeFocusUsernameInput`, `maybeOutMessage`, `maybeNewCardColumnId`. No exceptions.
- [ ] No `maybe*` name holds a native `T | undefined`; `maybe*` is reserved for `Option`. Grep `maybe[A-Z]` against function signatures and variable types; each hit should be `Option<T>`, not `T | undefined`.
- [ ] Internal API boundaries (helper function configs, view builders, domain operations) use `Option<T>` for optional fields, not `T | undefined`. Call sites then read `Option.some(x)` / `Option.none()` instead of `x` / `undefined`. The `T | undefined` form is only acceptable at framework boundaries (React props, vendored library configs, JSON decoding) that already use it.
- [ ] Boolean fields prefixed `is*`: `isPlaying`, `isDismissed`, `isMenuOpen`.
- [ ] Command function names are verbs describing the action: `fetchWeather`, `focusButton`, `scrollToItem`. Never `fetchWeatherCommand` or `weatherFetcher`.
- [ ] Command `define` names are verb-first PascalCase imperatives: `FetchWeather`, `FocusButton`, `LockScroll`.
- [ ] Command names describe the effect their `execute` bodies perform, not the later Model transition: a timer that only waits before dismissal is `WaitBeforeDismissal`, not `DismissAfter`.
- [ ] Message names are verb-first past-tense: `ClickedSubmit`, `UpdatedEmail`, `SucceededFetchWeather`. Never noun-first (`SubmitClicked`) or imperative (`FetchWeather` as a Message).
- [ ] `Completed*` Messages mirror the Command name verb-first: Command `LockScroll` → Message `CompletedLockScroll`. Never `CompletedScrollLock`.
- [ ] A Command's result Message is named from the Command, not from the fact it reports: `DetermineStartTime` → `CompletedDetermineStartTime`, never `DeterminedStartTime`. The only exception is a Message with more than one cause.
- [ ] Named helpers use specific verbs, not generic ones: `enqueueMessage` not `addMessage`, `announceKeyboardDrag` not `announce`, `whenSelectAction` not `handleSelect`. The verb eliminates ambiguity.
- [ ] Names are immediately understandable in context: `signature` not `sig`, `tickCount` not `t`, `message` not `msg`, `index` not `i`. Callback parameters are included. Conventional technical shorthand is allowed when it is the normal domain spelling, such as `attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, and `VNode`. Established API and DSL bindings such as `h` are also allowed. Prefer a precise semantic name such as `toMessage` over an unexplained `f`.

## File structure and exports

- [ ] Each source file exports only its public contract: typically `Model`, `Message`, `init`, `update`, `view`, plus named schemas/constants other modules consume. Internal helpers are not exported.
- [ ] Section headers present in files that span multiple sections: `// MODEL`, `// MESSAGE`, `// INIT`, `// UPDATE`, `// COMMAND`, `// VIEW`, `// RUN`. Order: Model → Message → Flags (if any) → Init → Update → Command → View → Run.
- [ ] `index.ts` is always a barrel, never implementation. If a module `foo/` has code, the shape is `foo/foo.ts` for code + `foo/index.ts` for `export * from './foo'` and `export * as Child from './child'`.
- [ ] Imports ordered: npm packages first (alphabetized), then `foldkit/*`, then relative imports. No mixed groups.
- [ ] Message definitions exported individually AND as the `Message` union type when used across modules. Internal-only messages stay unexported.

## Submodel and Command extraction [T5+]

- [ ] [T5+] If the app has multiple Submodels, each has its own directory with at minimum `main.ts` (init/update/view), `message.ts` (messages + OutMessage schema), and optionally `command.ts` (submodel Commands).
- [ ] [T3+] If update returns Commands across multiple handlers AND the Commands involve non-trivial Effect pipelines (HTTP, Dom compositions), Commands are defined in their own `command.ts` file, not inline in update.
- [ ] Command factories are pre-wrapped and named by action: `const fetchWeather = (city) => ...` returns the Command-wrapped Effect. Call sites read as `[fetchWeather(city)]`, not `[FetchWeather(Effect.gen(...))]`.
- [ ] [T5+] OutMessage unions are explicitly tagged with `// OUT MESSAGE` section comment when they appear in a submodel `message.ts`.

## Subscriptions [T2+]

- [ ] Subscriptions use `Subscription.make<Model, Message>()(entry => ({ key: entry(fields, callbacks) }))`. Each `entry(...)` call takes the bare field map as its first argument (no `S.Struct` wrap) and the `{ modelToDependencies, dependenciesToStream, equivalence? }` callbacks as its second.
- [ ] `modelToDependencies` extracts exactly the data the stream needs from Model, not the full Model. Wrap absent dependencies in `Option` at the field level when the subscription should stop.
- [ ] Always-active subscriptions pass `{}` as the `entry` fields argument and return `{}` from `modelToDependencies`.
- [ ] Message mapping happens inside `Stream.map(event => Effect.succeed(Message.UpdatedX({ data: event })))`, not scattered through update.
- [ ] Subscription files live at `src/subscription.ts` (or `src/subscription/` directory for multiple), never inline in `main.ts`.

## Managed Resources [T7]

- [ ] Managed Resources use `ManagedResource.make<Model, Message>()(entry => ({ key: entry(requirementsSchema, config) }))`. The requirements schema is the positional first argument (usually `S.Option(...)`), not a field on `config`. No standalone `ManagedResourceDeps` struct.
- [ ] `modelToMaybeRequirements` returns `Option.some(params)` to acquire and `Option.none()` to release. `acquire` fails into the error channel so `onAcquireError` fires instead of crashing; `release` never throws.
- [ ] The service union is read with `ManagedResource.ServicesOf<typeof managedResources>`, not hand-maintained in parallel.
- [ ] A child Submodel that owns a Managed Resource exposes its own `make` record in child terms; the parent composes it with `ManagedResource.lift(childRecord)<Parent, Parent>({ toChildModel, toParentMessage })` (where `toChildModel` returns `Option<ChildModel>`) and `ManagedResource.aggregate`. No hand-rolled parent factory threading `toChildModel`/`toParentMessage` into the child.

## Testing quality

- [ ] Test names state the behavior being tested: `it('surfaces a validation error when email is malformed')`, not `it('tests validation')` or `it('handles the reported bug')`.
- [ ] Each `story` pipeline reads as a narrative: initial model → action → assert → action → assert. Not a dump of unrelated assertions.
- [ ] Scene tests use accessible locators (`role('button', { name: /submit/i })`, `label('Email')`) over `placeholder` or CSS selectors.
- [ ] Commands in tests are resolved with `Command.resolve(Definition, resultMessage)`. Never run Command Effects directly.

## Residual code smells (each is a fail)

- [ ] No `console.log`, `console.error`, or any `console.*` outside of test fixtures.
- [ ] No commented-out code blocks. Delete, don't comment.
- [ ] No TODO/FIXME/XXX comments in generated code. If something's incomplete, it shouldn't ship.
- [ ] No `any` types. No `as` casts except where Schema decoders require them at boundaries (and those should be vanishingly rare).
- [ ] No `let` outside tight imperative loops where mutation is genuinely unavoidable (rare; usually `Array.reduce` or `Array.makeBy` replaces it).
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
