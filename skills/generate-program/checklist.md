# Post-Generation Verification Checklist

Run through each category after generating an app. Fix any issues before presenting the result.

> **This is the canonical reference for mechanical checks.** `SKILL.md` phases 4.5, 5, and 5.5 point here rather than duplicating the grep commands inline, to prevent drift. If you update a grep or add a new one, update it here. The phases will inherit the change.
> Example paths assume a consumer project with the Foldkit subtree vendored at `repos/foldkit/`. Working inside the Foldkit repo itself, drop that prefix; the same paths exist at the project root.

## Gate commands (run ALL FOUR; fix everything they surface)

- [ ] `format`: run FIRST; rewrites files so subsequent gates see the committed shape. The scaffold wires Oxfmt.
- [ ] `lint`: output clean. This is the substantive structural gate, not just a style pass: the scaffold wires oxlint **and** `@foldkit/oxlint-plugin`, whose 24 `foldkit/*` rules enforce keyed rows, route printing, child ownership, Command naming, and more. Treat any `foldkit(...)` diagnostic as a blocker; that is how they are labelled in the output. It also catches the unused imports `tsc` does not.
- [ ] `typecheck`: no errors. The scaffold wires `tsc --noEmit`.
- [ ] `test`: all tests pass. The scaffold wires vitest.

The project's configured script is the contract for each gate; the tools named
are what `create-foldkit-app` happens to wire up. If a project swapped one out,
run its script, not the tool named here.

Invoke each through the package manager the project was scaffolded with (`npm run lint`, `pnpm run lint`, `yarn lint`, `bun run lint`). If a script is missing, run the project-local binary through that manager's exec (`pnpm exec oxlint src`, `npm exec --no-install oxlint src`, `yarn exec oxlint src`, `bun x --no-install oxlint src`). Avoid bare `npx`, which fetches from the registry when the binary isn't installed locally.

"Typecheck clean and tests pass" is NOT sufficient. Generated code rarely matches Oxfmt's output out of the box, and frequently has unused imports (`Invalid`, `NotValidated`, `Valid` imported as values when only used as string-literal tag keys in `Match.tag(...)`) that only the linter catches. Skipping either means the user's first `git commit` produces a cascade of formatting/lint fixes they have to clean up.

## Mechanical scans (run on every file before tsc)

**Run the linter before any of these.** `@foldkit/oxlint-plugin` ships AST rules with a `recommended.json` preset.
`create-foldkit-app` installs and wires that preset, so `npm run lint` already
enforces its application conventions in a scaffolded project.
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
empty-object tagged calls, `Rel` on external links, spread inside `modifyFields`,
parent construction of child-owned Messages, PascalCase named Command definitions, and no `NoOp`
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
# constructors, Message/Route/State namespaces, and unions declared in this
# file. Check imported domain unions with other names by eye.
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

# Wrong origin for HttpClient. It lives in 'effect/http'. Assert that
# rather than blacklisting one wrong package: it also gets imported from 'effect'
# and from '@effect/platform', and a blacklist misses whichever one you didn't list.
# Check per FILE, not per line: `import { ... HttpClient ... } from '...'` usually
# wraps, so the name and the module specifier land on different lines and any
# single-line pattern sees neither together.
# (@effect/platform-browser is fine; that's KeyValueStore and Crypto.)
for f in $(grep -rl "HttpClient" src/); do
  grep -q "from 'effect/http'" "$f" || echo "WRONG HttpClient ORIGIN: $f"
done

# Review update return types. Exhaustive makeUpdate records retain per-Message output contracts and inferred Command requirements.
# A Model-preserving Step producing Commands uses the owning
# FeatureDefinition.makeCommandsStep callback; Steps combining field changes with Commands or OutMessages use makeStep. A
# reusable UpdateReturn alias derives child requirements from
# Update.RequirementsOf<typeof childUpdate> and adds other Command-producing
# helpers explicitly. A hand-written plain type must include outMessage?: never;
# prefer the framework type instead.
rg -n 'type [A-Za-z]*UpdateReturn =|Message\.match<Update\.Return|Update\.make' src/
rg -n -U 'type [A-Za-z]*UpdateReturn\s*=\s*Readonly<\{' src/

# Review destructuring that names an update-result field. Application results
# should be operation-named values consumed with dot access. Dot access keeps
# the operation and all of its returned fields visible together, but someone can
# still ignore outMessage. A plain domain record may be fine.
rg -n -U 'const\s+\{[^}]*\b(model|commands|outMessage)\b[^}]*\}\s*=' src/

# Literal empty Commands arrays. foldkit/no-empty-commands-array covers source
# files where the rule is active. Review test files and any disabled paths too.
# A producer with statically no Commands omits the field. A computed Commands
# collection is returned directly without checking whether it is empty.
rg -n -U '\bcommands\s*:\s*\[\s*\]' src/

# Optional update Commands passed through ?? [] before Command.mapMessages.
# The mapper accepts undefined and returns a concrete array, so pass result.commands
# directly. Keep ?? [] where spreading, concatenating, executing, or asserting
# genuinely requires an array.
rg -n -U 'Command\.mapMessages\([^)]*commands\s*\?\?\s*\[\]' src/

# T[] syntax in the return type: use ReadonlyArray<Command<Message>>
grep -rn "readonly Command<.*>\[\]" src/

# Hand-rolled remote-data union: use AsyncData.Schema(Data, Error).
# Eyeball each hit; a non-remote state machine with these names is fine.
grep -rn "Loading: {}" src/

# Stale Effect array predicate names (the real ones are isArrayEmpty /
# isArrayNonEmpty). Note both real ones take a MUTABLE Array<A>: on a Model
# field from Schema.Array(...) use Array.match instead.
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

# Spread inside modifyFields. foldkit/no-spread-in-modify-fields only inspects a Property whose
# value is an arrow updater, and skips bodies with a computed key, so a spread in
# the modifyFields updates object itself is unflagged. Use a nested modifyFields instead.
#
# Don't window this with -A: an updates object runs past any fixed number of lines,
# and piping the window through a second grep drops the file:line that would let you
# find the hit again. Narrow to files that call modifyFields, then print every spread in them
# with its own location. Most hits are unrelated spreads (array literals, attribute
# groups); read each one's enclosing call to see whether it sits in a modifyFields updates
# object. Few enough hits to eyeball, which listing every modifyFields call site is not.
grep -rl "modifyFields(" src/ | xargs grep -Hn "\.\.\."

# Option ceremony: Array.findFirst(...)._tag === 'Some' should be Array.some(...)
grep -rn "Array\.findFirst.*_tag" src/

# Scene tests without assertions: a scene(...) block that only does given(model)
# verifies the view doesn't throw and nothing else. Each block needs at least
# one expect(...) OR a click/type/submit followed by Command.resolve(...).
# Lists every scene block with its following lines. Eyeball each: if it contains
# no expect(...) and no Command.resolve(...), it's a no-op test.
grep -rnE -A 6 "(^|[^.[:alnum:]_])scene\(" src/ --include="*.test.ts"

# Possible ordinary call wrapped in pipe. Check whether keeping the value first
# carries meaning. A plain pipe(x, Option.match(...)) should be Option.match(x, ...).
grep -rn "pipe([a-zA-Z_]*,\s*$" src/ -A 1 | grep "Option\.match\|Array\.map\|Effect\.runSync"

# Length checks: use Array.match on a Model array (the predicates reject
# ReadonlyArray), or String.isNonEmpty for strings
grep -rn "\.length > 0\|\.length === 0\|\.length !== 0" src/

# Stuttery modifyFields setters: when a setter only transforms that same field, pass
# the transformer directly. Look for `field: () => f(model.field)`,
# `field: () => Array.map(model.field, f)`.
# Prefer `field: f` or `field: Array.map(f)`. A registered child field changes
# through the child Binding's named operation, never a Model field transformer.

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
- [ ] Every local Message variant has a case in the exhaustive `makeUpdate` handler record; generated child envelopes route through Composition.
- [ ] Independent workflows have independent pending/error state. Retained editors survive repeated URL delivery and refresh; removed occurrences deliberately invalidate later delivery. Mutation settlement preserves unrelated newer data.
- [ ] Every route variant has a corresponding view branch
- [ ] Every `Succeeded*` has a paired `Failed*`
- [ ] Every discriminated union variant is handled in both update and view
- [ ] Routine application annotations query Schema types directly: `typeof Model.Type` inside the owning feature and `typeof ChildBlock.Model.Type` across a child boundary, with the analogous Message and OutMessage forms. Owned callbacks infer their parameters. Colocated Schema-derived aliases remain only for deliberate public library contracts or useful generic, mapped, and conditional types.

## Application wiring

- [ ] Every concrete typed authoring value has the `Definition` suffix while preserving its runtime ID: `ChildDefinition = Block.makeDefinition('Child', ...)` and `ApplicationDefinition = Block.makeDefinition('Application', ...)`. Compositions use `ChildComposition` and `ApplicationComposition`; completed ordinary values use `ChildBlock` and `ApplicationBlock`, while a generic factory returns an exact completed Block named locally.

- [ ] Every root uses `Block.makeDefinition('Application', { Model, Message })` and creates `ApplicationComposition`. It retains `ApplicationDefinition` when root authoring methods use that value; otherwise it chains the top-level factory directly into `makeComposition({ bindings?, mounts? })`. A graphless root uses `makeComposition()`. It authors init, update, and view through that Composition, lists them explicitly in the private `prepare` producer, and assembles the annotated root with `ApplicationBlock = Block.assemble(prepare)`. The root Block declares no unhandled OutMessage.
- [ ] A genuinely compact root exports `ApplicationBlock` from an all-in-one `application.ts` and retains `ApplicationDefinition` there only when authoring methods use it. A split root exports `ApplicationComposition` from `composition.ts`, assembles `ApplicationBlock` in `block.ts`, and has no `application.ts` aggregation file. `entry.ts` imports the Block, chooses the container and startup inputs, calls `Program.make` or `Program.makeElement`, imports `ApplicationLayer` from root `services.ts`, supplies it through `program.provide(ApplicationLayer)`, and starts the Runtime. Tests and server entries import the passive Block without starting the browser Runtime.
- [ ] Updates use the owning `FeatureComposition.makeUpdate` with an exhaustive handler record, so per-Message Command requirements and registered child routes reach checked assembly. Use `makeUpdate({})` for no local Messages and `.withContext` when handlers need dispatch context. A handler mixing local results with connected recipes uses canonical Definition-owned Steps for its local results. No-op record values call `makeNoopStep()`; the bare factory is not that handler. Raw-only handlers remain supported.
- [ ] Every Command, Subscription, Mount, and ManagedResource handler is included in its owning Block’s local `EffectsLayer` or explicitly declared in `hostHandlers` and supplied through `block.provideHandlers` before binding. `ApplicationBlock` includes the handler graph; the Program's `provide` method supplies remaining ordinary Services. Program host config has no `resources` field.
- [ ] Each Block that owns effects has one local `EffectsLayer` composed only from locally owned handler recipes. Pass it to `FeatureComposition.prepareBlock`; Bindings listed in `FeatureDefinition.makeComposition({ bindings })` contribute their complete handler graphs automatically. Import Effect’s module as `Layer` without an alias. Concrete HTTP, storage, RPC, and browser providers stay open until the root `ApplicationLayer`.
- [ ] The root calls `ApplicationComposition.prepareBlock` with explicit implementation fields. `Program.make` or `Program.makeElement` receives only the Block and host options. `ApplicationLayer` contains ordinary Services only. A child's Layer is not merged again by hand.
- [ ] A selected alternate local handler bundle uses `ChildBlock.replaceEffectsLayer(localRecipe)` before binding the child. Ordinary execution tests keep the real handler graph and replace its Service providers.
- [ ] Layer construction is safe to run eagerly once on every runtime start, before a fresh Flags Effect, init, or the first render. A definition's `.layer` is only a recipe. Its handler generator performs service lookups and returns one function during the application Layer build; Foldkit applies `Effect.gen` internally. Every later Command invocation, Subscription scope, Mount element, or ManagedResource acquisition calls that returned implementation with fresh input while reusing the captured services. Hydration validates the server handoff before acquiring Layers. A restored-Model start builds the Layer too, a construction failure prevents the first render, and runtime stop releases its Scope.
- [ ] Handler generators capture only stable injected services or accessors. They do not capture current time, Command args, Subscription dependencies, a DOM element, or an active ManagedResource handle. Captured services remain fixed when an invocation supplies another service under the same tag; contextual lookups use the merged context, where invocation services win.
- [ ] Returned Effects and Streams keep their Service requirements open unless the handler deliberately selects a different instance or scope. Do not yield a Service solely to re-provide that same instance to the operation. The handler Layer captures its Context; contextual lookups prefer invocation Services.
- [ ] Mutable handler/service state is execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.
- [ ] A page-owning Program starts through `Runtime.run(program.provide(ApplicationLayer))`. With Flags, it declares `Flags` in `Program.make` and calls `Runtime.run(program.provide(ApplicationLayer), { flags })`. An Element with Flags declares both `Flags` and `flags` in `Program.makeElement` and supplies Services through `program.provide(ApplicationLayer)`.
- [ ] External DevTools Message discovery and dispatch use `devTools: { dispatch: true }`. No root Message Schema is passed by hand: Program derives the complete contract, including generated child envelopes, from `ApplicationBlock`. Omitting `devTools` keeps development inspection enabled with dispatch disabled; `devTools: false` disables DevTools entirely.

## Purity

- [ ] update function has no side effects (no DOM, no randomness, no I/O)
- [ ] view function has no side effects
- [ ] init function has no side effects (returns Commands for startup work)
- [ ] No `let` declarations anywhere
- [ ] No mutation (`.push()`, `.splice()`, object mutation)
- [ ] No `Effect.runSync` / `Effect.runPromise` outside of Commands

## Commands

- [ ] Every Command identity defined with its named feature’s `makeCommand` and assigned to a PascalCase constant
- [ ] No inline Command definitions in pipe chains. Always stored as a constant
- [ ] Definitions owned by the same feature as the update that produces them, optionally in feature-local `command.ts`
- [ ] Command definitions omit `execute` and attach production implementations as `config.handler`, a generator constructor that returns the invocation function. Foldkit applies `Effect.gen` internally. Include `Definition.layer` directly in the owning module's `EffectsLayer`; create a standalone `<CommandName>Layer` binding only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly. A zero-yield constructor still uses `function* () { return args => effect }`. Only external host contracts omit `handler`; the host passes the implementation constructor Effect to `toLayer` at its boundary. The entry does not import handler Layers one by one.
- [ ] Every _fallible_ Command catches all errors: `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Infallible Effects (`Clock.currentTimeMillis`, `Random.nextIntBetween`, `Calendar.today.local`) do NOT need catch. If the type system shows no error channel, there's nothing to catch, and no paired `Failed*` Message is needed either. UUID generation via `Crypto.Crypto` uses `Effect.orDie` instead of a `Failed*` Message; a crypto failure is a defect, not a domain error.
- [ ] Return types inferred. No explicit `Command<typeof A>` annotations
- [ ] Commands that can't meaningfully fail return `Completed*` Messages, payload-carrying ones included

## Mount, Command, Subscription, ManagedResource, CustomElement: pick by what causes the side effect

- [ ] **One-time effect after a Message dispatched** → Command. Focus-on-open, navigation, network, storage, analytics, scroll lock paired with a modal opening/closing all belong in `update`'s return, not in `OnMount`.
- [ ] **Per-instance lifecycle bound to a VNode existing**, where the live `Element` handle is needed → Mount. A concrete measurement Mount reads `element.getBoundingClientRect().height` after that rendered panel enters the DOM and returns `Message.CompletedMeasurePanel({ height })`. Anchor positioning, backdrop portaling, attaching observers or listeners to a specific element, and third-party library instantiation are the same ownership shape. Pick the constructor by emission cardinality: `FeatureDefinition.makeMount(name, { messages, handler })` for one-shot Mounts or `FeatureDefinition.makeMountStream(name, { messages, handler })` for continuous events. Include the definition in `FeatureDefinition.makeComposition({ mounts })`, and compose `Definition.layer` directly in local `EffectsLayer`. Per-instance inputs go in `args`; acquisition and cleanup remain scoped to the element.
- [ ] **External event source gated by a Model condition** → Subscription. Timers, document/window events, system theme changes, WebSocket message streams. The factory returns `Stream<Message>` whose lifetime is gated by `modelToDependencies`. Subscriptions look like `FeatureDefinition.makeMountStream` in shape (Stream + `Effect.acquireRelease` cleanup), but the cause anchor differs: Mount = element existence, Subscription = Model condition.
- [ ] **Stateful runtime object** (websocket, camera stream, library instance) keyed on a Model condition, with Commands consuming the handle via `yield*` → ManagedResource. Not a generic "lifecycle on Model condition". There must be a handle for Commands to use.
- [ ] **Native web component** (Shoelace, vanilla-colorful, emoji-picker-element, anything that speaks typed JS properties + observed attributes + dispatched `CustomEvent`s) → CustomElement. Side-effect-import the package to register the element with the browser, then declare its surface with `CustomElement.define({ tag, properties, events })` to get a typed inline builder. Do NOT reach for Mount + Subscription + tag-name registry to wrap a web component; `CustomElement.define` is the higher-level fit when those three surfaces are available.

### Two practical rules for Mount (both must hold)

- [ ] **The Mount handler uses the element it receives.** If it doesn't read or write the element, Mount is the wrong primitive. Pick Command (transition-driven) or paired Commands (lifecycle-bound but element-handle-not-used).
- [ ] **The work is DOM measurement, DOM manipulation, or continuous element-scoped event listening on that element.** Read geometry, mutate CSS, attach an observer/listener, portal the element, hand it to a third-party library. Anything else (network, storage, analytics, focus-on-transition, scroll lock for the page) is a Command.

### Replay safety

- [ ] A Mount's handler runs again during DevTools time-travel renders. The two rules above keep Mount work inherently replay-safe (read-only DOM measurement, idempotent DOM mutation, paired observer attachment+cleanup via `Effect.acquireRelease`). If your Mount touches the live world in a way that disrupts replay (focus stealing, scroll locking the live page, library re-instantiation), it shouldn't be a Mount.

### Smell check

- [ ] **Don't reach for Mount just because the work happens to coincide with an element appearing.** Check what causes the work. If a Message just dispatched (e.g. `Opened*`, `Submitted*`), the cause is the Message, not the element. Use a Command returned from `update`'s handler. Example: focusing a search input when its dialog opens. The cause is `Opened`, not the input's existence; return a `FocusInput` Command from the `Opened` handler.
- [ ] **`Effect.acquireRelease` construction lives INSIDE the acquire body, not before it.** If your acquire body reads as `Effect.sync(() => alreadyExistingValue)`, the construction happened earlier and your release is dangling. `acquireRelease` only guarantees atomicity of "acquire body completes → release is registered"; anything constructed outside the acquire body, even one `yield*` earlier, is unprotected against interruption. Fix: express the construction as the success value of the acquire Effect (`Effect.tryPromise(...).pipe(Effect.map(({ Lib }) => new Lib(...)))` for async imports, `Effect.sync(() => new Thing(...))` for sync construction). Applies anywhere `acquireRelease` is used: a Mount handler, Subscription bodies, anywhere a release function depends on a value produced inside an Effect chain.

### Naming

- [ ] Mount Definition names are verb-first imperatives: `AnchorPopover`, `PortalPopoverBackdrop`, `AttachComboboxPreventBlur`, not `PopoverAnchor` or `ComboboxPreventBlurAttachment`. Mount result Messages are verb-first past-tense: `CompletedAnchorPopover`.

## Naming

- [ ] Messages are past-tense, verb-first
- [ ] Input changes use `Updated*` prefix (e.g. `UpdatedEmail`), not `Changed*`
- [ ] `Completed*` uses verb+object order: `CompletedFocusInput` not `CompletedInputFocus`
- [ ] Option fields prefixed with `maybe`
- [ ] Model fields containing `AsyncData` values end with `AsyncData`; fields storing Query Models are child Block Models and do not take this suffix
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
- [ ] **Remote data uses `AsyncData`, not a hand-rolled union.** `AsyncData.Schema(DataSchema, ErrorSchema)` supplies `Idle`, `Loading`, `Refreshing`, `Failure`, `Stale`, and `Success` plus `match`, `isPending`, `hasData`, `revalidate`, and the rest. A hand-rolled `Idle | Loading | Error | Ok` is missing `Refreshing` and `Stale`, which is what forces a refetch to blank the screen and a failed refetch to discard good data. Reference: `repos/foldkit/examples/weather/src/model.ts` and `repos/foldkit/examples/weather/src/update.ts`

## Framework modules over hand-rolled equivalents

Foldkit ships these; reaching past them is a finding, not a style choice.

- [ ] `FeatureComposition.makeUpdate` receives one exhaustive handler record and no outer `Message.match`. Composition contextually types each handler's Model and exact local Message variant; `FeatureComposition.Message` and `FeatureBlock.Message` add generated child envelopes for dispatch. A public operation that forwards directly into a Message selects its local constructor under `operations`; a constructor with fields takes one constructor payload object with its defaults honored, while an empty-fields constructor takes no payload placeholder. A tuple producer is reserved for input mapping, refinement, defaults, or an exact update context tuple. A reused `UpdateReturn` alias derives requirements with `Update.RequirementsOf<typeof update>` and adds other Command-producing helpers explicitly.

- [ ] Parent-facing operation names describe the communication: `requestCloseMenu` produces `Message.RequestedCloseMenu`, `informJoined` produces `Message.InformedOfJoin`, and `informRouteChanged` produces `Message.InformedOfRouteChange`. Use `request*` for actions and `inform*` for notifications. Both enter child update; avoid silent `reflect*` Model synchronization. Keep an actual UI fact separate when it represents a different event.

- [ ] Update, init, Step, and component helper producers omit `commands` when they statically create no Commands. They return computed Commands collections directly without checking whether the collection is empty. They never write the literal `commands: []`
- [ ] Update, init, Step, and component helper results are bound to values named after their operations and consumed with dot access, not destructured or renamed. Name collisions use a trailing underscore such as `init_`; child `write` parameters use `next<Field>`
- [ ] For Blocks, Bindings, child startup, OutMessages, Composition views,
      handler recipes, and root Services, read and apply
      [Block composition and Layers](../foldkit/references/composition.md). Verify
      every invariant in its final review list against the actual graph.
- [ ] The chosen Binding form matches the parent storage. Initialization policy names
      who creates every occurrence. Explicit `Binding.init` returns a passive
      recipe intact from `Composition.makeInit` or `Composition.makeUpdate`, or
      preserves it through a Definition-owned Step; no code reads `.model` or
      `.commands` from it. The Composition authoring helpers interpret it directly, and
      a completed operation may dispatch a Message whose update branch
      returns the recipe.
      Its exact arguments and complete parent Model are checked there.
- [ ] An exact `Option` of one closed keyed wrapper uses the `field`, `key`, and
      `childField` shorthand. `None`, a missing key, and a different key never
      create or replace an occurrence. Dynamic creation uses `Binding.init`;
      `init.instances` is reserved for keyed arrays.
- [ ] A connected Binding fold or named operation is applied to the contextual
      Model inside `Composition.makeUpdate`, included in `Composition.makeInit`
      startup, or preserved through the parent's `makeStep` producer. Its opaque
      result is returned or composed intact, with no `.model` or `.commands`
      access or useful `{ model }` narrowing before checked execution. Typed raw
      Model calls fail. A completed Block operation accepts its raw Model
      and operation arguments, synchronously dispatches the produced Message
      through update, and returns the readable executed result. Ordinary pure
      Steps remain callable. Method-to-void erasure outside the graph may compile,
      but it only constructs and discards passive configuration and executes no
      child work.
- [ ] An OutMessage that is already known is included directly in a new result. `Update.withOutMessage` is used for an existing plain return or a value with the type `OutMessage | undefined`: an existing return is piped into the helper, while a new result literal is passed first. No local equivalent helper or conditional spread duplicates it
- [ ] Every child with OutMessages selects an explicit policy through `makeBinding(...).withOutMessagePolicy({ fold?, forward? })`, and Composition registers that full Binding. No old `outMessage` field remains in `makeBinding` config
- [ ] Every `FeatureDefinition.makeOutMessageFold(WholeChildBlock, handlers)` call passes the whole completed child explicitly, including inline, extracted, keyed, and staged reciprocal policies. Every variant is named even for a singleton union, with no repeated Step, payload, parent Model, or `FoldContext` annotations. A handler takes inferred context only when it uses `liftCommand` or `modelBeforeUpdate`
- [ ] An ordinary unkeyed forwarding policy inlines `FeatureDefinition.makeOutMessageForward(handlers)` under `withOutMessagePolicy({ forward })`; an extracted forward, keyed adapter, or staged reciprocal policy passes `WholeChildBlock` explicitly. It returns only declared parent OutMessages or `undefined`, names every child variant, and forwards at least one, with no raw matcher, annotation, cast, or generic-list workaround
- [ ] Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

- [ ] Every named Model-first Step value has a descriptive name ending in `Step`, and a purposeful transition factory returning a Step uses an operation name ending in `Step`. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results retain their established names.

- [ ] A split `definition.ts` exports the Step helpers used by its implementation, and implementation modules named-import them from that file. A colocated feature destructures helpers beside its Definition. Definition-qualified calls identify the owner when several Definitions share a module. Feature barrels keep authoring helpers private and export the completed Block.

- [ ] All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

- [ ] Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

- [ ] `Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.
- [ ] Two-or-more-step post-mutation handlers use `Update.combineSteps(model, [...])` and `Update.refresh({ read, revalidate, write, load })` rather than hand-threaded `modifyFields` chains and conditional Command arrays. One Step is not wrapped in `Update.combineSteps`, and an inline Step parameter is named `stepModel`
- [ ] Child Bindings capture generated delivery and origin for child Commands; direct `Command.mapMessages` is reserved for lower-level operations outside composed Blocks
- [ ] HTTP uses `HttpClient` / `HttpClientRequest` from `effect/http`. Handlers leave the client in their requirements, and the application root supplies `Http.layer` from `foldkit`. Not `@effect/platform` (`@effect/platform-browser` is separate and is for `BrowserKeyValueStore` / `BrowserCrypto`)
- [ ] UI components are imported from `@foldkit/ui` by name (`import { Dialog, Input } from '@foldkit/ui'`). There is no `Ui` namespace on `foldkit`

## Effect-TS patterns

- [ ] `pipe()` keeps a meaningful transformed value as the subject of left-to-right data flow; ordinary single calls stay direct
- [ ] `Message.match` for exhaustive Message matching; a declared domain or Route union's `match` / `matchOrElse` for exhaustive / partial matching; Effect `Match` for partial Message matches, shared multi-tag handlers, and unions without their own matcher (no switch)
- [ ] `Array.match({ onEmpty, onNonEmpty })` for branching on a Model array (not `.length === 0` / `.length > 0`, and not `Array.isArrayEmpty` / `Array.isArrayNonEmpty`, which take a mutable `Array<A>` and reject the `ReadonlyArray` that `Schema.Array(...)` decodes to)
- [ ] `modifyFields()` for Model updates (not spread)
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
- [ ] Each stateful UI component has its Model in the app Model, a parent-owned Binding registered in the Composition, an init policy where needed, and generated child delivery. Ordinary components expose a completed `FooBlock`; generic factories return an exact completed Block named locally. Stateless render helpers (`Button`, `Input`, `Textarea`, `Select`, `Fieldset`, `Checkbox`, `Switch`, `Disclosure`, `Nav`) are called directly in view and dispatch parent Messages; the controlled ones (`Checkbox`, `Switch`, `Disclosure`) take the current value in from the parent Model, which stores the new value on toggle
- [ ] Stateful UI components enter through parent-owned Bindings included in the owner Composition’s `bindings`. Composition collects the component handler graph, Mounts, Subscriptions, and ManagedResources. The root prepares `ApplicationBlock` through explicit fields in `ApplicationComposition.prepareBlock`; it does not maintain a component Layer or registration list.
- [ ] The canonical owned view uses `FeatureComposition.makeView` or `makeView.withInputs` and leaves its `h` parameter inferred. Ordinary feature-local helpers are plain functions whose builder parameter uses an owner-specific `FeatureViewBuilder` alias derived with `Block.ViewBuilderFor<typeof FeatureComposition>`. The alias appears immediately after the Composition with no blank line and is exported only for cross-file use. Helpers accept only meaningful Model, domain, or context parameters. Shared helpers use a generic builder for ordinary content and a typed caller-owned render callback for Mount-bearing child Attributes, preserving the caller's inferred Binding capability.
- [ ] `Toast.make(PayloadSchema)` returns a completed Block with the consumer-defined payload type; bind that value through the parent Definition and include the Binding under `bindings`.
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
- _"The component is too hard to bind"_: generated delivery removes parent-authored Message wrappers and mappers. Use the completed Block with a parent-owned Binding.
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
- [ ] Page `<title>` is set via the `title` field of the `Document` returned by the root Block's view used with `Program.make`. For routed apps, each route returns a distinct title.

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
- [ ] Single-file apps use names and blank lines for structure. Section headers appear only for substantial groups that need wayfinding.
- [ ] Complex update handlers extracted to separate functions
- [ ] view decomposed when branches exceed ~30 lines

## Testing

**Story tests** (required at every tier):

- [ ] `story.test.ts` exists with `story` pipelines (sibling pages or component variants use a subject prefix: `login.story.test.ts`)
- [ ] Every fallible Command (`Succeeded*`/`Failed*` pair) tested for both outcomes
- [ ] At least one multi-step test that chains Messages and Command resolutions
- [ ] Block tests assert `outMessage` when the child signals to parent
- [ ] Story tests use `Command.resolve(Definition, resultMessage)` and never run Command Effects directly. Whole-application execution tests keep the real handler Layers and replace their dependency providers
- [ ] Model-derived Story Messages use `messageWith` when their inputs must be read at step execution. Subscription delivery uses `Subscription.from(FeatureBlock.subscriptions).emit` with decoded input and the intended registered entry; no live Stream or occurrence-admission claim is inferred.
- [ ] Command and Mount matchers use the original Definition's source identity instead of comparing displayed names or `Definition.name`. Child results are supplied as raw child Messages; tests do not fabricate generated `Got*` envelopes. UI matcher Definitions come from the component's public `test` namespace and result Messages from its completed Block
- [ ] The TypeScript project includes `*.test.ts` and `*.test.tsx`, so Story and Scene API changes fail during the normal typecheck
- [ ] All tests pass with the project's test script

**Scene tests** (REQUIRED at Tier 3+; strongly encouraged at Tier 2):

For Tier 3+ apps (routing, async Commands, forms), missing `scene.test.ts` is a **BLOCKER**. The app has not been tested from the user's perspective without it.

- [ ] `scene.test.ts` exists: a root-level file for flows that cross pages, plus one in any page folder whose own rendering and interaction warrant it
- [ ] View rendering test: initial view has expected elements (headings, inputs, buttons)
- [ ] User interactions test: click, type, submit produce visible changes
- [ ] At minimum one test per discriminated-union state that has distinct view output (loading, error, empty, populated)
- [ ] Uses accessible locators: `role(...)`, `label(...)`, `text(...)`. Not `placeholder` or CSS selectors.
- [ ] Scoped queries with `within` or `inside` when a parent container contains multiple similar elements
- [ ] A Scene that uses `Subscription.emit` passes the owning Composition and the registered `subscriptions` in its config, then calls `Subscription.emit(entry, message)` with the exact entry that declares the raw Message. Generated child delivery is derived from that registered source and occurrence. Select a bound entry for an ambiguous child source. Silent entries with `messages: []` are not emitted from.
- [ ] Deliberate concurrent Scene interactions use `Command.keepPending` for one exact ordinary invocation. Assertions and resolvers retain that Command, and the Scene resolves it before completion.

---

# Quality Bar (beyond "it works")

The sections above cover correctness. The sections below cover the craft details that distinguish typing-game / website quality from generic valid code. The bar is: would a careful reader believe this was hand-written by the authors of `packages/typing-game/client/src/` or `packages/website/src/`? If not, keep working.

**Tier-aware:** every item below applies at every tier UNLESS marked otherwise:

- `[T2+]`: applies once the app has subscriptions or persisted state
- `[T3+]`: applies once the app has async Commands or routing
- `[T5+]`: applies once the app has nested domain state, multiple entities, or blocks

Items without a tier marker apply universally (even to a 50-line counter). When in doubt, assume universal.

## Decomposition

- [ ] Every function operates at a single abstraction level: orchestrators delegate, implementations implement. If a function reads like it's doing two things, extract one.
- [ ] Extract substantial update behavior into named handlers when it makes the Message matcher easier to read. A substantial `update/` directory has an explicit `index.ts` barrel, an `update.ts` matcher, and files named for their behavior, such as `handleRoomUpdated.ts`. Keep trivial child forwards and unchanged results inline; do not create a file per Message.
- [ ] Extracted Step-producing handlers take their event inputs first, then return a Step: `handleChangedUrl(url)(model)`. Read the Model when the Step is applied so composition uses the preceding Step's Model. Preserve exact inputs and inferred Command requirements.
- [ ] **View branches over ~30 lines are extracted** to named view functions (e.g. `enterUsernameView`, `selectActionView`). [T5+] If the view for a single route/state exceeds ~100 lines, extract to `src/view/` or `src/page/*/view.ts`.
- [ ] No function exceeds ~40 lines without extraction. Long functions are the primary smell.

## Effect module usage (consistency, not correctness)

- [ ] Native methods replaced with Effect equivalents _in pipe chains_: `Array.map(items, f)` not `items.map(f)` when composing; `String.startsWith(s, 'foo')` in a pipe not `s.startsWith('foo')`.
- [ ] `Option.match({ onNone, onSome })` preferred over `Option.map(...).pipe(Option.getOrElse(...))`. The labeled branches are self-documenting.
- [ ] `Array.match({ onEmpty, onNonEmpty })` when handling both empty and non-empty cases, and for any branch on a Model array at all, since the predicates reject `ReadonlyArray`. Not `isArrayEmpty ? ... : ...` ternaries. Grep for `.length > 0`, `.length === 0`, and `.length !== 0` on arrays and strings; should be zero. Use `Array.isArrayNonEmpty` / `String.isNonEmpty` for pure checks, `Array.match` for branching renders.
- [ ] `Equal.equals(target)` in predicates: `Array.findFirst(items, Equal.equals('Other'))` not `item => item === 'Other'`.
- [ ] `Array.fromOption(maybeCommand)` for "zero or one command based on Option", not `Option.match` that returns `[]` vs `[cmd]`.
- [ ] `Option.liftPredicate(value, predicate)` only when the predicate meaningfully examines the value. A Boolean-conditioned Command singleton or group uses `Array.filter([command], () => condition)` or `Array.filter(commands, () => condition)` without routing through `Option`.
- [ ] A single-transformation `pipe` has a clear data-flow reading, such as `pipe(dialogClose, Update.withOutMessage(outMessage))`; a pipe that only rearranges ordinary function application is called directly
- [ ] In multi-line pipes, data leads on its own line: `pipe(\n  data,\n  Array.map(f),\n  ...\n)`, not `pipe(data, Array.map(f), ...)`.
- [ ] `modifyFields` setters are point-free when they only transform that same field: `entries: Array.map(f)` not `entries: () => Array.map(model.entries, f)`, `count: Number.increment` not `count: () => Number.increment(model.count)`. Keep `() => value` for replacement values from Messages, child updates, Commands, or other Model fields.
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
- [ ] Command `define` names are verb-first PascalCase imperatives: `FetchWeather`, `FocusButton`, `LockScroll`.
- [ ] Command names describe the effect their handlers perform, not the later Model transition: a timer that only waits before dismissal is `WaitBeforeDismissal`, not `DismissAfter`.
- [ ] Message names are verb-first past-tense: `ClickedSubmit`, `UpdatedEmail`, `SucceededFetchWeather`. Never noun-first (`SubmitClicked`) or imperative (`FetchWeather` as a Message).
- [ ] `Completed*` Messages mirror the Command name verb-first: Command `LockScroll` → Message `CompletedLockScroll`. Never `CompletedScrollLock`.
- [ ] A Command's result Message is named from the Command, not from the fact it reports: `DetermineStartTime` → `CompletedDetermineStartTime`, never `DeterminedStartTime`. The only exception is a Message with more than one cause.
- [ ] Named helpers use specific verbs, not generic ones: `enqueueMessage` not `addMessage`, `announceKeyboardDrag` not `announce`, `whenSelectAction` not `handleSelect`. The verb eliminates ambiguity.
- [ ] Names are immediately understandable in context: `signature` not `sig`, `tickCount` not `t`, `message` not `msg`, `index` not `i`. Callback parameters are included. Conventional technical shorthand is allowed when it is the normal domain spelling, such as `attrs`, `props`, `args`, `dir`, `ctx`, `fn`, `DOM`, `URL`, and `VNode`. Established API and DSL bindings such as `h` are also allowed. Prefer a precise semantic name such as `toMessage` over an unexplained `f`.

## File structure and exports

- [ ] Feature barrels expose only intended public contracts and domain helpers. Implementation modules export pieces needed by sibling modules or focused tests without widening the feature barrel; helpers with no external consumer remain private.
- [ ] Section headers appear only where a long file has substantial groups that need wayfinding. Routine `// MODEL`, `// UPDATE`, and similar headings are absent from ordinary application and example files. Other comments are sparse: use `// NOTE:` only for a timing dependency, browser quirk, or external constraint that clear names cannot express.
- [ ] `index.ts` is always a barrel, never implementation. Re-export each intended public name explicitly; use `export *` only when the whole module surface is intentionally public. If a module `foo/` has code, the shape is `foo/foo.ts` for code + `foo/index.ts` for the barrel. An ordinary feature barrel exports its completed `ChildBlock` with the matching checked producer/header annotation; its Model stays internal; reusable Schemas and pure utilities use an explicit domain barrel. A generic feature exposes its factory, whose exact completed Block the caller names locally.
- [ ] For a package shipping declarations, name each ordinary public completed contract with a same-name interface extending the matching checked `FromAssembly*<typeof Model, typeof prepare>`, followed by `export const FeatureBlock: FeatureBlock = Block.assemble(prepare)`. Keep producer, interface, and value adjacent as one assembly unit. A reusable named generic `Completed` interface can provide that boundary for a generic factory. JavaScript-only applications retain the existing checked value annotation. Verify declaration emission for actual public entrypoints and external consumption; `noEmit` alone is insufficient and there is no reliable child-count threshold. Naming the header prevents repeated child expansion, but it does not guarantee arbitrary root serialization or seal deliberate ambient augmentation.
- [ ] Ordinary completed exports use one private zero-argument producer named `prepare`, followed immediately with no blank line by the matching four-shape `Block.FromAssemblyWith*` annotation with `typeof Model` and `typeof prepare`, initialized by `Block.assemble(prepare)`. The producer returns the opaque unfinished result of the real Composition's `prepareBlock`; it exposes no Model or runtime methods. Descriptive producer names appear only when one file genuinely has multiple preparation producers. Parent Schema construction uses `ChildBlock.Model`; feature barrels keep Model and local authoring contracts internal. Reusable domain Schemas remain intentional public contracts. No casts, `satisfies`-only annotations, raw producer calls, annotations alone, or repeated generic factory calls substitute for the checked boundary.
- [ ] Block and root files have one graph assembly point and follow the
      organization guidance in
      [Block composition and Layers](../foldkit/references/composition.md). A split
      root has no aggregation-only `application.ts`; Composition does not import
      init, update, view, or the completed Block.
- [ ] Extracted policies are imported by their actual values. Reciprocal sibling
      policies remain together in the parent assembly and defer sibling Binding
      calls through callbacks.
- [ ] Imports ordered: npm packages first (alphabetized), then `foldkit/*`, then relative imports. No mixed groups.
- [ ] Message unions are exported as Schema values when used across application modules. Explicit local annotations use `typeof Message.Type`; consumers of a completed child use `typeof ChildBlock.Message.Type`. A routine decoded Message alias is not exported. Variants stay on the owning namespace: `Message.ClickedSave()`, never a separate `ClickedSave` export. Internal-only Message unions stay unexported.

## Block and Command extraction [T5+]

- [ ] [T5+] Read [Block composition and Layers](../foldkit/references/composition.md)
      and verify every review invariant. Treat a missing registration, duplicate
      child Layer, stale keyed route, ambiguous startup owner, or execution started
      before the Runtime as a blocker.
- [ ] [T5+] Each ordinary Block has one typed Definition, one named Composition,
      and one completed `FooBlock`. Init, update, and the canonical view come from that
      Composition. Parents integrate it through a registered Binding and call
      Binding operations for parent-driven transitions.
- [ ] [T5+] Locally owned effects use the Definition's constructors. The local
      `EffectsLayer` includes local recipes only; registered Bindings contribute
      children recursively, and `ApplicationLayer` supplies ordinary Services.
- [ ] [T5+] Parent views render the canonical child view through
      `h.block(binding.embedView(...))` with stable occurrence and slot identity.
      OutMessage policy is exhaustive and forwards only named variants intentionally.
- [ ] [T3+] Extract Commands to `command.ts` when several update paths return
      non-trivial Effect pipelines. Command call sites pass only declared args, and
      attached implementations use `config.handler` with their recipe included in
      the owning local `EffectsLayer`.
- [ ] Explicit handler requirement annotations use
      `Command.HandlerOf<typeof Definition>`,
      `Subscription.HandlerOf<typeof subscriptions.entry>`,
      `Mount.RequirementsOf<typeof Definition>`, or
      `ManagedResource.HandlerOf<typeof managedResources.entry>`. Alternate
      implementations use the original definition's `toLayer`.
- [ ] [T5+] OutMessage unions live with Message contracts in `message.ts`.

## Subscriptions [T2+]

- [ ] All Subscriptions owned by one Block share one `FeatureDefinition.makeSubscriptions(entry => ({ roomUpdates: entry('RoomUpdates', fields, { messages: [Message.ReceivedRoomUpdate], modelToDependencies, handler: function* () { return dependencies => stream } }) }))` registry. Substantial Stream implementations are extracted into helpers instead of another same-owner registry; distinct child Blocks retain their own registries. The stable handler name identifies the Layer requirement; the record key identifies the runtime registration and Stream scope. Several connected registrations may share one definition while retaining distinct placement-qualified keys. `messages` declares every Message Schema the handler or external `toLayer` implementation can emit, and the bare field map is not wrapped in `Schema.Struct`.
- [ ] A fully attached Subscription registry is composed through `subscriptions.layer`. Individual entry Layers are used only for selective assembly, and `Subscription.aggregate` is used only at graph, adapter, or test boundaries that join independent records.
- [ ] Each entry stores a generator constructor in `handler` that returns `dependencies => stream`; Foldkit applies `Effect.gen`, and the owned registry’s `subscriptions.layer` recipe is merged into the owning module’s `EffectsLayer` when every entry has an attached handler. Mixed host contracts have no registry `.layer`; use explicit providers. The entry key `layer` is reserved.
- [ ] `modelToDependencies` extracts exactly the data the stream needs from Model, not the full Model. Wrap absent dependencies in `Option` at the field level when the subscription should stop.
- [ ] A child Binding lifts its Subscriptions and applies placement-specific `subscriptions.when` policy. Dynamic keyed children use keyed `makeBinding` configuration.
- [ ] Subscriptions without local Model dependencies use `entry('KeyboardPresses', { messages: [Message.PressedKey], handler: function* () { return () => stream } })` with no dependency fields or callback. `messages: []` requires a `Stream<never>` whose acquisition and cleanup live inside that Stream's scope. Scene uses non-empty declarations to validate both the selected `Subscription.emit` source and the emitted Message Schema before applying lift mappings. Subscription lifecycle entries in DevTools remain follow-up work.
- [ ] Message mapping happens inside `Stream.map(event => Message.UpdatedX({ data: event }))`, not scattered through update.
- [ ] Compact features may keep a small Subscription declaration with their cohesive implementation. Extract `subscription.ts` or a `subscription/` directory when several entries or substantial handler logic make that responsibility easier to navigate; do not split only to mirror an API stage.

## Managed Resources [T7]

- [ ] Managed Resources use a concrete identity, such as `FeatureDefinition.makeManagedResources(entry => ({ camera: entry('ManageCamera', CameraRequirements, { ...config, handler }) }))`. The stable handler name precedes the requirements Schema (usually `Schema.Option(...)`), which is not a field on `config`. No standalone `ManagedResourceDeps` struct.
- [ ] Each ManagedResource entry supplies a `handler` generator returning both `acquire` and `release`, and the closed registry is merged into the owning module's `EffectsLayer` with `managedResources.layer`. Empty registries yield `Layer.empty`. Mixed attached and host-owned registries use explicit entry providers because those registries expose no aggregate `.layer`. The registry key `layer` is reserved, matching Subscriptions. A no-op `release` is justified only when scoped acquisition already registered the real cleanup.
- [ ] `modelToMaybeRequirements` returns `Option.some(params)` to acquire and `Option.none()` to release. `acquire` fails into the error channel so `onAcquireError` fires instead of crashing; `release` never throws.
- [ ] The service union is read with `ManagedResource.ServicesOf<typeof managedResources>`, not hand-maintained in parallel.
- [ ] A child Binding lifts its ManagedResources through the Binding policy. Dynamic keyed children use keyed `makeBinding` configuration with an exact `keySchema`; no hand-rolled parent factory threads child state or Message mappers into the child.

## Testing quality

- [ ] Test names state the behavior being tested: `it('surfaces a validation error when email is malformed')`, not `it('tests validation')` or `it('handles the reported bug')`.
- [ ] Each `story` pipeline reads as a narrative: initial model → action → assert → action → assert. Not a dump of unrelated assertions.
- [ ] Scene tests use accessible locators (`role('button', { name: /submit/i })`, `label('Email')`) over `placeholder` or CSS selectors.
- [ ] Story tests resolve Commands with `Command.resolve(Definition, resultMessage)` and never run Command Effects directly. Whole-application execution tests keep the real handler Layers and replace deterministic service providers at the lowest boundary the test needs to cover. Replacing an entire handler is reserved for orchestration and does not test that handler

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
