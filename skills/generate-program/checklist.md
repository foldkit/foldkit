# Post-Generation Verification Checklist

Run through each category after generating an app. Fix any issues before presenting the result.

> **This is the canonical reference for mechanical checks.** `SKILL.md` phases 4.5, 5, and 5.5, and the `audit-program` skill, point here rather than duplicating the grep commands, to prevent drift. If you update a grep or add a new one, update it here.
> Example paths assume a consumer project with the Foldkit subtree vendored at `repos/foldkit/`. Working inside the Foldkit repo itself, drop that prefix; the same paths exist at the project root.

## Gate commands (run ALL FOUR; fix everything they surface)

- [ ] `format`: run FIRST; rewrites files so subsequent gates see the committed shape. The scaffold wires Oxfmt.
- [ ] `lint`: output clean. This is a structural gate, not just a style pass: the scaffold wires oxlint **and** `@foldkit/oxlint-plugin`, whose `foldkit/*` rules enforce keyed rows, route printing, child ownership, Command naming, and more. Treat any `foldkit(...)` diagnostic as a blocker; that is how they are labelled in the output. It also catches the unused imports `tsc` does not.
- [ ] `typecheck`: no errors. The scaffold wires `tsc --noEmit`. A missing child Layer, a missing Command or Mount handler, or a wrong child Model field shows up here.
- [ ] `test`: all tests pass. The scaffold wires vitest with `@effect/vitest`.

The project's configured script is the contract for each gate; the tools named are what `create-foldkit-app` happens to wire up. If a project swapped one out, run its script.

Invoke each through the package manager the project was scaffolded with (`npm run lint`, `pnpm run lint`, `yarn lint`, `bun run lint`). If a script is missing, run the project-local binary through that manager's exec (`pnpm exec oxlint src`, `npm exec --no-install oxlint src`, `yarn exec oxlint src`, `bun x --no-install oxlint src`). Avoid bare `npx`, which fetches from the registry when the binary isn't installed locally.

"Typecheck clean and tests pass" is NOT sufficient. Generated code rarely matches Oxfmt's output out of the box, and frequently has unused imports that only the linter catches.

## Mechanical scans (run on every file before tsc)

**Run the linter before any of these.** `@foldkit/oxlint-plugin` ships AST rules with a `recommended.json` preset, and `create-foldkit-app` installs and wires it, so `npm run lint` already enforces its conventions in a scaffolded project. Those rules parse the code instead of matching text, so they don't miss a wrapped call or a renamed helper the way a grep does. Confirm the rules are active by reading the config, not the lint output: a monorepo or vendored setup wires the plugin by path specifier under `jsPlugins` and never extends `recommended.json`. Diagnostics are labelled `foldkit(rule-name)`, so a run with zero `foldkit(` matches is what a passing project looks like. Never read a quiet lint run as the rules being off. If the rules aren't active, turning them on is a bigger win than any scan below.

Among others, the plugin enforces keyed mapped rows, hard-coded route strings, empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`, parent construction of child-owned Messages, PascalCase Command definitions, and no `NoOp` Messages. Don't re-implement a rule wholesale.

**A rule being green is not the same as the subject being clean.** Several rules are deliberately narrow, and the greps below cover their edges. Each such grep names the rule it complements and where that rule stops. `recommended.json` also turns every rule off for `**/*.test.ts` and `**/*.test.tsx`, so test shape is on you.

Each hit is either a fix or a `// NOTE:` justification. Silent hits aren't allowed.

```bash
# Stale Block API. These identifiers belong to Foldkit's earlier Block
# authoring API and do not exist in a release with class Blocks. Any hit in
# generated code is a BLOCKER: rewrite it as a class Block (`class X extends
# Block<...>()('X', {...})` plus `XLive = X.make(...)`), children via
# `yield* new Child(...)` / `Child.each(...)`, OutMessages via `.on`, parent
# requests via `send`, child views via `model.child.view()`, Commands via
# `Command.define` with handlers under `commands`, and
# `Program.make(Application, { layer })`.
grep -rnE 'makeDefinition|makeComposition|prepareBlock|Block\.assemble|FromAssembly|makeNamespace|makeBinding|makeMapBinding|makeVariantBinding|withOutMessagePolicy|makeOutMessageFold|makeOutMessageForward|make(Fields|Commands|OutMessage|Noop)?Step\b|makeInit\b|makeUpdate\b|makeView\b|ViewBuilderFor|EffectsLayer|makeSubscriptions|makeManagedResources|makeResource\b|embedView|h\.block\(|toParentMessage|bindingInit|ChildInitContext|replaceEffectsLayer|provideHandlers|program\.provide\(' src

# Stale test API. story and scene take a Block's Layer, not an update function
# or an { update, view } record, and run inside it.effect from @effect/vitest.
grep -rnE "story\(\s*update\b|scene\(\s*\{" src/ --include="*.test.ts"
grep -rln "from 'vitest'" src/ --include="*.test.ts"

# A child's Model Schema used as a parent field. The field Schema is the class
# itself (`search: Search`), not `Search.Model`.
grep -rnE "^\s+[a-zA-Z]+: (Schema\.(Option|Array)\()?[A-Z][A-Za-z]*\.Model\b" src/ --include="*.ts" | grep -v "\.test\.ts"

# Instances in HashMap / HashSet. Instances live in Structs, Option, arrays,
# Records, and tagged variants only. Read each hit: a HashMap of plain domain
# values is fine.
grep -rnE "Schema\.(HashMap|HashSet)\(" src/

# Async work in a constructor. Constructors are synchronous; data loads go in
# a `start` Command. Read each hit in a `.make(` constructor body (not inside
# a `commands` handler or a Stream).
grep -rnE "Effect\.(promise|tryPromise|sleep)\(|fetch\(" src/

# A parent rewriting a child's state, or a spread Model. A parent changes a
# child only through `send`; it never spreads or rebuilds `model.child.model`.
# A handler returning `model: { ...model, field }` should use modifyFields.
grep -rnE "\.\.\.[a-zA-Z.]+\.model\b|model: \{ \.\.\." src/

# Empty-object constructor calls. foldkit/no-empty-object-tagged-call covers bare
# constructors, Message/Route/State namespaces, and unions declared in this
# file. Check imported domain unions with other names by eye.
grep -rn "({})" src/

# External links missing Rel. foldkit/require-rel-for-external-link bails when the
# attribute array contains a spread, so `h.a([...baseAttrs, Target('_blank')], ...)`
# is unflagged. Read each hit's attribute block for Rel.
grep -rn "_blank" src/

# `as` casts on constructor returns. Rejected by oxlint's
# typescript/consistent-type-assertions, which the SCAFFOLD sets but
# recommended.json does not.
grep -rn " as [A-Z][a-zA-Z]*State\b\| as [A-Z][a-zA-Z]*Message\b" src/

# Unkeyed list rows. foldkit/keyed-required-for-mapped-rows fires only when the
# callback references `.id` AND the row element is one of li/div/tr/article/section.
# Rows keyed on slug/name/uuid, rows returning h.a / h.button / a component call,
# and rows rendering a child instance's `.view()` pass it silently. This triage
# lists files that map a list and bind a per-item handler or render an instance,
# with map-site and keyed counts. Read every map site in a listed file.
for f in $(grep -rl "Array\.map(\|\.map(" src/); do
  grep -qE "OnClick\(|OnInput\(|OnChange\(|onClick:|onInput:|onChange:|\.view\(" "$f" || continue
  echo "READ MAP SITES: $f (maps=$(grep -c 'Array\.map(\|\.map(' "$f") keyed=$(grep -c 'keyed(' "$f"))"
done

# Wrong package for UI components: they come from '@foldkit/ui', and there is
# no Ui namespace on foldkit.
grep -rn "\bUi\.[A-Z]" src/

# Wrong origin for HttpClient. It lives in 'effect/http'. Check per FILE, since
# the import usually wraps across lines.
# (@effect/platform-browser is fine; that's KeyValueStore and Crypto.)
for f in $(grep -rl "HttpClient" src/); do
  grep -q "from 'effect/http'" "$f" || echo "WRONG HttpClient ORIGIN: $f"
done

# Destructuring that names an update-result field. Results should be
# operation-named values consumed with dot access. A plain domain record may be fine.
rg -n -U 'const\s+\{[^}]*\b(model|commands|outMessage)\b[^}]*\}\s*=' src/

# Literal empty Commands or Messages arrays. foldkit/no-empty-commands-array
# covers commands in source files where it is active. Review messages and test
# files too. A handler with statically none omits the field; a computed
# collection is returned directly.
rg -n -U '\b(commands|messages)\s*:\s*\[\s*\]' src/

# T[] syntax in types: use ReadonlyArray<T>
grep -rnE "[A-Za-z>]\[\]( |,|>|\)|$)" src/ | grep -v "\[\] =\|: \[\]"

# Hand-rolled remote-data union: use AsyncData.Schema(Data, Error).
# Eyeball each hit; a non-remote state machine with these names is fine.
grep -rn "Loading: {}" src/

# Stale Effect array predicate names (the real ones are isArrayEmpty /
# isArrayNonEmpty, which take a MUTABLE Array<A>).
grep -rn "isEmptyArray\|isNonEmptyArray" src/

# Mutable-array predicates applied to a Model field: won't compile on ReadonlyArray
grep -rn "isArrayEmpty(model\.\|isArrayNonEmpty(model\." src/

# Hand-rolled form controls: should use Input.view / Textarea.view / Button.view
# from '@foldkit/ui'. Inside a component's own `toView` callback you DO render the
# element, spreading the component's attribute group (`...attributes.input`),
# usually on a different line, so eyeball each hit rather than grepping it out.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?(input|textarea|button)\(" src/

# Spread inside modifyFields. foldkit/no-spread-in-modify-fields only inspects a
# Property whose value is an arrow updater, so a spread in the updates object
# itself is unflagged. Narrow to files that call modifyFields, then read each
# spread's enclosing call.
grep -rl "modifyFields(" src/ | xargs grep -Hn "\.\.\."

# Option ceremony: Array.findFirst(...)._tag === 'Some' should be Array.some(...)
grep -rn "Array\.findFirst.*_tag" src/

# Scene tests without assertions: a scene(...) block that only does given(model)
# verifies the view doesn't throw and nothing else. Each block needs at least
# one expect(...) OR an interaction followed by Command.resolve(...).
grep -rnE -A 6 "(^|[^.[:alnum:]_])scene\(" src/ --include="*.test.ts"

# Possible ordinary call wrapped in pipe. A plain pipe(x, Option.match(...))
# should be Option.match(x, ...).
grep -rn "pipe([a-zA-Z_]*,\s*$" src/ -A 1 | grep "Option\.match\|Array\.map\|Effect\.runSync"

# Length checks: use Array.match on a Model array, or String.isNonEmpty for strings
grep -rn "\.length > 0\|\.length === 0\|\.length !== 0" src/

# Stuttery modifyFields setters: when a setter only transforms that same field,
# pass the transformer directly. Look for `field: () => f(model.field)` and
# `field: () => Array.map(model.field, f)`; prefer `field: f` or `field: Array.map(f)`.
grep -rnE "([a-zA-Z]+): \(\) => [A-Za-z.]*\(model\.\1\b" src/

# Labels without For: should pair with Id on the input, or use Input from
# '@foldkit/ui'. The attribute array often starts on the next line, so read
# each call's attribute block.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?label\(" src/

# maybe* on non-Option: should be Option<T>
grep -rn "maybe[A-Z][a-zA-Z]*: [A-Z][a-zA-Z]* | undefined" src/
grep -rn "maybe[A-Z][a-zA-Z]*: string\b\|maybe[A-Z][a-zA-Z]*: number\b\|maybe[A-Z][a-zA-Z]*: boolean\b" src/

# h.span([]): use h.empty.
grep -rnE "(^|\.)span\(\[\](, \[\])?\)" src/

# Effect.ignore on infallible Effects (pushUrl, load, back, forward)
grep -rn "pushUrl.*Effect\.ignore\|load(.*)\.pipe.*Effect\.ignore" src/

# outline-none without focus-visible replacement
grep -rn "outline-none" src/ | grep -v "focus-visible:"
```

Alongside the greps, eyeball each file's imports. Every symbol you imported should be used.

## Structural completeness

- [ ] Every Message variant is declared once in `defineMessageUnion()`, and every Block's `update` record has a handler for each of its tags.
- [ ] Every child OutMessage the parent cares about has an `.on` handler, and each handler names its variant.
- [ ] Every Command and Mount listed on a class has a handler under `commands` / `mounts`, and every result Message has an update handler.
- [ ] Independent workflows have independent pending/error state. Retained editors survive repeated URL delivery and refresh; removed instances end their lifecycle deliberately. Mutation results preserve unrelated newer data.
- [ ] Every route variant has a corresponding view branch.
- [ ] Every `Succeeded*` has a paired `Failed*`.
- [ ] Every discriminated union variant is handled in both update and view.
- [ ] Each Schema has its same-named decoded type immediately below it with no blank line. Child types are derived from the class (`typeof Search.Message.Type`).

## Blocks and Program wiring

- [ ] Each Block is a class named for its feature (`Search`, `Application`) with a matching string id, and its Layer is `SearchLive` / `ApplicationLive`. A generic UI factory's result is named once at module scope and provided through `.Live`.
- [ ] Messages, OutMessages, Commands, and Mounts are declared at module level, before the class, and listed on it.
- [ ] Each constructor is an `Effect.fn` that yields Services and declares children, returns the starting Model synchronously, and lists startup work under `start`. No async work in the constructor body.
- [ ] Constructor args replace init arguments. The root's args are `{ url }` with routing, `{ flags }` with Flags, both, or none.
- [ ] Child instances live in the parent Model, with the child class as the field Schema (`search: Search`, `Schema.Option(Dialog)`, `Schema.Array(Row)`, `Schema.Record(Schema.String, Editor)`, or a tagged variant field). Never HashMap, HashSet, or a class instance.
- [ ] Instance ids are unique within the parent. Keyed instances come from one `each` factory per collection and use a stable domain key, never an array index or a generated value that changes on re-render.
- [ ] A parent changes a child only through `send` under `messages`, reads it through `model.child.model`, and handles its facts through `.on`. It never rewrites a child's fields.
- [ ] A child rendered with callbacks declares its view input as the third type parameter; attributes it builds for the parent use `childAttributes(...)`.
- [ ] A stateful handle (socket, camera, library instance) is a child Block that acquires it with `Effect.acquireRelease` in its constructor and `expose`s it; the parent holds the child in an `Option` field while the handle should exist, and parent Commands read it with `instance.use`, mapping `NotConnected` to a Message.
- [ ] `entry.ts` calls `Program.make(Application, { layer, container, routing?, Flags?, devTools })` (or `Program.makeElement`) and `Runtime.run(program)`. With Flags, `Runtime.run(program, { flags })` provides the Effect's Services.
- [ ] `layer` provides the root Live Layer, every child Block's Live Layer (to each parent that creates it, or inside the child's own Live), and `ApplicationLayer` of ordinary Services.
- [ ] Constructor-yielded Services are execution infrastructure. Handlers close over them and capture no Command args, current time, Subscription dependencies, or DOM elements in the constructor.
- [ ] Mutable handler or Service state is execution bookkeeping only. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor is never the source of truth for workflow decisions or state read by view.
- [ ] External DevTools dispatch uses `devTools: { dispatch: true }`. Omitting `devTools` keeps inspection with dispatch disabled; `devTools: false` disables DevTools entirely.

## Purity

- [ ] update handlers have no side effects (no DOM, no randomness, no I/O)
- [ ] view functions have no side effects
- [ ] constructors do no asynchronous work and read no clock, storage, or randomness (Flags and `start` Commands do)
- [ ] No `let` declarations anywhere
- [ ] No mutation (`.push()`, `.splice()`, object mutation)
- [ ] No `Effect.runSync` / `Effect.runPromise` outside of Commands

## Commands

- [ ] Every Command is defined at module level with `Command.define(name, { args?, messages })`, assigned to a PascalCase constant, and listed on its Block's `Command: [...]`
- [ ] No inline Command definitions in pipe chains
- [ ] Definitions are declared in the file of the Block whose update returns them
- [ ] Handlers live under the constructor's `commands`, close over constructor-yielded Services, and return Effects with no remaining requirements
- [ ] Every _fallible_ Command catches its errors: `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Infallible Effects need no catch and no `Failed*` Message. UUID generation via `Crypto.Crypto` uses `Effect.orDie`; a crypto failure is a defect, not a domain error
- [ ] Return types inferred. No explicit annotations on definitions
- [ ] Commands that can't meaningfully fail return `Completed*` Messages, payload-carrying ones included
- [ ] Command args carry values already in the Model or Message; time, randomness, and UUIDs are read inside the handler

## Mount, Command, Stream, Subscription, exposed handle, CustomElement: pick by what causes the side effect

- [ ] **One-time effect after a Message dispatched** → Command. Focus-on-open, navigation, network, storage, analytics, and scroll lock paired with a modal opening or closing belong in update's return, not in `OnMount`.
- [ ] **Per-element lifecycle where the live `Element` is needed** → Mount. Measuring a panel with `element.getBoundingClientRect()`, anchor positioning, backdrop portaling, attaching observers or listeners to a specific element, and third-party library instantiation share this shape. `Mount.define(name, { args?, messages })` for one-shot work, `Mount.defineStream` for continuous events; list it under `Mount: [...]`, implement it under `mounts`, attach it with `h.OnMount(X(args))`.
- [ ] **External event source for the instance's whole life** → `stream`. Global key bindings, a clock that always runs.
- [ ] **External event source gated by Model state** → a `subscriptions` entry whose `dependencies` extract exactly what the Stream needs and whose `stream` returns `Stream.empty` when the condition is off.
- [ ] **Stateful runtime object** (WebSocket, camera stream, library instance) that Commands use → a child Block that acquires it in its constructor and exposes it. There must be a handle for Commands to use.
- [ ] **Native web component** (anything that speaks typed JS properties, observed attributes, and dispatched `CustomEvent`s) → `CustomElement.define({ tag, properties, events })` after a side-effect import that registers the element.

### Two practical rules for Mount (both must hold)

- [ ] **The Mount handler uses the element it receives.** If it doesn't read or write the element, Mount is the wrong primitive.
- [ ] **The work is DOM measurement, DOM manipulation, or continuous element-scoped event listening on that element.** Anything else (network, storage, analytics, focus-on-transition, page scroll lock) is a Command.

### Replay safety

- [ ] A Mount's handler runs again during DevTools time-travel renders. The two rules above keep Mount work replay-safe (read-only measurement, idempotent DOM mutation, paired attachment and cleanup via `Effect.acquireRelease`). If a Mount disrupts the live page on replay (focus stealing, scroll locking, library re-instantiation), it shouldn't be a Mount.

### Smell check

- [ ] **Don't reach for Mount just because the work coincides with an element appearing.** If a Message just dispatched (`Opened*`, `Submitted*`), the cause is the Message. Focusing a search input when its dialog opens is a `FocusInput` Command returned from the `Opened` handler.
- [ ] **`Effect.acquireRelease` construction lives INSIDE the acquire body.** If the acquire body reads as `Effect.sync(() => alreadyExistingValue)`, the construction happened earlier and the release is dangling. Applies to constructors, Mount handlers, and Stream bodies.

### Naming

- [ ] Mount definitions are verb-first imperatives: `AnchorPopover`, `MeasurePanel`, not `PopoverAnchor`. Mount result Messages are past-tense: `CompletedMeasurePanel`, `SucceededMountChart`.

## Naming

- [ ] Messages are past-tense, verb-first
- [ ] Input changes use the `Updated*` prefix (e.g. `UpdatedEmail`), not `Changed*`
- [ ] Parent-sent Messages are `Requested*` (requests) or `InformedOf*` (notifications)
- [ ] `Completed*` uses verb+object order: `CompletedFocusInput` not `CompletedInputFocus`
- [ ] Option fields prefixed with `maybe`
- [ ] Model fields containing `AsyncData` values end with `AsyncData`
- [ ] Boolean fields prefixed with `is`
- [ ] No opaque abbreviations or unexplained single-letter names
- [ ] Constants for all magic numbers
- [ ] Schema literals are capitalized: `Schema.Literals(['Active', 'Inactive'])`

## State modeling

- [ ] Discriminated unions for multi-valued state (not booleans)
- [ ] `Option` for absent fields (not empty strings, null, or zero)
- [ ] Impossible states are unrepresentable
- [ ] `defineTaggedUnion()` for non-Message domain unions and Model states
- [ ] `defineRouteUnion()` for Routes
- [ ] `taggedStruct()` only when the variants cannot be declared together
- [ ] `defineMessageUnion()` for Message and OutMessage unions
- [ ] **Remote data uses `AsyncData`, not a hand-rolled union.** A hand-rolled `Idle | Loading | Error | Ok` is missing `Refreshing` and `Stale`, which forces a refetch to blank the screen and a failed refetch to discard good data

## Framework modules over hand-rolled equivalents

Foldkit ships these; reaching past them is a finding, not a style choice.

- [ ] `update` is a record with one handler per tag, not a `Message.match` or `switch` inside one function. The record stays in the Block's constructor; a Block too large to read in one file extracts a feature that owns its own state, effects, or lifecycle into a child Block, and keeps render-only markup as view functions.
- [ ] Handlers omit `commands`, `outMessage`, and `messages` when they statically produce none, return computed collections directly, and never write `commands: []`.
- [ ] Update-like results from helpers are bound to values named after their operations and consumed with dot access, not destructured or renamed.
- [ ] An OutMessage that is already known is included directly in a new result. `Update.withOutMessage` is used for an existing result or a value of type `OutMessage | undefined`.
- [ ] Two-or-more-Step post-mutation handlers use `Update.combineSteps(model, [...])` and `Update.refresh({ read, revalidate, write, load })` rather than hand-threaded `modifyFields` chains and conditional Command arrays. One Step is not wrapped in `Update.combineSteps`, and an inline Step parameter is named `stepModel`.
- [ ] A child's Commands are never mapped or re-issued by the parent; the child's own `commands` handle them and their results return to the child.
- [ ] HTTP uses `HttpClient` from `effect/http`, yielded in the constructor, with `Http.layer` from `foldkit` provided in `ApplicationLayer`.
- [ ] UI components are imported from `@foldkit/ui` by name. There is no `Ui` namespace on `foldkit`.

## Effect-TS patterns

- [ ] `pipe()` keeps a meaningful transformed value as the subject of left-to-right data flow; ordinary single calls stay direct
- [ ] A declared union's `match` / `matchOrElse` for exhaustive / partial matching; Effect `Match` for partial matches, shared multi-tag handlers, and unions without their own matcher (no switch)
- [ ] `Array.match({ onEmpty, onNonEmpty })` for branching on a Model array (not `.length` checks, and not the mutable-array predicates)
- [ ] `modifyFields()` for Model updates (not spread)
- [ ] Callable constructors (not `as` casts or manual `_tag` objects)
- [ ] Message and OutMessage constructors stay on their owning namespace; a child's are reached through its class (`Search.Message.RequestedClear()`)
- [ ] No-field tagged structs called with NO argument: `Idle()`, `Message.ClickedSubmit()`. Never `Idle({})`
- [ ] `Option.match` preferred over `Option.map` + `Option.getOrElse`

## View

- [ ] Branches are never keyed; each branch renders through a view function, with a same-tag inline ternary extracted into named view functions when switching must reset DOM state
- [ ] Collections of child instances are keyed by `instance.id`
- [ ] Events dispatch Messages, never perform actions directly
- [ ] The primary view leaves `h` unannotated. Extracted helpers take only the values they read plus `h` typed with a local alias such as `type SearchViewBuilder = HtmlBuilder<Message>`
- [ ] Semantic HTML elements (`main`, `nav`, `section`, `article`, `header`, `footer`)

## Foldkit UI

- [ ] Foldkit UI components used where the interaction matches (Dialog, Tabs, Menu, Combobox, DatePicker, FileDrop, Toast, Tooltip, DragAndDrop, etc.). Never hand-roll accessible widgets
- [ ] **Form inputs use `Input.view`, `Textarea.view`, `Button.view` from `@foldkit/ui`.** Hand-rolled `input`/`textarea`/`button` elements in a form are a fail unless the file has a NOTE explaining why the component couldn't be used.
- [ ] Each stateful component is a child instance: declared with `yield* new Dialog.Dialog(id, args)` (or a named `makeBlock` result), stored in the Model with the class as its field Schema, driven by sent Messages, handled with `.on`, rendered with `model.x.view({ ... })`, and its Live Layer provided. Stateless render helpers (`Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`) are called directly in view with your `h`; the controlled ones take the current value from the parent Model, which stores the new value on toggle
- [ ] Only the components you construct have their Layers provided; components that depend on others (Dialog on Animation, DatePicker on Calendar and Popover) already provide them
- [ ] No custom keyboard navigation or ARIA attributes for patterns covered by Foldkit UI components

### Mechanical check: no hand-rolling

Run these greps against `src/`. Every hit needs an explanation: a sanctioned `toView` spread, a `NOTE:` justification, or a fix.

```bash
# Raw input / textarea / button: should use Input, Textarea, Button.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?(input|textarea|button)\(" src/

# Hand-rolled ARIA: should use Dialog / Menu / Tabs. Capital-R `Role(` is the
# view attribute; lowercase `role(` is a test locator and is not a finding.
grep -rnE "(^|[^.[:alnum:]_])(h\.)?Role\(['\"](dialog|menu|tab)" src/
```

A call that spreads the component's own attribute group (`...attributes.input`, `...attributes.textarea`, `...attributes.button`) is the sanctioned `toView` case, not a finding. The spread usually sits on a later line than the element call, which is why this exclusion is a read rather than a `grep -v`.

The rule: **if the interaction pattern appears in the `@foldkit/ui` component table (Phase 2.5 of SKILL.md), use the component.** A hit is only a finding once you know which of these it is:

- **Inside the component's own `toView`** (the call spreads `...attributes.input` / `.textarea` / `.button` / `.label`): sanctioned.
- **A form control** (a text input, textarea, or button in a form): must go through `Input`, `Textarea`, or `Button`. Raw here is a BLOCKER unless a `// NOTE: hand-rolling because <specific reason>` sits above it.
- **A deliberate non-form control** (a search field, an inline editor): allowed. Check it directly against the Accessibility section below, since nothing is supplying label wiring, focus ring, or ARIA for you.

**A NOTE is not a free pass.** Before writing one, read the component's `.d.ts` and confirm the concern is real. Common false justifications:

- _"Using the component would require a per-row instance and duplicate state"_: first check whether the component is stateful. `Checkbox`, `Switch`, and `Disclosure` are controlled render helpers with no child Model. For stateful components, the component Model holds UI state (focus, open/closed, typeahead buffer), not your domain value, so holding it is not duplication. A keyed collection uses one `each` factory.
- _"The component is too hard to wire"_: a child is one `yield* new Child(...)`, one Model field, and one provided Layer.
- _"The interaction is too custom for the component"_: check the `toView` view input. It lets you render whatever HTML you want inside the component's attribute scaffolding. Custom visuals are fine; custom a11y is never needed.

Reviewers should challenge every NOTE: "Is this justification true? What does the `.d.ts` say?"

## Accessibility

Foldkit UI components ARE the a11y pass for their covered patterns. These checks apply to anything NOT covered by a `@foldkit/ui` component and to the overall document structure.

- [ ] Exactly one `h1` per route. Headings descend without skipping levels.
- [ ] Semantic landmarks used: `main`, `nav`, `header`, `footer`, `aside`, `section`. Not `div` soup.
- [ ] Every `label` is associated with its input: `h.label([h.For('email-input')], ['Email'])` paired with `h.input([h.Id('email-input'), ...])`, or `Input.view`, which handles the association. Read each `label(` call's attribute block for `For(`. A `...attributes.label` spread is the component's own `toView`.
- [ ] Every `input`, `textarea`, and `select` has an associated `label` or an explicit `AriaLabel(...)`.
- [ ] Icon-only buttons have `AriaLabel(...)` describing the action.
- [ ] Dynamic error messages use `Role('alert')` (immediate errors) or `AriaLive('polite')` (non-urgent updates). Grep for error-class CSS (e.g. `text-red`) and verify each error container is announced.
- [ ] External links (`Target('_blank')`) also have `Rel('noopener noreferrer')`.
- [ ] Images have `Alt(...)`. Decorative images use `Alt('')` explicitly.
- [ ] Interactive lists use `ul`/`ol` + `li`, not `div` stacks.
- [ ] Required form fields are marked `AriaRequired(true)` on the rendered input. `Input.view` has no `required` option, so pass it through the `toView` callback's `input` attribute group.
- [ ] Focus is visible, via Tailwind's `focus-visible:` classes or the browser default. If you reset outline, replace it.
- [ ] Color is not the only carrier of meaning. A red border on an invalid input needs an accompanying error message or icon.
- [ ] The page `<title>` is set via the `title` field of the root view's `Document` with `Program.make`. For routed apps, each route returns a distinct title.

### Mechanical check: a11y

The greps below are **fast starting scans**, not authoritative. `foldkit/require-rel-for-external-link` is the real check for external links, but it bails when the attribute array contains a spread. Attributes also span multiple lines, so a fixed `-A` window silently passes anchors whose `Rel` falls outside it. Each scan lists candidates; confirm by reading the whole attribute block.

```bash
grep -rnE "(^|[^.[:alnum:]_])(h\.)?label\(" src/       # labels: read each block for For(
grep -rn "_blank" src/                                  # then read each anchor's block for Rel(
grep -rn "outline-none" src/ | grep -v "focus-visible:"  # killed focus outline without replacement
```

Each confirmed miss is a concrete a11y bug a screen reader user would hit.

## Forms, dates, and files

- [ ] Form validation uses `foldkit/fieldValidation` (`Field`, `makeRules`, `validate`, `allValid`). No hand-rolled `Valid | Invalid` unions when validation is the concern
- [ ] Date handling uses the `Calendar` module (`Calendar.CalendarDate`, `Calendar.today.local`). No raw `Date` objects in the Model
- [ ] File handling uses the `File` module with `FileDrop` from `@foldkit/ui`. No direct `File` API usage in update or view

## File organization

- [ ] One file, one Block. Each Block's Message and OutMessage unions, Model Schema, Command and Mount definitions, class, and `Live` Layer live in one file named for it in camelCase: `application.ts` for the root, `issueBoard.ts` for `IssueBoard`
- [ ] No Block is split across `message.ts`, `model.ts`, `update.ts`, `command.ts`, `view.ts`, `subscription.ts`, or `flags.ts`, and no Block has an `index.ts` barrel
- [ ] The only files that are not Blocks are `entry.ts` (and `entry.server.ts`), `services.ts`, `route.ts` when several Blocks share `ApplicationRoute`, `domain/` modules used by more than one Block, and tests and fixtures beside their Block
- [ ] `entry.ts` builds the Program and starts the Runtime; nothing else starts execution
- [ ] A page with child Blocks only it uses is grouped in a folder named for the page: `page/settings/settings.ts` and `page/settings/themePicker.ts`
- [ ] No empty scaffolding files
- [ ] Single-file apps use names and blank lines for structure. Section headers appear only for substantial groups that need wayfinding
- [ ] Complex update handlers extracted to `handle<MessageTag>` functions
- [ ] view decomposed when branches exceed ~30 lines

## Testing

**Story tests** (required at every tier):

- [ ] Tests import `describe`, `expect`, `it` from `@effect/vitest` and wrap each case in `it.effect(() => story(...))`; `@effect/vitest` is in devDependencies
- [ ] `story.test.ts` exists (sibling pages or component variants use a subject prefix: `login.story.test.ts`), beside the code under test
- [ ] `story` receives a Block's Layer, with child Layers attached through `Layer.provide`, constructor args after the Layer when the Block takes them, and constructor Services supplied with `.pipe(Effect.provide(TestLayer))`
- [ ] Every fallible Command (`Succeeded*`/`Failed*` pair) tested for both outcomes
- [ ] At least one multi-step test that chains Messages and Command resolutions
- [ ] Child Block tests assert OutMessages with `expectOutMessage` / `expectNoOutMessage`
- [ ] Commands are asserted with `Command.expectHas` / `expectExact` / `expectNone` and resolved with `Command.resolve(Definition, resultMessage)`; Command Effects are never run directly in a Story
- [ ] Child Messages, including Stream and Subscription emissions, are delivered with `message(Block.deliver(Child, path, Child.Message.X()))`
- [ ] `given` sets state but never adds or removes instances; tests that need a new instance send the Message that creates it
- [ ] Whole-application execution tests keep the production Layers and replace Service providers at the lowest boundary the test does not need to exercise
- [ ] The TypeScript project includes `*.test.ts`, so Story and Scene API changes fail during the normal typecheck
- [ ] All tests pass with the project's test script

**Scene tests** (REQUIRED at Tier 3+; strongly encouraged at Tier 2):

For Tier 3+ apps (routing, async Commands, forms), missing `scene.test.ts` is a **BLOCKER**.

- [ ] `scene.test.ts` exists: a root-level file for flows that cross pages, plus one in any page folder whose own rendering and interaction warrant it
- [ ] View rendering test: initial view has expected elements (headings, inputs, buttons)
- [ ] User interactions test: click, type, submit produce visible changes
- [ ] At least one test per discriminated-union state that has distinct view output (loading, error, empty, populated)
- [ ] Uses accessible locators: `role(...)`, `label(...)`, `text(...)`. Not `placeholder` or CSS selectors
- [ ] Scoped queries with `within` or `inside` when a container holds multiple similar elements
- [ ] Mounts the view renders are resolved with `Mount.resolve(Definition, resultMessage)`, and Mounts that unmount during the scene are acknowledged with `Mount.expectEnded`
- [ ] A Block that takes a view input is tested through a small test-only parent Block that renders it
- [ ] Deliberate concurrent interactions use `Command.keepPending` for one exact invocation, resolved before the Scene ends

---

# Quality Bar (beyond "it works")

The sections above cover correctness. The sections below cover the craft details that distinguish typing-game / website quality from generic valid code. The bar is: would a careful reader believe this was hand-written by the authors of `packages/typing-game/client/src/` or `packages/website/src/`? If not, keep working.

**Tier-aware:** every item below applies at every tier UNLESS marked otherwise:

- `[T2+]`: applies once the app has Streams, Subscriptions, or persisted state
- `[T3+]`: applies once the app has async Commands or routing
- `[T5+]`: applies once the app has nested domain state, multiple entities, or child Blocks

Items without a tier marker apply universally (even to a 50-line counter). When in doubt, assume universal.

## Decomposition

- [ ] Every function operates at a single abstraction level: orchestrators delegate, implementations implement. If a function reads like it's doing two things, extract one.
- [ ] Substantial update behavior is extracted into named `handle<MessageTag>` functions when that makes the update record easier to read. Trivial results stay inline; do not create a file per Message.
- [ ] Substantial Command handlers are extracted into functions in the Block's file, above the `Live` Layer, that take the Services they need and return the handler.
- [ ] **View branches over ~30 lines are extracted** to named view functions. [T5+] If the view for a single route or state exceeds ~100 lines and owns its own state, make it a child Block in its own file.
- [ ] No function exceeds ~40 lines without extraction.
- [ ] [T5+] A feature whose Messages dominate the root update record, or that owns its own effects and lifecycle, is a child Block rather than a section of the root.

## Effect module usage (consistency, not correctness)

- [ ] Native methods replaced with Effect equivalents _in pipe chains_: `Array.map(items, f)` not `items.map(f)` when composing.
- [ ] `Option.match({ onNone, onSome })` preferred over `Option.map(...).pipe(Option.getOrElse(...))`.
- [ ] `Array.match({ onEmpty, onNonEmpty })` when handling both empty and non-empty cases on a Model array. No `.length > 0`, `.length === 0`, or `.length !== 0`.
- [ ] `Equal.equals(target)` in predicates: `Array.findFirst(items, Equal.equals('Other'))` not `item => item === 'Other'`.
- [ ] `Array.fromOption(maybeCommand)` for "zero or one Command based on Option".
- [ ] `Option.liftPredicate(value, predicate)` only when the predicate meaningfully examines the value. A Boolean-conditioned Command group uses `Array.filter(commands, () => condition)`.
- [ ] In multi-line pipes, data leads on its own line: `pipe(\n  data,\n  Array.map(f),\n  ...\n)`.
- [ ] `modifyFields` setters are point-free when they only transform that same field: `entries: Array.map(f)`, `count: Number.increment`.
- [ ] Callback destructuring when accessing a single field: `({ id }) => id === cardId` not `card => card.id === cardId`.

## Domain organization [T5+]

- [ ] **If several Blocks use the same domain entities, they live in `src/domain/`**, not inline in one Block's file. One file per concept (`domain/column.ts`, `domain/card.ts`), imported as a namespace (`import * as Column from './domain/column'`).
- [ ] **Pure domain logic lives in `domain/*.ts`**, not in update handlers. If update is doing array surgery on domain entities, that surgery belongs in the domain module.
- [ ] Domain files export Schemas AND pure operations on them. Update calls the operations; it doesn't reimplement them.
- [ ] Domain modules never import a Block's file. Domain is the leaf layer.
- [ ] References: `repos/foldkit/examples/shopping-cart/src/domain/`, `repos/foldkit/examples/job-application/src/domain/`, `repos/foldkit/examples/auth/src/domain/`.

## Naming precision

- [ ] Every Option-typed value is prefixed `maybe*`. No exceptions.
- [ ] No `maybe*` name holds a native `T | undefined`.
- [ ] Internal API boundaries (helper configs, view helpers, domain operations) use `Option<T>` for optional fields, not `T | undefined`.
- [ ] Boolean fields prefixed `is*`.
- [ ] Block classes are named for the feature (`IssueBoard`), Layers with `Live` (`IssueBoardLive`), and Block files in camelCase (`issueBoard.ts`).
- [ ] Command and Mount definitions are verb-first PascalCase imperatives that describe the effect their handlers perform.
- [ ] Message names are verb-first past-tense. Never noun-first (`SubmitClicked`) or imperative (`FetchWeather` as a Message).
- [ ] A Command's result Message is named from the Command: `DetermineStartTime` → `CompletedDetermineStartTime`. The only exception is a Message with more than one cause.
- [ ] Named helpers use specific verbs: `enqueueMessage` not `addMessage`, `announceKeyboardDrag` not `announce`.
- [ ] Names are immediately understandable in context: `signature` not `sig`, `tickCount` not `t`, `index` not `i`. Conventional shorthand (`attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, `VNode`, `h`) is allowed.

## File structure and exports

- [ ] A Block's file exports its class and `Live` Layer, plus the definitions its tests resolve. Implementation details stay private.
- [ ] Section headers appear only where a long file has substantial groups that need wayfinding. Other comments are sparse: `// NOTE:` only for a timing dependency, browser quirk, or external constraint that clear names cannot express.
- [ ] No `index.ts` barrel for a Block. A parent imports the class and `Live` Layer from the Block's file.
- [ ] Imports ordered: npm packages first (alphabetized), then `foldkit/*`, then relative imports.
- [ ] Message unions have `type Message = typeof Message.Type` immediately below the Schema, with no blank line. Constructors stay on the owning namespace; when an extracted handler needs a variant type, declare an alias beside the union, such as `type ClickedSave = typeof Message.ClickedSave.Type`.
- [ ] [T5+] A child's OutMessage union is declared in the child's file beside its Message union.

## Streams and Subscriptions [T2+]

- [ ] An always-on source is the Block's `stream`; a Model-gated source is a named `subscriptions` entry. A child's sources stop when the child leaves the Model, so a parent gates a whole child by removing it.
- [ ] `dependencies` extracts exactly the data the Stream needs, not the whole Model, and the Stream returns `Stream.empty` when its condition is off.
- [ ] Message mapping happens inside the Stream (`Stream.map(event => Message.UpdatedX({ data: event }))`), not scattered through update. Stream errors become `Failed*` Messages inside the Stream.
- [ ] Entries are named for the events they supply (`keyboardPresses`, `stopwatchTicks`), not `watch*`.
- [ ] Substantial Stream implementations are extracted into named functions in the Block's file, above the `Live` Layer.

## Exposed handles [T7]

- [ ] A stateful handle is acquired inside the child's constructor with `Effect.acquireRelease`, constructing the resource inside the acquire Effect.
- [ ] The parent holds the child in an `Option` field exactly while the handle should exist; removing it releases the handle.
- [ ] Parent Commands read the handle with `instance.use` and map `NotConnected` to a result Message. No handle is stored in a Ref, Service, or module variable.

## Testing quality

- [ ] Test names state the behavior: `'surfaces a validation error when email is malformed'`, not `'tests validation'`.
- [ ] Each `story` pipeline reads as a narrative: starting Model → action → assert → action → assert.
- [ ] Scene tests use accessible locators (`role('button', { name: /submit/i })`, `label('Email')`).
- [ ] Shared fixtures (the composed test Layer, start args, `given` Models) are named once at the top of the file, as `examples/routing/src/story.test.ts` does.

## Residual code smells (each is a fail)

- [ ] No `console.log`, `console.error`, or any `console.*` outside of test fixtures.
- [ ] No commented-out code blocks.
- [ ] No TODO/FIXME/XXX comments in generated code.
- [ ] No `any` types. No `as` casts except where Schema decoders require them at boundaries.
- [ ] No `let` outside tight imperative loops where mutation is genuinely unavoidable.
- [ ] No inline magic numbers in logic: `if (count > 5)` → `const FINAL_PHOTO_INDEX = 5; if (count > FINAL_PHOTO_INDEX)`.
- [ ] No dead code, unused imports, unused exports, or stub types (`type Foo = {}`).
- [ ] No `globalThis.*` references other than qualifying a global shadowed by an Effect module import.
- [ ] No `T[]` syntax; always `Array<T>` or `ReadonlyArray<T>`.

## Final exemplar comparison

Pick one generated file at random and read it next to the equivalent file in `packages/typing-game/client/src/` or `packages/website/src/page/`. Ask:

- Does the generated file look like it was written by the same hand? If you swapped it into the exemplar's directory, would a reader notice?
- Does the decomposition feel inevitable, or arbitrary?
- If you removed any line, would a reviewer miss it?

If the answer to any of those is "no" or "I'd notice," flag the file for another pass.
