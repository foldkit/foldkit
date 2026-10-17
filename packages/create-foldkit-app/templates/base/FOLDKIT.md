# Foldkit Conventions

Foldkit owns this file. `create-foldkit-app` writes it and upgrades replace it whole, so anything added here is lost. Project-specific instructions go in `AGENTS.md`.

This is a Foldkit app, a framework built on Effect-TS, architected like Elm.

## Getting the canonical references

The live Foldkit code is the canonical reference for everything: which APIs exist, what idiomatic apps look like, what the current conventions are. Written docs (including this one) can drift; the code can't.

If `./repos/foldkit` exists, it contains the full Foldkit repository, vendored in as a git subtree. Read from it directly:

- `repos/foldkit/examples/`: runnable example apps spanning every complexity tier. Usually your first stop when looking for a precedent for how to write something.
- `repos/foldkit/packages/foldkit/src/`: framework source. Ground truth for API signatures.
- `repos/foldkit/packages/typing-game/client/src/` and `repos/foldkit/packages/website/src/`: production apps built with Foldkit. Highest-fidelity reference for application architecture, Blocks, and OutMessage.

Treat the subtree as read-only reference: never import from `repos/foldkit/` in your project source. Imports must come from the `foldkit` npm package.

If `./repos/foldkit` does not exist and `AGENTS.md` says `subtree_prompted: false`, offer to vendor the repository. It gives you access to the full source, examples, and docs. Pin it to the release git tag matching the installed `foldkit` package; vendoring `main` instead can hand you examples and APIs from a release the project has not installed:

```sh
git subtree add --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

A canary install has no release tag to pin to. Its version names its source commit (`0.156.0-canary.<commit>`); use the full hash of that commit as the ref instead. GitHub expands the short hash at `https://github.com/foldkit/foldkit/commit/<commit>`.

Whether the user accepts or declines, set that line in `AGENTS.md` to `true` so it isn't asked again.

If `foldkit-skills` is installed as a Claude Code plugin, the `generate-program` and `audit-program` skills carry snapshot architecture and conventions guides synced from the live code.

## After a Foldkit upgrade

Two things go stale when the project upgrades its Foldkit packages: the vendored subtree and this file. Bring both forward, subtree first, since the fresh copy of this file comes from it.

Re-pin the subtree to the newly installed release (for a canary install, pin to the commit its version names, as above):

```sh
git subtree pull --prefix=repos/foldkit https://github.com/foldkit/foldkit.git "foldkit@$(node -p "require('./node_modules/foldkit/package.json').version")" --squash
```

Then replace this file whole. Foldkit's conventions change with its APIs, and a stale copy sends agents after APIs the installed packages no longer export. Copy `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md` over this file. Without the subtree, take the template from GitHub at the tag matching the installed version: `https://github.com/foldkit/foldkit/blob/foldkit@<version>/packages/create-foldkit-app/templates/base/FOLDKIT.md`. There is nothing here to merge or preserve.

## Project Conventions

- Foldkit is tightly coupled to the Effect ecosystem. Do not suggest solutions outside of Effect-TS.
- Model fields must be Schema types (the model is a schema). Plain TypeScript types are fine elsewhere (function return types, local variables, etc.).
- Use full names like `Message` (not `Msg`), and `withReturnType` (not `as const` or type casting).
- Declare every variant together: `defineMessageUnion()` for Messages, `defineTaggedUnion()` for other domain unions, and `defineRouteUnion()` for Routes.
- Keep constructors on their union: `Message.ClickedSubmit()`, `FetchState.Ok({ data })`, and `ApplicationRoute.Home()`.
- Use `taggedStruct()` only when the variants cannot be declared together, such as a recursive union.
- Push back on any direction that violates Elm Architecture principles: unidirectional data flow, messages as facts (not commands), model as single source of truth, side effects confined to commands. If a prompt suggests mutating state, imperative event handlers, or two-way bindings, flag the issue and propose the idiomatic Foldkit approach.
- Never use `NoOp`. Every message must describe what happened. A command's result message is named from the command, not from the fact it reports, whether or not it carries a payload: `LockScroll` → `CompletedLockScroll`, `DetermineStartTime` → `CompletedDetermineStartTime` (never `DeterminedStartTime`).

## Foldkit Patterns

### Update

Author init and update through the same named Composition used for view and completion. Its update callback receives only Messages not already routed to registered child Bindings. Contextual typing supplies Model and Message types and preserves inferred Command requirements:

```ts
const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedIncrement: () => ({
      model: modifyFields(model, { count: count => count + 1 }),
    }),
  }),
)
```

Keep purposeful parameter types for additional operation inputs and dispatch context. Avoid repeating Model, Message, or return annotations already established by owned helpers. Standalone utilities remain module functions such as `Update.combine` and `Command.mapMessages`.

Update, init, Step, and component helper producers return `{ model }` when they statically create no Commands. When they compute a Commands collection, return it directly without checking whether it is empty. Never write the literal `commands: []`; `foldkit/no-empty-commands-array` enforces this producer convention.

Use `Array.filter(commands, () => condition)` for a Boolean-conditioned Command group and `Array.filter([command], () => condition)` for a singleton. Keep `Array.liftPredicate` only when its predicate meaningfully examines each Command. Do not route a Boolean condition through `Option.liftPredicate` and `Option.toArray`; actual optional absence still uses `Option`.

`FeatureComposition.makeInit(fn)` authors a startup plan. Return only parent-owned fields under `model`; registered Binding `init` policies supply their child fields. Supply ephemeral `startup` inputs only when selectors need them. Optional parent `commands` precede retained child init Commands in Binding order; `steps` run afterward against the assembled Model and append their Commands in order. These are pure transitions, not an extra Runtime phase. Give the initializer one concrete signature; optional, default and rest parameters remain exact. Completion checks Flags, routing, handler completeness and registration evidence. Expose meaningful startup operations such as `loadInitialData`, `restore`, or `open` as ordinary Steps and invoke them through the Binding in the plan's `steps`. Do not manufacture Messages only to enter update during startup.

When composing an update-like result that already contains a Model and optional Commands or OutMessage, bind the whole result to a value named after the operation and access its fields through that value. Use `homeInit`, `dialogClose`, or a trailing underscore such as `init_` when the operation name collides with the function. Do not destructure or rename `model`, `commands`, or `outMessage`. Dot access does not prevent someone from ignoring `outMessage`; it keeps the operation and all of its returned fields visible together. Name a child fold's `write` parameter after the next child Model, such as `nextSettings`.

Pass optional Commands directly to APIs that accept them: `Command.mapMessages(homeInit.commands, toParentMessage)`. Use `result.commands ?? []` only when the next operation requires a concrete array for spreading, concatenating, execution, or an assertion.

Use `Update.Return<Model, Message>` when an update cannot emit an OutMessage. It prevents a result containing an OutMessage from entering code that would keep only its Model and Commands. A result with no `outMessage` can still be used where `Update.ReturnWithOutMessage<Model, Message, OutMessage>` is expected. The missing field means that update emitted no OutMessage.

Author every child through `const Child = Block.define('Child', { Model, Message, OutMessage? })`, create `ChildComposition = Child.makeComposition({ childBindings?, mounts? })`, and export the completed `block` returned by `ChildComposition.makeBlock(...)`. Export `* as Child from './child'` at the parent barrel. The parent imports that namespace and creates a Binding with `const ChildBinding = Parent.bindChild(Child.block, config)`, then includes the Binding in its Composition's `childBindings`. The Binding projects `init`, `fold`, the operations selected in the Block's `expose` record as direct named methods, and `embedView`, so the parent declares the relationship once. Composition carries lifecycle registrations and handler Layers without placing internal metadata on the ordinary Binding surface.

Binding folds and named operations are connected Steps whose Model input requires the exact registered graph. A typed call with a raw Model fails. Return or compose its opaque result intact from `Composition.makeUpdate` or `Composition.makeInit`; it has no public `.model` or `.commands` before checked execution. A Definition-owned `step` preserves or wraps the connected value. A completed `block.expose.operation(model, ...args)` carries its own graph, accepts the raw Block Model, and returns the readable executed result. Ordinary pure Steps remain directly callable. TypeScript may accept a connected function as a method returning `void`; outside the graph, that call only creates and discards passive configuration and executes no child work.

For an exact parent Struct field storing `ChildModel` or `Option<ChildModel>`, use `field` and the standard `parentMessage` wrapper constructor. `None` makes the child absent; folds and exposed operations never create it. `presentWhen` gates the whole direct child without deleting stored state. `subscriptions.when` gates only Streams. Use `toParentMessage` for custom wrappers and supply exactly one Message mapping.

A direct array of child Models uses `field`, a string-valued `key` naming a stable child field, and explicit `toParentMessage(key, message)`. The child Schema must expose declared Struct fields. Init and child transitions preserve the key; parent update owns membership. Wrapped rows use `field`, `key`, and `childField`; union or opaque child Schemas without declared fields and custom parent writes retain general keyed accessors. Tagged parent Models and writes that derive other parent state retain `read` and `write`. Placement identifies one Binding within the parent composition graph, not a DOM position or necessarily a Model field. Every field shorthand defaults placement to `field`, including direct and wrapped arrays. `readAll` selects the general keyed form and defaults placement to the child Block ID, as do static accessor Bindings. A keyed `key` identifies a dynamic occurrence under that placement. Optionality needs no override. Supply an explicit placement only when sibling defaults collide or a deliberate stable graph identity differs from the default.

Use `Update.combine` when a later Step should receive the Model produced by an earlier Step. It takes two or more Steps. Do not wrap one Step in `Update.combine`; call that operation directly. Name an inline Step parameter `stepModel`; it contains the Model produced by the preceding Step.

When the OutMessage is already known while constructing a new result, include it directly: `{ model, commands, outMessage }`. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain return or when the value has the type `OutMessage | undefined`. Pipe an existing return into the helper: `pipe(dialogClose, Update.withOutMessage(outMessage))`. When constructing the plain return in the same expression, pass it first: `Update.withOutMessage({ model, commands }, outMessage)`.

Add `outMessage.forward` only when at least one child OutMessage should continue to the current Block's parent. For partial forwarding, match every child variant and return `undefined` for the variants that stop here. Omit `outMessage.forward` when every variant stops here. `outMessage.fold` still handles each variant locally, including variants that continue upward. Never write `outMessage.forward: () => undefined`.

Bind a standalone `fold<Child>OutMessage` directly to the child union's
exhaustive matcher when it needs only the OutMessage. Name every variant, even
when the union has one variant. Use the same direct matcher form for a
`outMessage.forward` mapper that needs only the OutMessage. Keep a function or
factory around the matcher when its branches consume other per-dispatch
context, including a collection key, previous Model state, an entry payload,
or `FoldContext` lifters. For a generic child with a structurally refined
OutMessage payload, pass the refined type as the matcher's second generic. Let
`Feature.step` preserve Command requirements from Command-producing
branches instead of constraining the matcher to a requirement-free
`Update.Step`.

For a child stored in an exact required direct field, omit `init` when its initializer accepts no arguments. The Composition initializes it automatically. Use `init: { args }` for required inputs, or `init: false` when the parent supplies that required field in the init plan's `model`. Optional, keyed, and accessor storage remains parent-owned when `init` is omitted; explicit `init.args`, `init.occurrences`, or a checked custom projection chooses automatic startup. For an Option field, args returns `Option<tuple>` and `None` leaves the child absent. An optional `Startup` Schema on the parent Definition contextually types selectors that share startup input, and the Composition init plan carries the decoded value as `startup` when a selector uses it. Ordinary tuple literals retain the child's exact init argument types. A custom accessor can use `init: { args, model }` to project the exact initialized child into one declared parent field. Direct and wrapped keyed arrays use `init.occurrences` returning ordered `{ key, args }` records and `init.toItem(occurrence, childModel)`. Preserve the planned key and the exact initialized child object; a wrapper literal can retain parent-owned metadata. General keyed accessors retain explicit occurrence creation through named parent Steps.

Composition invokes selected child initializers once, assembles their fields with parent-owned fields, then applies the plan's Steps. It filters child init Commands when their occurrence is absent or `presentWhen` is false, preserving remove-and-readd generation isolation. `subscriptions.when` gates only Subscription Streams. Runtime executes collected Commands later; their collection order does not sequence asynchronous completion. Keep `Binding.init` for deliberate creation or replacement of an occurrence during an update. It returns a passive, noncallable recipe with no `.model` or `.commands`. Return it intact from `Composition.makeInit` or `Composition.makeUpdate`, or preserve it through a Definition-owned `step`. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step.

`FeatureComposition.makeUpdate(fn)` routes canonical unkeyed `parentMessage` wrappers automatically when the child update has no context parameters. Optional or defaulted context also requires an explicit incoming policy. For keyed or contextual dispatch, declare `fromParentMessage: { parentMessage, args }` on the Binding; args receives the parent Model and wrapper and returns `Option` of the exact native fold tuple. Return `None` for stale or inactive origins. Use `fromParentMessage: false` when a wrapper requires genuine parent policy, then handle it explicitly. Use `FeatureComposition.makeUpdate()` when every Message is owned by registered child routing.

Use `modifyFields()` from `foldkit/struct` for immutable model updates. Never spread or `Object.assign`.

### View

Every view receives `h`, the typed Html builder, as its last parameter. Define the canonical completed view through its owning Composition's `makeView` or `makeView.withInputs`. A completed Block's `makeView` method authors only an alternate embed view against its already fixed graph. Ordinary extracted helpers are plain functions. After establishing `FeatureComposition`, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` on the next line with no blank line and use that alias for feature-local helpers. Export it only when another file uses it. It retains the feature Message type and registered child and Mount capabilities without constructing a runtime builder. The owner prefix is deliberate even though structural contracts remain `Model`, `Message`, and `OutMessage`: those standard names normally travel through the feature namespace, while the builder alias identifies one Composition's capabilities at a plain type import site. Give each helper only the Model, domain value, or context parameters it actually reads, followed by `h`; let TypeScript infer whether it returns one `Html` value or an array. Rendering genuinely shared across owners takes the framework's general `HtmlBuilder<Message>` form, with capability requirements when needed. Never annotate the primary view's inferred `h` parameter. Never construct a builder; reach for `h.div`, `h.OnClick`, and other helpers from the parameter. Only where no builder is in scope, typically module scope, use `inertHtml` from `foldkit/html`, aliased `ih`. Use `h.empty` (not `null`) for conditional rendering, the union's own exhaustive `match` for discriminated unions, and `Array.match` for lists that may be empty.

Keys are for mapped list items only: key each row by a stable Model identifier (`h.keyed('li')(item.id, [], [...])`), never by array position, and never derive a key from displayed data. Never key branches; the build gives each view function's output its own identity, so branch switches replace DOM automatically. When switching an inline same-tag ternary must reset DOM state, extract each arm into its own named view function.

Omit the children argument when an element has none: `h.div([h.Class('divider')])`, never `h.div([h.Class('divider')], [])`. The same holds for `keyed`: `h.keyed('li')(key, [attrs])`, never `h.keyed('li')(key, [attrs], [])`. Attributes stay required on element builders, so `h.div([])` is an element with neither. Sibling elements that end up at different arities are expected and fine; void elements like `h.img` have always read that way.

### Commands

Define a Command with `Feature.command(name, { args, messages, handler })`; omit `args` when it takes none. Assign definitions to PascalCase constants. Keep the handler Layer beside its definition. Name the work the handler performs, not the later Model transition caused by its result: a timer that waits before update begins dismissal is `WaitBeforeDismissal`. Convert expected failures to result Messages with `Effect.catch(() => Effect.succeed(Message.FailedX(...)))`. Defects follow the application's crash handling. Commands belong beside the update that returns them.

Define a Command's identity, args, result Messages, and handler in its config. Set `handler` to a generator constructor; Foldkit applies `Effect.gen` internally, obtains stable dependencies, and returns the operation the Runtime invokes with update's args. Include `Definition.layer` in the feature's `EffectsLayer`. Return the operation directly from the generator when construction has no work to perform. The Runtime builds handler Layers once per application start; actual requests, delays, and DOM work happen inside the returned operation. Production and ordinary execution tests use the same handler Layer and provide different external Service Layers beneath it. Omit `handler` for a contract implemented by an external host; that definition exposes `toLayer` but has no `.layer`. `toLayer` accepts the host's implementation Effect constructor. Use it for a host implementation or an intentional alternative handler. Author update with `FeatureComposition.makeUpdate` to infer its Command requirements. Pass the feature's `EffectsLayer` to `FeatureComposition.makeBlock`; the completed Block carries its checked handler graph into its parent. Complete the root through `ApplicationComposition.makeApplication`, and call `application.provide(ApplicationLayer)` to supply only its remaining ordinary Services.

Compose each attached handler recipe directly in the feature's local `EffectsLayer`. Create a standalone `<DefinitionName>Layer` binding only when that provider is intentionally public or independently reused, and name alternatives `<DefinitionName>TestLayer`. A small feature composes `EffectsLayer` in `block.ts`; a substantial feature uses `layer.ts`. `EffectsLayer` supplies declared Command, Subscription, Mount, and ManagedResource handlers. `ApplicationLayer` supplies the ordinary HTTP, storage, RPC, clock, browser, and other Services those handlers or startup Effects require. Keep root `ApplicationLayer` composition in `services.ts`; `entry.ts` imports it and starts the completed application. Reserve `Layer` for the Effect module.

Every feature is a completed Block. Create `const Feature = Block.define('Feature', { Model, Message, OutMessage? })`; the name-only `Block.define('Feature')` form is for specialized generic factories sharing effect definitions across contracts established later with `.define({ Model, Message, OutMessage? })`. Ordinary split features establish their contracts in an early `definition.ts` without importing their completed barrel. Author Commands, operations needed by Binding policy, Subscriptions and ManagedResources through `Feature`. Author init, update and the primary view through the named Composition. Create child Bindings through `Feature.bindChild(...)`, then create `FeatureComposition = Feature.makeComposition({ mounts?, childBindings? })`; both fields are independently optional and default to empty. Author the canonical graph-aware view through the Composition and derive `FeatureViewBuilder` immediately after it when helpers need that alias, then export `FeatureComposition.makeBlock({ init, ... })` as `block` from `block.ts`. The parent barrel exports `* as Feature from './feature'`. Parent modules import the feature namespace, bind the completed child through their own Definition, include the Binding under `childBindings`, delegate through its fold and exposed operations, and render with `h.block(binding.embedView(...))`.

Experimental Query and KeyedQuery values are completed viewless Blocks. Bind them with the same parent `bindChild` method and include the Binding under `childBindings`; use the Binding's exposed `reset`, `revalidate`, `revalidateOrLoad`, and `loadIfMissing` operations. The Query value itself retains direct `read` and `run` conveniences. Query preserves Fetch identity, handler completeness, host delegation, constructor errors and Service requirements, request generations, stale-response protection, and cache-key typing through standard Block composition. KeyedQuery entries are cache data inside one child Model, not keyed Block instances. A canonical Query supplies `query.EffectsLayer`; a host-owned Query omits `handler` and is completed with `query.provideHandlers(query.toLayer(...))` before binding.

Import `defineApplication` from `foldkit`, then create the typed root with `const Application = defineApplication({ Model, Message })`. Create root child Bindings with `Application.bindChild(...)`, then establish `const ApplicationComposition = Application.makeComposition({ childBindings?, mounts? })`; use `makeComposition()` for a graphless root. Author `init`, `update`, and the primary view through `ApplicationComposition`; Definition retains early effect, Step and Binding authoring. Call `ApplicationComposition.makeApplication({ init, ... })` or `ApplicationComposition.makeElement({ init, ... })` with explicit implementation fields. `ApplicationLayer` contains ordinary HTTP, storage, RPC, clock, browser, and other Services only, and the entry supplies it with `application.provide(ApplicationLayer)` or `element.provide(ApplicationLayer)`. Both methods return new passive runtime inputs; the Runtime builds the Layers only when it starts one. Keep container and startup inputs in `entry.ts`. Tests and server entries import the passive Composition and implementation pieces from their real owners without booting a browser runtime.

The `make*` names identify factories. `makeInit`, `makeUpdate`, and `makeView` return authored functions; they do not call those functions. `makeComposition`, `makeBlock`, `makeApplication`, and `makeElement` return configured values. Only `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` starts execution.

Subscriptions declare `messages`, their Model projection, and `handler` in the entry config. The handler generator returns a function from dependencies to a Stream. Include `subscriptions.roomUpdates.layer` in the feature's `EffectsLayer`. The Message declaration limits what that Stream can emit; use `messages: []` for silent scoped work. The generator runs once for a runtime start. Restarting the Subscription reuses that factory and its application-lifetime providers. A host-owned entry may omit `handler` and receive its implementation through `toLayer`, which accepts the implementation Effect constructor.

Mounts use the same `config.handler` generator and `.layer` convention. The returned operation receives the live element; perform DOM work there. Include the definition in its owning Composition's `mounts`. A ManagedResource entry likewise stores a handler generator in its config. The generator returns an object with required `acquire` and `release` functions. Supply cleanup explicitly. A no-op release is appropriate when scoped acquisition already registered the real finalizers, as with `Layer.build`. Foldkit finishes explicit release and scoped cleanup before clearing the handle and emitting `onReleased`.

Name the feature-local alias `FeatureViewBuilder`, derived as `Block.ViewBuilderFor<typeof FeatureComposition>`, for ordinary helpers. Keep it private unless another file uses it. The alias carries the same Message, child, and Mount evidence as the canonical view. Reusable helpers independent of an owner keep the framework's general `HtmlBuilder<Message>`.

Keep the four lifetimes distinct. Application services such as RPC clients last for one Runtime start. A Command Effect lasts for one dispatch. Subscription Streams and ManagedResource handles follow Model conditions. Mount acquisition follows one DOM element. A handler generator may capture a stable service or accessor. It must not capture current time, Command args, Subscription dependencies, a DOM element, or an active ManagedResource handle. Captured services remain fixed for the Runtime start. Contextual lookups use the merged invocation context, where invocation services win. Looking up a service retrieves a provided instance; it does not construct the provider.

Handlers and services may own mutable execution bookkeeping, such as worker availability or protocol request IDs. The Model and update own pending work shown to the user, selections, and submission rules. A `Ref` created in the constructor must not become the source of truth for workflow decisions or state read by view.

Command args contain values already present in the Model or Message. Calling `Date.now()`, `crypto.randomUUID()`, or another source of time or randomness while preparing a Command happens before the Command executes, whether the call appears directly in the args object or its result is assigned to a local variable first. Obtain those values in the returned handler and return them in the result Message.

For the with-args shape, see `repos/foldkit/examples/weather/src/command.ts` or `repos/foldkit/examples/kanban/src/command.ts`. For an argless DOM-side-effect Command, the argless form in `kanban/src/command.ts` (`FocusAddCardInput`) is the canonical reference.

For DOM operations (focus, scroll, modals, scroll lock), Foldkit ships a `Dom` module. For time, randomness, UUIDs, and delays, use Effect's APIs directly (`Clock`, `Random`, `Crypto.Crypto`, `Effect.sleep`). Provide the platform Crypto layer when using `Crypto.Crypto`. Don't reach for raw `document.querySelector`, `setTimeout`, `Date.now()`, or `Math.random()`.

### File Organization

A root uses one of two complete layouts. A genuinely compact root keeps Model, Message, init, update, view, Application, ApplicationComposition, and any small local handler bundle together in application.ts. Once any root responsibility is extracted, split the whole root: definition.ts owns Application; model.ts, message.ts, init.ts, update.ts, view.ts, and optional flags.ts own their named responsibilities; and composition.ts or composition/composition.ts owns Bindings, OutMessage folds, complete child/Mount registration, ApplicationComposition, and an optional ApplicationViewBuilder. Even a graphless split root has composition.ts. Remove the emptied application.ts instead of using it as an implementation bundle or forwarding barrel. Substantial root Binding policies live under composition/<child>.ts, are exposed through the explicit composition/index.ts barrel, and are imported by composition/composition.ts; external consumers never deep-import the policy or assembly implementation path. Composition imports the Definition and children or Mount definitions, never root init, update, or view. A simple root EffectsLayer stays with its Command definitions in command.ts; use layer.ts only when Layer composition is substantial or reused. entry.ts imports completion fields from their owners, owns browser completion, the container, and startup inputs, supplies ApplicationLayer from services.ts, and starts the Runtime. Name the root Route union ApplicationRoute and a test provider ApplicationTestLayer.

Keep compact features together. A split feature uses `definition.ts` only for early Model, Message, OutMessage, and Block authoring contracts needed by other implementation files. Put substantial cohesive behavior in a folder-named implementation file such as `workHistory/workHistory.ts`, or retain focused init, update, and command files when they improve navigation. The view imports its Composition and Bindings from composition.ts; the small final `block.ts` imports both, completes the Block, and may compose a small local `EffectsLayer`. Extract feature `layer.ts` only when that composition is substantial or reused.

Export block, standard contracts and intentional domain helpers through explicit feature barrels. Split features with children or Mounts use composition.ts for Bindings, complete child/Mount registrations, Composition and an optional owner-specific ViewBuilder alias. Mount-only features use that same file; shared Mount definitions belong in mount.ts. Extract substantial policy to composition/<child>.ts with composition/composition.ts as the assembly point and composition/index.ts as a barrel. External consumers import from composition.ts or the explicit composition/index.ts barrel, never from a policy or assembly implementation path. The barrel namespaces every extracted policy module by child name, for example `export * as Home from './home'; export * as Room from './room'`; consumers can import `{ Home, Room }` from './composition`. Factories remain named within those namespaces, so consumers call `Home.bind(...)`; already constructed Binding values use PascalCase names such as `RoomBinding`. Keep flat named exports for the main Composition assembly surface and straightforward local Bindings. Internal implementation modules may use direct relative sibling imports to avoid barrel cycles. Keep straightforward Bindings there; do not create categories or duplicate child binding lists. A split graphless feature exports its named empty Composition beside the Definition in definition.ts, so view and block.ts import the same value without an empty composition.ts. A compact graphless feature keeps the named Composition beside its cohesive implementation. Author the primary view through the Composition and complete that same Composition with makeBlock. Composition must not import the view, update matcher or completed Block; policy-dependent Steps belong beside Bindings or in independent leaf modules. bindChild configures the relationship; including its result under childBindings registers it. Runtime constructs Layers and executes effects later. Import each extracted Binding policy through its child-name namespace, such as `Home`, so its factory or Binding and parent-owned Commands remain visibly grouped. Keep extracted policy modules under their child-name namespaces even when a module exports only one value. Keep flat named imports for the main Composition assembly surface and straightforward local Bindings. Keep child feature namespaces distinct from parent-owned policy namespaces. Keep the child Block import inside the policy module so assembly can use `Home` for its composition policy.

Start a client-rendered app with `Runtime.run` and an SSR or SSG app with `Runtime.hydrate`. A client-rendered app references its entry from `index.html`. An SSR or SSG app names the entry in `ssr.clientEntry` in `vite.config.ts`, imports CSS from it, and exports `renderDocument` from `src/entry.server.ts` to produce the complete document. Its source tree has no `index.html`.

The definitions (Model, Messages, init, update, view, Commands) never call `Runtime.run` or `Runtime.hydrate`, so tests and server entries can import them without booting a browser runtime. Both calls belong in `entry.ts` or `entry.server.ts`.

For a small app the definitions all fit in one `src/application.ts`. Split when a responsibility has a distinct reason to change and a name you would give it unprompted. Once that happens at the root, move every standard root responsibility to its named file instead of leaving a partial `application.ts`. Extract Messages to `message.ts` when Commands need the constructors; `definition.ts`, `command.ts`, and `update.ts` then import the Message contract directly. Keep Commands in the feature whose update returns them, alongside update or in a feature-local `command.ts` when several definitions or substantial handlers benefit from a separate file.

Use a short section header only when a long file has a substantial group that benefits from one. Routine architecture headings add noise in small application and example files.

### Testing

Test update functions with `foldkit/test`. Since update is pure, tests run without a runtime, DOM, or side effects. Use `story` for update-level tests (send Messages, assert on Model and Commands) and `scene` for feature-level testing through the view with accessible locators.

For an execution test, use the production handler Layer and provide controlled external services beneath it before construction. The test then executes the real request, response mapping, or lifecycle logic with a deterministic API, storage, RPC, clock, or browser provider. Replacing a complete handler exercises the chosen result path and does not test that handler's implementation. Story and Scene tests resolve Commands without executing their handlers.

Import the steps as named imports from `foldkit/story` or `foldkit/scene`: `import { Command, given, message, model, story } from 'foldkit/story'`. A test file needs only one of the two modules. If a single file ever tests both, import the namespaces instead (`import { Scene, Story } from 'foldkit'`) so `Story.given` and `Scene.given` stay distinguishable.

Name each test file for its test style, beside the code under test: `story.test.ts` for the Story tests (which drive `update`) and `scene.test.ts` for the Scene tests (which drive the rendered view). The name describes how the test works, not a source file, so it stays correct whether `update` and `view` live in `application.ts` or in their own files. A test file lives in the folder that holds the code it drives, so in a multi-page app most of them sit in a page folder rather than at the root. When one folder holds more than one test of a kind (sibling pages, component variants), prefix with the subject: `login.story.test.ts`.

Scene runs at any level, since a page's own `update`/`view` pair drops into `scene` unmodified. Put a `scene.test.ts` in the page folder for behavior that page owns, which covers view states awkward to reach through the root Model, and keep a root-level `scene.test.ts` for flows that cross pages, which covers how the parent folds an OutMessage, a Command the parent lifts, a route change, and view inputs the parent computes. If the `repos/foldkit` subtree is available, study the `story.test.ts` and `scene.test.ts` files in `repos/foldkit/examples/`. `repos/foldkit/examples/auth` is the multi-page shape: a root `src/scene.test.ts` for the cross-page login flow alongside `src/page/loggedOut/page/login.scene.test.ts` and `login.story.test.ts` driving that page's own pair.

When a Scene emits a Subscription Message, include the registered `subscriptions` record in its config and call `Subscription.emit(entry, message)` with the exact registered entry. Each entry's `messages` collection declares the raw Messages accepted by that step. For a lifted entry, pass a raw child Message; Scene applies its preserved `toParentMessage` mappings. Use distinct lifted entry objects for different placements. Silent `messages: []` entries accept no emissions.

## Code Style

- Encode state in discriminated unions, not booleans or nullable fields. `Idle | Loading | Error | Ok`, not `isLoading: boolean`. Make impossible states unrepresentable.
- Use `Option` for absence in the Model and domain values instead of `null` or `undefined`. Foldkit return records are the exception: omit `commands` and `outMessage` when absent. A partial `outMessage.forward` mapper returns `undefined` for each child variant that stops at this Block. Prefix Option-typed values with `maybe*`. Match with `Option.match`; don't unwrap with `Option.map(...)` + `Option.getOrElse(...)` when you can just match.
- Use Effect modules over native methods in `pipe` chains (`Array.map`, `String.startsWith`, `Array.findFirst`). Native methods are fine when calling directly on a named variable.
- Never cast Schema values with `as Type`. Use the callable constructor: `Message.SucceededLogin({ sessionId })`, not `{ _tag: 'SucceededLogin', sessionId } as Message`.
- Always `Array.isArrayEmpty` / `Array.isArrayNonEmpty` (not `.length === 0` / `.length > 0`). Use `Array.match` when handling both empty and non-empty cases.
- Never use `for` loops or `let` for iteration. Reach for `Array.map`, `Array.filterMap`, `Array.makeBy`, `Array.reduce`.
- Never use `T[]`. Always `Array<T>` or `ReadonlyArray<T>`.
- Use `Message.match` for exhaustive Message matching. Use Effect `Match` for other tagged unions, partial matching, fallbacks, and one handler shared across multiple tags. Never use `switch`.
- Always use braces for control flow: `if (foo) { return true }`.
- Don't add inline comments to explain code. Use better names instead. Reserve `// NOTE:` for behavior that would mislead a careful reader.

## Message Layout

Declare the whole Message union with `defineMessageUnion()`, then put `type Message = typeof Message.Type` on the next line:

```ts
const Message = defineMessageUnion({
  ClickedSubmit: {},
  UpdatedEmail: { value: Schema.String },
})
type Message = typeof Message.Type
```

Keep the `defineMessageUnion()` declaration and `type Message` alias adjacent. Construct values through the namespace (`Message.ClickedSubmit()`) and handle the union with `Message.match`. Never destructure constructors from `Message` or `OutMessage`; the owning namespace stays visible at every call site.

Keep each case's payload object on one line when it fits. Let Oxfmt wrap payloads that need more space, so the declaration remains easy to scan as one variant per line.

Messages are verb-first past-tense. Common prefixes: `Clicked*`, `Updated*` (input changes and external state updates), `Submitted*`, `Pressed*`, `Selected*`, `Succeeded*` / `Failed*` (paired async results), `Completed*` (every other Command result), `Got*` (child OutMessage in the Block pattern).

## Debugging

This project ships with `@foldkit/devtools-mcp` pre-wired. When the dev server is running and the app is open in a browser, `foldkit_*` MCP tools let you inspect Model, Message history, and time-travel. Reach for them before adding `console.log` whenever the question is about state or Message flow.

Treat those tools as privileged access to the application. They can return Models, Message payloads, and Command and Mount arguments to the agent. Keep credentials and private data out of browser state. Use Effect `Redacted` for sensitive values the browser must temporarily hold, and set `devToolsMcpPort: false` in the Foldkit Vite plugin options when an agent should not inspect the running application.

## Going Deeper

For Blocks and OutMessage, Subscriptions, Mount / ManagedResource / CustomElement, field validation, routing, accessibility, and the full convention set, read the live Foldkit code in `repos/foldkit/`. The `examples/` directory and the production apps (`packages/typing-game/`, `packages/website/`) are the highest-fidelity references for any specific pattern. The `foldkit-skills` plugin's `generate-program` and `audit-program` skills carry written snapshot guides if you want a structured walkthrough.
