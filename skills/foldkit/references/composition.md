# Block Composition and Layers

Read this reference when a Foldkit app defines a Block, binds a stateful UI
component, initializes children, provides child operations, or supplies handler
Layers. For exact overloads, inspect the installed declarations and the
matching example from the same Foldkit version.

## The ownership model

A Block owns one state machine: its Model, Messages, update, optional
OutMessages, canonical view, effects, lifecycle entries, and public operations.
Its parent owns integration policy: where the child Model is stored, whether an
occurrence exists, when child delivery is accepted, what OutMessages mean to
the parent, and where the child renders.

The Definition declares the public contract. The Composition supplies static relationship information for portable typed builders. A Layer-owned constructor acquires the implementations that execute those relationships.

Declare an independent public contract before its implementation. `Block.makeDefinition` binds a stable module-level unique `key`, Model, local Message, optional OutMessage, and an `Init` tuple. Add a `Context` tuple for dispatch context, `ChildInitContext` for deferred child startup, and a `view` descriptor when the Block renders. A serializable tuple uses `Schema.Tuple`; callbacks or other deliberately nonserialized inputs use `Block.makeInputContract<...>()`.

Export `FooBlock = FooDefinition.contract` for parent authorship. Parents derive Schemas from `FooBlock.Model`, configure Bindings, author extracted Steps, and render through their Composition without importing the child implementation. The key identifies the contract; the readable Block name is a label and may repeat across independent modules. Declare one unique key at module scope. Packages exposing inferred values must make their unique key type reachable through the owning public barrel, using a type-only reexport when the runtime token stays internal.

A Block feature's explicit barrel exposes its passive contract, construction `layer`, and intentional public queries or domain contracts. A child may expose pure read-only selectors such as `isComplete` and `hasErrors`; the parent passes the child Model and the child owns interpreting its fields. Keep substantial selectors with their responsibility, such as `validation.ts`, rather than exporting them from update. These ordinary exports are independent of implementation Layer selection, so give them stable semantics over the public Model. Keep authoring helpers and update implementations internal. Do not copy derived values into parent state or introduce Messages solely to read them.

Complete the implementation with `FooDefinition.makeBlock(Effect.gen(function* () { ... }))`. Yield each registered Binding, then return the acquired connections under `children`, together with init, update, view and local lifecycle/handler declarations. Static Composition configuration still uses `bindings`. Provide child implementation Layers with the completed descriptor's `.provide(Child.layer)` or ordinary `Layer.provide` on its `.layer`. A feature barrel exports the passive `FooBlock` and the implementation `layer`; a root may export its selected `ApplicationBlock` directly for Program or Server hosting.

Leave one blank line between the Binding acquisition group and `return`. Write each returned implementation field on its own line, even when the record would fit on one line. Use the same layout for graphless Blocks.

Name field-backed Bindings after their Model field in PascalCase with the `Binding` suffix: `activeMemberListbox` becomes `ActiveMemberListboxBinding`, and `issueDetails` becomes `IssueDetailsBinding`. Preserve optional prefixes, plurals, and role words. For wrapped storage, include the nested child role when the container alone would hide it, such as `entries[].animation` becoming `EntriesAnimationBinding`. Custom and whole-variant storage use a meaningful relationship name. A necessary private pre-policy value uses `Base<Field>Binding`; the policy-complete value keeps the canonical field name.

Inline single-use `bindings` and constructor `children` arrays at their registration sites. Export one policy-complete Binding for each relationship and acquire that same Binding in the constructor. Keep a necessary base Binding internal when reciprocal policies or self-directed operations need to break a dependency cycle. A Binding registers the relationship to a child contract; the supplied child Layer constructs its implementation.

Prefer plain array literals wherever contextual typing preserves the required element or tuple types. Use `Tuple.make` only when a value or producer would otherwise widen and lose necessary tuple typing. Do not add it to `children`, `bindings`, or initializer arguments by default.

The public contract is bounded independently of the implementation graph. Ordinary app code needs no preparation producer, assembly annotation, generic graph reconstruction, casts or `satisfies`. Check real emitted entrypoints and relocated consumers when changing published types. Generic library factories may retain their existing named `Completed` interfaces and a narrow library-owned refinement for type-only payloads; application callers keep `Component.makeBlock<Item>()` and provide `Component.layer`.

Construction builds the executable graph once in its Layer scope. It does not run init, evaluate `init.contextToArgs`, create Model occurrences, build handler Layers, run Commands or start Subscription/ManagedResource/Mount lifecycles. Acquired init, update and operations remain synchronous pure functions. Ordinary Service requirements for requests belong in their attached handler constructors. Use the Block constructor for graph construction and implementation dependencies it actually needs; keep all application workflow state in the Model.

## Canonical shape

```ts
const SettingsKey = Symbol('Settings')
export const SettingsDefinition = Block.makeDefinition('Settings', {
  key: SettingsKey,
  Model,
  Message,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const SettingsBlock = SettingsDefinition.contract
const SettingsComposition = SettingsDefinition.makeComposition()
const init = SettingsComposition.makeInit(() => ({
  model: { theme: 'System' },
}))
const update = SettingsComposition.makeUpdate({
  UpdatedTheme: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})
const view = SettingsComposition.makeView((model, h) => h.p([], [model.theme]))

export const layer = SettingsDefinition.makeBlock(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
).layer
```

A graphless Block still uses a Composition and returns `children: []`. Use `makeUpdate({})` for an empty local Message union. A leaf with an empty complete dispatch contract declares `isMessageFree: true`; a routed-only parent omits that flag because child delivery is nonempty. An InMessage does not make the local dispatch contract nonempty. A viewless Block omits the view descriptor and implementation view. For a Document root, declare `view: { kind: 'Document' }` and return a Document from the canonical view. Do not return an operations record from the constructor.

## Composing updates

Keep an exhaustive `Composition.makeUpdate({ ... })` record as the default. Use `makeUpdate.compose(...)` when several transitions need to run in one dispatch, such as normalizing inputs, applying the Message, then comparing the previous and next Model before returning a save Command.

Build the extra pieces with the same Composition:

| Helper                                      | Runs for                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `makeUpdate.cases({ ... })`                 | The local Message tags in its sparse handler record                     |
| `makeUpdate.each(handlerOrStep)`            | Every dispatch, including child delivery                                |
| `makeUpdate.on(['Tag'])(handlerOrStep)`     | The selected local Message tags                                         |
| `makeUpdate.except(['Tag'])(handlerOrStep)` | Every dispatch except the selected local tags, including child delivery |

Use `cases.withContext(context => cases)` when additional records need dispatch context. The ordinary full record uses `makeUpdate.withContext(context => cases)`. Keep the declared Context tuple; composition does not concatenate separate contexts.

Pieces run from left to right against the Model produced by the preceding piece. The one full `makeUpdate(...)` plan handles the local Message or routes the child at its position. A piece before it runs before either kind of handling; a piece after it sees the completed result, including the child's parent OutMessage fold. Child delivery runs once.

A shared callback receives `(model, message, { before }, ...context)`. `model` is the current intermediate Model; `before` is the parent Model at entry to the entire composed update. The Message stays unchanged. Return a result or a Step that runs against the current Model, or pass a compatible existing Step directly. Constructing a piece does not invoke its callback.

Extract focused bundles with `makeUpdate.compose(...)` and combine them later. A bundle may contain no full update. The update supplied to Block completion must contain exactly one exhaustive full update, including its `.withContext` form. Grouping bundles preserves order and the original `before` snapshot; it does not start another dispatch.

Shared `each`, `on`, and `except` pieces cannot emit OutMessages. Handler records retain their per-Message OutMessage contracts, and composition rejects pieces that could emit competing OutMessages for the same dispatch. Existing Binding OutMessage policies keep their meaning. Commands are collected in piece order; their effects and completions are not sequenced by that order.

Composition covers update only. Init and receive remain separate entry points. Callbacks stay pure, workflow state stays in the Model, and effects stay in returned Commands.

## Parent inputs

Declare an optional `InMessage` Schema for requests and notifications a parent can initiate. Its tags are disjoint from local `Message`: `RequestedSubmit` generates `Binding.requestSubmit()`, and `InformedOfIssueChanged` generates `Binding.informIssueChanged(payload)`. Fields use the variant constructor's exact payload contract. A keyed Binding takes its occurrence key first. Do not inflect or alias the generated names.

Author an exhaustive `Composition.makeReceive` record and return `receive` with init, update and view from `Definition.makeBlock`. Local UI facts and Command results remain in `makeUpdate`. Share a reusable Step in `steps.ts` when local `SubmittedForm` and received `RequestedSubmit` need the same transition. Sparse `inMessageOutputs` entries declare emitting OutMessage bounds and additional `services` or `resources`; an omitted entry is silent and adds no public requirements. Commands returned from receive produce local Messages, never InMessages.

Declare a separate `InMessageContext` tuple and use `makeReceive.withContext` for receive context. Binding methods take that context after the payload. The update `Context` and `delivery.toUpdateContext` do not supply it. Receive remains synchronous and pure; it preserves the existing Binding's storage, OutMessage policy, occurrence identity and lifecycle. Acquisition does not call receive or initialize Model state.

An acquired executable supports `receive(model, inMessage, ...context)` and `receive(inMessage)(model, ...context)`. Scoped tests use `Story.inMessage` / `Scene.inMessage` and supply required `{ block, inMessageContext: [...] }` independently of `updateContext`. Raw runners cannot resolve this cause without an acquired receiver.

### Explicit operation adapters

After graph acquisition the update is dual: the Runtime uses
`update(model, message, ...context)`, while application composition can use
`update(message)(model, ...context)` as an internal Step. Put a local Message
constructor directly under `operations` when its payload is the public input.
The acquired executable exposes callable operations without creating startup Messages. A constructor with fields takes one constructor payload
object followed by the update context, with constructor defaults honored; a
constructor without fields takes no payload placeholder. Keep a tuple producer
under `operations` when public inputs need mapping, refinement, defaults, or an
exact context tuple. Both forms pass their Message through update synchronously
as part of the pure transition; they do not enqueue another Runtime Message.
The explicit `operations` path remains available for positional or generic adapters and existing local Message mappings. `Update.combineSteps` accepts unary Steps, so wrap a contextual curried
update in a unary adapter that supplies every required context argument.

Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

In a split feature, `definition.ts` exports the Step helpers used by its implementation and those modules named-import the helpers from that file. A colocated feature destructures helpers beside its Definition in the scope that uses them. Keep Definition-qualified calls when several Definitions in one module need visible ownership. Feature barrels keep authoring helpers private and export the passive Block contract and construction `layer`.

Put reusable parent Steps shared by update, receive, composition, or init in the owning Block's `steps.ts`, or in responsibility modules such as `steps/search.ts` with an explicit `steps/index.ts` barrel. Ownership follows the Model being transformed. Keep Message routing in update and Binding registration and child OutMessage policy in composition; colocate Steps used by only one responsibility. Name shared transitions for their operation, without a `make` prefix or `Step` suffix, and defer cyclic Binding access until the producer is applied.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Use `makeStep.fromMessage(message => stepOrResult)` when only the Message is needed to select or construct a composed Step or initialization recipe. The returned handler stays Model-first, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

An empty record returned by `makeFieldsStep` preserves the exact incoming Model and evaluates no field transformers. `FieldTransforms<Model>` from `foldkit/struct` is available when a helper genuinely accepts a field-update record; it follows ordinary structural typing and does not enforce exact keys or Model-variant relationships alone. For a local policy helper that gates Model changes, accept a Model-to-Model callback and keep `modifyFields` at the call site, preserving its field validation without duplicating generic machinery in application code.

Choose the helper when authoring a Step. Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep existing reusable operations, sequential composition, and Definition-owned local Steps needed when mixing local branches with connected recipes; those preserve result channels and registration evidence.

For explicit adapters, name actions `request*` and notifications `inform*`. Their local Message mapping enters update; generated InMessage methods enter receive. Keep actual UI facts separate from parent requests. Avoid `reflect*` helpers that bypass the owning transition to change child state.

Choose parent inputs by ownership. Use view inputs for current render data and update context (`delivery.toUpdateContext`) for current data read while handling a Message. Use an `inform*` operation when an external event requires a child transition, Command, or OutMessage. View inputs and context do not dispatch Messages when their values change. Keep an independent editing baseline in the child Model when needed, while passing current comments or other display data through view inputs. Do not mirror parent data merely to read it, or notify a child back about a change it already applied unless another transition is required.

Create one `Definition.makeSubscriptions(...)` registry for all Subscriptions
owned by a Block. Extract a substantial Stream implementation into a focused
helper instead of creating another registry for the same owner. Distinct child
Blocks retain their own registries. A fully attached registry exposes
`subscriptions.layer`; merge that passive recipe into `EffectsLayer`. Constructor
errors and ordinary Services remain precise. An empty record supplies an empty
Layer. Mixed host contracts have no registry `.layer`: provide those contracts explicitly.
The entry key `layer` is reserved. Individual entry Layers remain available when
intentionally selecting only part of a registry. Use `Subscription.aggregate` at
graph, adapter, or test boundaries that join independent records, not to rebuild
one Block's registry.

`managedResources.layer` selects every attached handler
from an explicit closed resource registry without changing it. It preserves exact
Layer outputs, constructor errors, and Service requirements. Empty registries
produce `Layer.empty`; host-owned or mixed registries require explicit entry
providers. Registration keys are own string properties, including non-enumerable
ones; the registry key `layer` is reserved, matching Subscriptions. Select one closed registry and entries
with one Layer contract before aggregation; alternatives with conflicting output,
error, or Service channels expose no aggregate Layer. Command provider selection stays explicit
because Commands have no equivalent closed registry.

In Story and Scene helpers, `Command.argsOf(Definition)(pending)` projects captured
arguments only after matching source identity. It returns `Option`, including
`Some(undefined)` for a matching argless Command, and preserves the pending
Command's path and result contract. Choose cardinality and keyed occurrence
explicitly before resolving; source identity alone does not distinguish siblings.

Keep one Definition and one named Composition. A generic API that shares early
identity across several typed contracts may create
`FeatureNamespace = Block.makeNamespace('Feature')` outside its specialization
factory. A specialization calls the Namespace's keyed `makeDefinition`, or
`Block.makeFamilyDefinition(FeatureNamespace, contracts)` for a genuine
implementation family, when it shares effect identities. An ordinary feature
calls `Block.makeDefinition(id, contracts)` directly. A graphless feature still has a Composition.

Author the primary view through the Composition. An alternate renderer must preserve the declared view-input and graph capability contract.
Plain helpers
that need the same child and Mount capabilities take an owner-specific builder:

```ts
export const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [SettingsBinding],
})
export type ProfileViewBuilder = Block.ViewBuilderFor<typeof ProfileComposition>
```

Declare that alias immediately after the Composition and export it only when a
different file uses it. A helper shared across owners may use a generic
`HtmlBuilder<Message>` for ordinary content. When it forwards Mount-bearing child
Attributes, accept a typed caller-owned render callback and render those Attributes
through the caller's inferred builder. A raw Mount-requirement union or broad
builder annotation does not preserve a scoped Binding capability.

Keep application callbacks at the top level of ViewInputs. Native Date and
Effect DateTime/TimeZone values are data and can appear inside records, arrays,
tuples, and Option without conversion to primitives. Added nested application
callbacks remain invalid; move them to a top-level input rather than casting.

## Bind a child

`makeBinding` describes one relationship. Adding the Binding to
`bindings` registers it. Binding construction is passive relationship configuration. In the constructor, `yield* SettingsBinding` acquires the Layer-provided child implementation and returns its exact connection; include that value under `children`. A missing child provider is a construction requirement, not an invented Model fallback.

Choose the narrowest storage form that describes the parent Model:

| Parent storage                                                                       | Binding shape                                                        |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Exact Struct field containing `Child.Model` or `Option<Child.Model>`                 | `field`                                                              |
| Exact array of child Models with a declared stable string or finite-number key field | `field` and string `key`                                             |
| Exact array of closed wrappers around the child Model                                | `field`, string `key`, and distinct `childField`                     |
| Exact `Option` of one closed wrapper around the child Model                          | `field`, string `key`, and distinct `childField`                     |
| Exact `Schema.Record` or `Schema.HashMap` of child Models                            | `ParentDefinition.makeMapBinding(ChildBlock, { field })`             |
| Exact Record/HashMap of closed wrappers around the child Model                       | `ParentDefinition.makeMapBinding(ChildBlock, { field, childField })` |
| One exact tagged member of the parent Schema.Union                                   | `makeVariantBinding(parent, child)`                                  |
| Nested, wrapped, opaque, open, or custom static storage                              | `read` and `write`                                                   |
| Custom keyed storage or enumeration                                                  | `readAll`, function `key`, `read`, and `writeAt`                     |

A Binding's `write` or `writeAt` places the next child Model into parent storage. Keep parent reactions to child transitions in its OutMessage policy. Do not compare old and new child state in a writer to generate announcements, trigger sibling changes, or maintain unrelated parent fields. Nested storage, keyed replacement, presence checks, and preservation of wrapper metadata remain legitimate custom writes. If a parent needs a child fact that is not exposed, add a truthful public OutMessage rather than using the writer as an event hook.

The generated wrapped writer replaces only the matched `childField`. For an
array, it preserves order, wrapper metadata, and unmatched references. For an
Option, it preserves wrapper metadata only when the stored key matches. `None`
and a different key leave the exact parent Model unchanged. Neither form
inserts a missing occurrence. The parent remains responsible for presence and
collection membership.

Call `ParentDefinition.makeMapBinding(ChildBlock, config)` for Record/HashMap fields.
The factory derives the key contract from the parent Model Schema and defaults
placement to the storage field.

A split feature can destructure and export `makeMapBinding` from its `definition.ts`,
then import that factory from the owning module. It retains the parent Definition's
contracts when destructured.

Record keys decode to strings; HashMap
keys decode to strings or numbers, with finite numeric occurrence values
required at Runtime. Record enumeration follows own enumerable string-key
order. HashMap iteration does not promise display order. Preserve a separate
ordered ID list when order matters. Parent-owned wrapper fields survive writes;
ordinary operations never insert missing entries. Removing a stored key ends
that child occurrence's lifecycle. Use dynamic `Binding.init`
for explicit creation and keep general keyed accessors for custom writers or
separate composite storage keys and primitive occurrence identity.

Import `makeVariantBinding` from `foldkit/variantBinding` only when the child
occupies one complete tagged member of the parent `Schema.Union`. Include the
actual `ChildBlock.Model` Schema directly; one required literal `_tag` selects
presence, and all parent members have distinct tags. The helper accepts only
optional placement, delivery and Subscription policies. It never creates an
absent child. Parent update owns variant switches and dynamic
`Binding.init({ args, toParentModel })`, preserving init Commands. Same-shaped
reconstructed Schemas cannot satisfy runtime Schema identity. Keep general
accessors for nested/wrapped variants and custom writers. Use the ordinary
OutMessage policy and register the selected Binding.

An unkeyed direct field Binding defaults placement to the field name. Every
array/Option keyed Binding and every static accessor Binding defaults placement
to the child Block ID. Map field shorthands default to the field. Placement
identifies one Binding in the composition graph; a keyed
occurrence's key identifies one runtime child under that placement. Override
placement only to resolve a sibling collision or preserve a deliberate stable
graph identity.

Add `presentWhen` only when parent policy gates an entire direct child. A direct
`Option` field is absent while it is `None`; folds and operations do not create
it. Use `subscriptions.when` only for Stream activation.

`makeBinding` derives child delivery from the independent child contract. Do not add a
child wrapper variant to the parent's authored Message or write message
mappers. The generated envelope records the Binding placement, keyed occurrence
when present, and runtime generation. The Composition routes it only to that
exact live occurrence.

Use `delivery.when` when parent policy decides whether an occurrence can receive
a child Message. Use `delivery.toUpdateContext` when the child update requires
context from the parent Model or keyed occurrence. A custom keyed Binding also
provides the exact `keySchema` used to encode and validate generated delivery.
These policies run at the Binding boundary and do not become parent-authored
Message variants. A child whose Message Schema is `Schema.Never` needs no
delivery policy.

```ts
export const SettingsBinding = ProfileDefinition.makeBinding(SettingsBlock, {
  field: 'settings',
}).withOutMessagePolicy({ fold: foldSettingsOutMessage })

export const ProfileComposition = ProfileDefinition.makeComposition({
  bindings: [SettingsBinding],
})
```

The Composition update record handles locally authored parent Messages.
The passive `ProfileBlock.Message` is the declared local Message Schema. After graph acquisition, the executable's `Message` Codec includes the generated child envelopes required by its actual connections. Use that acquired Codec for serialization or external dispatch; do not fabricate child envelopes or maintain a second authored union. A parent calls a declared
child operation through its named Binding method. For example, when a Dialog
Block declares `InMessage.RequestedClose`, its parent calls
`DialogBinding.requestClose(...)`; it does not construct a child Message to force that
transition. Dialog receive owns the transition. An explicit operation adapter may
instead map to a local Message handled by update. Render through
`h.block(SettingsBinding.embedView(...))`.

## OutMessages and sibling policy

Inline an ordinary unkeyed fold as
`makeBinding(WholeChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(WholeChildBlock, handlers) })`.
Pass the passive child contract explicitly to `makeOutMessageFold` whether the fold is
inline, extracted, adapted for keyed policy, or staged for reciprocal
composition. Keep substantial transition helpers beside their fold. Name every variant directly
in the handler record, including the only variant in a union. Missing and extra
handlers fail type checking, and factory-refined payloads stay precise. The
parent Definition supplies the parent Model, Message, and OutMessage contracts.
The returned Steps retain inferred Command requirements and sibling Binding
evidence for Composition to check, so do not repeat Step or payload type
arguments.

A handler takes the inferred `FoldContext` as its second parameter only when it
uses `liftCommand` or `modelBeforeUpdate`. The resulting fold stays unary when
every handler omits that parameter. Keep a purposeful factory or adapter when a
keyed fold uses the collection key or other call-site context. Let
Command-producing and parent-OutMessage-producing handlers keep the channels
inferred by the owning Definition.

Use `ParentDefinition.makeOutMessageForward(handlers)` inline under
`withOutMessagePolicy({ forward })` when at least one variant continues through
the current Block's OutMessage. Pass the passive child contract explicitly when
extracting or adapting the forward. The helper is available only when the
parent Definition declares OutMessages. Every handler returns a declared parent
OutMessage or `undefined`, and every variant remains named even when it stops.
Local handling still runs for a forwarded variant, and a derived parent
OutMessage takes precedence for that dispatch.

Select the callable `fold` and `forward` through
`makeBinding(...).withOutMessagePolicy({ fold?, forward? })`. The returned value is
the full Binding to register and use. Keep an ordinary one-way policy fluent.
When a fold calls an operation on the same Binding, or two policies call each
other's Binding operations, declare the original `FooBinding` values first.
Author the Definition helpers against those values, then select and register
`FooBindingWithOutMessagePolicy`. Do not use a raw child matcher, annotations,
casts, or generic argument lists to work around inference.

Policy selection is passive and immutable. It retains the original child
Binding identity, projected operations, keyed occurrence identity, and
lifecycle scopes. It does not build Layers, run handlers, or start effects.
Composition rejects a child with OutMessages whose selected Binding has no
policy, an incomplete handler record, and an operation that reaches an
unregistered sibling. Runtime validation supplements these checks for plain
JavaScript callers.

Policy may return parent Steps and call a registered sibling Binding operation.
Connected Binding Steps require their exact registered graph when applied to a
Model, so a typed call with the raw domain Model fails. Return or compose the
opaque connected result intact from `Composition.makeUpdate` or
`Composition.makeInit`; it exposes no `.model` or `.commands` before checked
execution and cannot narrow to a useful `{ model }` return. Its raw recipe
exposes only the child transition's direct channels. The Composition resolves
registered OutMessage policy and sibling operations into the final parent
Command Message, requirements, and OutMessage channels. Declare the public parent contract on its Definition and let completion check
the inferred implementation channels. A
Definition-owned `makeStep` preserves or wraps the connected value. An acquired executable's operation is
a checked raw-Model executor that dispatches its produced Message through update
under its own graph and returns a readable result. Its return contract uses the
selected record handler's Command requirements and OutMessage type; complete-update utilities retain the aggregate contract. Calling a
pure operation does not run effects returned by another update branch.
Ordinary pure Steps remain callable. Keep reciprocal sibling policies in the
same parent assembly, defer the calls through policy callbacks, register every
captured Binding, and keep the synchronous chain finite. TypeScript may erase a
function result when assigning it to a method that returns `void`; outside the
exact graph, invoking that method only constructs and discards passive
configuration and executes no child work.

## Test a composed graph

Story and Scene Command and Mount matchers take the original Definition or an
instance. A Definition matches its source identity through placement-qualified
runtime names; an instance also checks exact args, and a bound instance selects
its composition path. Do not
compare a pending definition's displayed `name` with a string or with
`Definition.name`.

Resolve child Commands and Mounts with the child's raw result Message. Their
pending instances retain the generated delivery chain, so the test runner
replays every parent boundary. Do not construct a generated `Got*` envelope.
For `@foldkit/ui`, take matcher Definitions from the component's public `test`
namespace and result Messages from its passive Block contract.

Use Block-aware testing entry points so construction and cleanup stay scoped:

```ts
it.effect('updates the theme', () =>
  Story.story(
    SettingsBlock,
    Story.init(),
    Story.message(Message.UpdatedTheme({ theme: 'Dark' })),
    Story.model(model => expect(model.theme).toBe('Dark')),
  ).pipe(Effect.provide(layer)),
)
```

`Story.story` and `Scene.scene` return Effects. They acquire the selected root, run ordinary synchronous steps, and close its construction scope on success, assertion failure, interruption or constructor failure. Use `Story.init(...args)` / `Scene.init(...args)` to retain init's Model and Commands, or `given(model)` for a deliberately prebuilt Model. Additional dispatch arguments use `{ block, updateContext: [...] }`. Required default-view inputs use `{ block, viewInputs }`; routing uses the config's `routing` field. Use ordinary test Layers to satisfy construction requirements. Handler Layers are not built automatically, and ordinary HTTP/socket Services are unnecessary for a pure test unless graph construction itself requests them.

Use `it.effect` from a compatible `@effect/vitest` release for Effect-returning tests and return the runner Effect directly. Ordinary synchronous tests stay synchronous. The integration manages execution, scoped cleanup, and test services; use `it.live` for an execution test that deliberately needs the live environment. A plain Vitest test must return or await `Effect.runPromise`; `Effect.runFork` alone does not make Vitest wait. Keep necessary Promise bridges inside typed Vitest fixtures. Normal tests pass the Block directly; acquisition wrappers are for direct operations, modified initialized Models, private registrations, and custom multi-view renderers.

A direct child fact in a Block-aware Story uses `Story.messageFrom(binding, rawChildMessage)`, with the decoded occurrence key before the Message for a keyed Binding. The runner resolves the relationship against its acquired graph, including grouped `Story.steps`. Never fabricate generated envelopes. Production parents still use Binding operations.

`Story.message` may send another fact while Commands are pending. Pending work keeps its captured identity and must be resolved before the Story ends. This does not change Scene's pending-Command or Mount checks.

Use `Story.inMessage(InMessage.RequestedSubmit())` or the Scene equivalent for a parent input. The runner applies receive inside the same acquired graph. Command resolution still dispatches the raw local result through update. Reusable `Story.steps` and `Scene.inside` retain the separate input type and do not bypass Scene's pending-Command boundary.

Use `Story.withBlock(Block, acquired => ...)` only when a test needs acquired pure functions or a feature-local fixture. Return a synchronous result or an Effect from the callback; an async callback is not accepted. The acquired test facade includes the default renderer and actual selected implementation registrations. Scene Subscription steps use the exact registered entry and a declared raw Message; they do not start live Streams or prove stale-generation admission. A passive public contract does not expose private Subscription registries. Test implementation-owned behavior through its selected descriptor or retain a concrete local registry in a lower-level fixture. Keep test files in TypeScript's normal include coverage.

## Initialize children

Choose startup policy from the storage and child initializer:

| Situation                                                             | Policy                                                                                                                                 |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Required exact direct field; child init is callable with no arguments | Omit `init`; Composition initializes it                                                                                                |
| Required exact direct field; child init needs arguments               | `init: { contextToArgs }`                                                                                                              |
| Parent supplies a required direct field itself                        | `init: false`                                                                                                                          |
| Optional direct field                                                 | Omit `init` when the parent supplies the `Option`; use `init.contextToArgs` when Composition should create `Some(child)` automatically |
| Exact Option of one keyed wrapper                                     | Parent-owned; use `Binding.init({ key, args, toParentModel })` for creation                                                            |
| Exact keyed array                                                     | `init.instances` plus `init.toItem`                                                                                                    |
| Accessor or custom storage                                            | Parent-owned unless initialized explicitly                                                                                             |

When an optional direct field omits `init`, the parent supplies its `Option`
value; that value may be `Some(child)` or `None`. `init.contextToArgs` instead asks the
Composition to initialize the child and place it in `Some` automatically.

Add a `ChildInitContext` Schema to the parent Definition when several direct child
initializer selectors share context. `init.contextToArgs` and `init.instances`
then receive that decoded value, and Composition init returns it as
`childInitContext`. This context prepares arguments for the parent's direct child
initializers; it is not the current Block's own init arguments. The init plan's `model`
contains only parent-owned fields. Composition initializes children once in
`bindings` order and applies `steps` afterward.

Parent Commands come first, retained child init Commands follow, and Step
Commands come last. Collection order does not sequence their effects or completion.
Foldkit drops init Commands for occurrences absent or `presentWhen`-inactive in
the final Model. `subscriptions.when` gates Streams and does not gate init.

Use the exact registered `Binding.init({ key?, args, toParentModel,
commands? })` for custom storage or dynamic
creation. It returns a passive, noncallable recipe that retains the arguments,
mapping, key, and optional parent Commands. Return the recipe directly from the
owning Composition's `makeInit` or `makeUpdate`, or preserve it through the
parent's owned `makeStep` producer. The Composition authoring boundary interprets it
directly; an acquired operation may dispatch a Message whose update
branch returns the recipe. The recipe has no `.model` or `.commands` fields. The compiler checks the key, arguments,
complete parent Model, requirements, and exact Binding requirement. During
checked execution, runtime validation still checks the active composition frame,
child placement, and exactly one requested keyed occurrence. The available runtime
metadata cannot reconstruct TypeScript's required, optional, defaulted, and rest
parameter distinctions.

For dynamic initialization that only places the child, use the optional
`foldkit/bindingInit` helpers with the Binding, current parent Model and `{ args }`,
plus `key` for keyed storage. `initAndSet` replaces a required/optional direct
field or a keyed Option wrapper containing only its key and child fields. Direct
fields need no startup policy; a custom unkeyed accessor can reuse an existing
`init.toParentFields` projection. `initAndAppend` reuses a keyed array's existing
`init.instances` and `init.toItem` policy. `initAndInsert` inserts into direct-value
Record/HashMap storage declared through `ParentDefinition.makeMapBinding`.

All preserve passive recipes, child init Commands and registration. Append and
insert reject occupied keys. Additional
wrapper metadata, sibling changes, parent Commands, custom relationships,
array/map replacement and whole tagged variants retain explicit `Binding.init`.
Do not add a startup policy solely to enable a helper.

For direct-value Record/HashMap children that should be retained, use
`makeInitIfMissingStep(Binding, { key, args })` from `foldkit/bindingInit`.
The Binding supplies storage; the connected Step checks the current Model when
applied. An existing key preserves the parent Model and emits no Commands; an
absent key retains the initialized child's Commands. Both paths require the
registered Binding. Pass it directly to `Update.combineSteps` or a compatible
handler; use the owning `makeStep` when selecting or composing Steps. Entity
lookup and handling of unknown URL IDs belong in the application.

Prefer a child Message-backed `requestReset` or domain operation for reset
behavior, composed with the parent's `makeFieldsStep` for parent-owned fields.
Use `Binding.init({ args, toParentModel })` only for deliberate baseline
initialization, preserving unrelated parent fields and returning the recipe intact
so child init Commands are retained. Reinitialization alone does not establish a
fresh occurrence generation, cancellation, or reset of active Dialog/resource
lifecycles; the child operation must define that behavior.

For a keyed array of wrappers, prefer `init.instances` and `init.toItem` when
startup creates the complete collection. Each occurrence supplies child init
args and the parent metadata needed by `toItem`, such as an ID or server
revision. Dynamic pure appends can reuse this policy through `initAndAppend`.
Use the matching storage helper for singular fields or direct-value maps. Keep
explicit `Binding.init` for additional metadata, mixed parent changes or Commands,
array/map replacement, or custom interleaving. All these paths retain and lift the
child initializer's Commands; never take only its Model.

`init.instances` accepts keyed arrays only. An Option-wrapped keyed occurrence
uses `Binding.init({ key, args, toParentModel })`; `toParentModel` chooses
`Some(wrapper)` or another complete parent result. Folds and operations never
create the occurrence when that field is `None`.

`toItem` receives the planned `{ key, args }` and initialized child, not the full
parent ChildInitContext value. If wrapper metadata comes from ChildInitContext, make it available
through those explicit inputs or use custom initialization. The child Model
does not need to store every initializer input.

Return `toItem` wrappers as plain records containing the exact initialized child
object. A wrapper Schema constructor can reconstruct its nested child and fail
the runtime identity check. Composition applies the full parent Model Schema
after collecting the records.

An optional `boot` helper is an ordinary Step applied after the child Model
exists. Foldkit has no additional Runtime boot phase. Block init cannot emit an
OutMessage.

## Organize child Blocks

Each Block keeps its own child Block folders under `blocks/`, with an explicit
`blocks/index.ts` barrel. A parent imports its immediate children through that
barrel. Child feature barrels expose passive contracts, construction Layers,
and intentional accessors. Keep local Definition, init, update and view imports
direct inside their owner; tests may import original effect definitions from
the owning structural files. Domain and ordinary helper folders stay separate.

Import named Foldkit UI exports from public component subpaths. Give common
exports descriptive aliases, such as `DialogLayer`, `makeListboxBlock`, and
`buttonView`. The parent registers the passive child contract and provides its
construction Layer.

## Compose handlers and Services

| Value                                      | Owns                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `FeatureDefinition.contract`               | Independent Model, local Message, InMessage, Init/Context, view inputs, operations and external effect contracts |
| `FeatureComposition`                       | Static Binding/Mount inventory and typed init/update/receive/view builders                                       |
| `FeatureDefinition.makeBlock(constructor)` | Layer-owned acquisition of child implementations and checked completion                                          |
| Feature `EffectsLayer`                     | Locally owned handler recipes                                                                                    |
| Feature `layer`                            | Construction provider for the public contract                                                                    |
| Root `ApplicationLayer`                    | Ordinary HTTP, storage, RPC, browser and other environment Services                                              |

Return only local handler recipes as `EffectsLayer` from the Block constructor. Acquired child connections carry their own checked recipes and descendants. Supply each child's construction `layer`; do not merge the child's handler `EffectsLayer` again in the parent.

Keep a small local `EffectsLayer` beside its definitions. Extract `layer.ts` when the bundle is substantial or reused. Preserve `Layer` for Effect's module; reserve `ApplicationLayer` for root ordinary Service providers. An attached Subscription registry exposes `subscriptions.layer`, and a fully attached ManagedResource registry exposes `managedResources.layer`; these are handler recipes, distinct from a feature's construction `layer`.

`config.handler` is passive configuration. Its generator runs when the Runtime builds that handler Layer, returns the invocation function or resource `{ acquire, release }`, and can capture stable Services. Request args, current time, Subscription dependencies, DOM elements and active resource handles belong to the invocation or occurrence lifetime. Keep workflow state in the Model. A Block construction Layer does not eagerly build these handler recipes.

Keep concrete HTTP, storage, RPC and browser providers open for the root by default. Execution tests retain production handlers and replace ordinary Services beneath them. A feature-owned Service may be provided beneath its local handler recipe, while an operation-owned provider may be scoped inside that invocation when per-dispatch ownership is intentional. Do not move loading, retry or expected acquisition failure out of the Model into startup construction merely to shorten update.

Omit `handler` for an external host contract. Supply its implementation through the original definition's `toLayer`, preserving identity. Compose that provider into local `EffectsLayer`, or list the original definition under the constructor's `hostHandlers` and let the integrator select it through `block.provideHandlers(layer)` before hosting or scoped tests. Every possible selected Layer must provide all original handlers and fit the Definition's effects bounds. Selection is passive, preserves child construction provisioning, and does not build handler Layers in pure Stories. Descriptors expose this selector when they deliberately leave handlers to the host; an ordinary attached implementation uses its declared request Services. Declare external effects in the Definition's `effects` contract, using exact ordinary Services, ManagedResource accessors and typed constructor errors. Generic libraries can use `Block.makeEffectsContract<E, R>()` when the effect channels come from generic code rather than a finite list of Service values.

At a root with a registered child:

```ts
export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const settings = yield* SettingsBinding

    return {
      children: [settings],
      init,
      update,
      view,
      EffectsLayer,
    }
  }),
).provide(Settings.layer)
const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})
Runtime.run(program.provide(ApplicationLayer))
```

The completed descriptor and Program remain passive until an execution owner acquires their Layers. Runtime and Server entry points own construction scopes and cleanup. Building a graph explicitly in a scoped test is also execution; it does not start Model-owned lifecycles or run Commands.

## Organize the graph once

Keep compact Blocks cohesive. In a split feature, `definition.ts` owns contracts and a stable unique key and exports `FooBlock = FooDefinition.contract`. `composition.ts` imports only child contracts, owns Bindings, OutMessage policies, registration and its ViewBuilder alias. It does not import init, update, the primary view or child implementations. Portable builders may be inline, local values or imported complete expressions without changing their application types.

`block.ts` imports those builders and the child implementation Layers, completes the constructor and exports `layer`. The root's `block.ts` may instead export the selected `ApplicationBlock` used by Program or Server. A feature's explicit `index.ts` exports its public contract and `layer`. Shared Steps live in `steps.ts` or a responsibility folder; keep reciprocal sibling policies together and defer cyclic Binding reads through callbacks.

Do not create a Definition or its key in an update, callback or loop. Generic library factories need a genuine provider family for runtime specialization; use the existing component implementations as precedents rather than adding per-instance IDs or application-owned caches.

## Review invariants

- Public contracts establish their own identity, Init/Context tuple, Model, Messages, view and operation/effect channels independently of implementation.
- Every selected Binding is registered once, acquired in the constructor and returned under `children`; views embed only registered relationships.
- Extracted init/update/view/Steps depend on the static authoring contract and Composition, never a bag of constructor-local child instances.
- Connected results and explicit Binding init recipes are preserved intact until graph execution.
- Parent-driven transitions use Binding operations; generated delivery, occurrence keys and replacement admission stay with Foldkit.
- OutMessage policies are exhaustive and retain exact Command requirements, forwarding and derived outputs.
- Deferred startup policies run when parent init receives its inputs, and parent Model owns child presence and collection membership.
- Child construction Layers are provided at the construction boundary. Handler recipes remain local and ordinary external Services stay explicit.
- Definition, Composition, Layer and Program creation are passive. Test/Runtime/Server acquisition owns construction cleanup; Model and DOM lifecycles retain their separate owners.
- Real source and relocated emitted consumers preserve exact public payloads, operation channels, provider requirements and declaration reachability.
