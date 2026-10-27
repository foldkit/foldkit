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

Build that boundary through Definition → Composition → preparation → assembly. All four stages are passive:

1. `Block.makeDefinition` establishes the contracts and authors Commands, Steps,
   lifecycle entries, and child Bindings.
2. `makeComposition` fixes the registered child and Mount graph. The named
   Composition authors init, update, and the canonical view against that graph.
3. `prepareBlock` checks and packages that authored implementation plus local
   operations, Subscriptions, ManagedResources, `EffectsLayer`, and
   `hostHandlers` as an opaque unfinished assembly with no Model or runtime
   methods.
4. `Block.assemble` invokes the producer exactly once while constructing the
   passive branded Block accepted by Bindings, Programs, and Server rendering.
   It does not run init, construct Layers, or start effects.

The root is an ordinary Block built through the same four stages. Name its
completed value `ApplicationBlock`. `Program.make` or `Program.makeElement`
adds host behavior, and the Runtime constructs the resulting Layer graph and
starts effects.

Use a plain view helper when a section only renders state owned elsewhere. Use
a Block when the section owns a state machine, effect or lifecycle boundary,
or reusable interaction behavior. Foldkit UI follows the same distinction:
stateful components are Blocks; stateless components expose `view` and use the
caller's Model and builder.

## Canonical shape

```ts
export const SettingsDefinition = Block.makeDefinition('Settings', {
  Model,
  Message,
  OutMessage,
})

export const SettingsComposition = SettingsDefinition.makeComposition()

export const init = SettingsComposition.makeInit(() => ({
  model: { theme: 'System' },
}))

export const update = SettingsComposition.makeUpdate({
  UpdatedTheme: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})

export const view = SettingsComposition.makeView((model, h) =>
  h.p([], [model.theme]),
)

const prepare = () =>
  SettingsComposition.prepareBlock({
    init,
    update,
    view,
  })
export const SettingsBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
```

Ordinary source exports use an explicit zero-argument assembly producer and
header. Choose `Block.FromAssemblyWithView`,
`Block.FromAssemblyWithViewAndOutMessage`, `Block.FromAssemblyWithOutMessage`,
or `Block.FromAssemblyWithoutViewOrOutMessage` from the actual assembled view
and Definition OutMessage. Name the single private zero-argument producer
`prepare`, pass `typeof Model` and `typeof prepare`, and put the annotated
completed export immediately after it with no blank line. Use a descriptive
producer name only when one file genuinely contains multiple assembly
producers. Initialize the completed export with `Block.assemble(prepare)`. Parent
Schemas use `ChildBlock.Model`, and the feature barrel exports the completed
Block while Model remains internal. The explicit canonical Model header keeps a
parent Schema projection from forcing TypeScript through the entire inferred
implementation graph. This boundary can improve targeted checking and member
completion; it does not eliminate all TypeScript latency. Helper constraints
still check the actual contract.
Casts, broad Block annotations, `satisfies`, raw producer calls, and annotations
without the matching finisher do not establish this boundary. `replaceEffectsLayer`
and `provideHandlers` preserve the assembly brand, object metadata, and passive
runtime behavior.

Author an exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record. Each case receives the contextual Model and exact Message payload, and operations retain the selected case's Command requirements and OutMessage contract. Use `makeUpdate.withContext(context => cases)` for additional dispatch arguments; the factory runs for local dispatch, not routed child-only delivery. Generic Step values inside that context factory may need `model => step(model)` for inference. Ordinary handlers return results directly; do not wrap every case with `makeStep`. A Model-preserving no-op record value is `makeNoopStep()`, not the bare factory.

When a handler only applies an existing compatible Model-first Step, use that Step point-free as the record value: `ClickedOpenSearch: SearchBinding.requestOpen()`. Keep a callback when it uses the Message payload, derives arguments from the Model, defers argument construction until dispatch, supplies context, or provides necessary contextual inference. A `Message.match` branch receives the Message payload first, so it cannot use a Model-first Step in the same way.

`Composition.makeUpdate` accepts only an exhaustive handler record; its callback overload is removed. Use `makeUpdate({})` when there are no local Messages. Each handler receives `(model, message)`; name extracted single-Message handlers `handle<MessageTag>` and pass compatible handlers or Steps directly. Give every named Model-first Step value a descriptive name ending in `Step`, such as `refreshStep`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Factory methods, imported authoring helpers, named OutMessage folds and matchers, direct inline handlers, public operation keys, Message tags, and applied update-like results keep their established names. If one handler mixes connected Binding recipes with local results, author its local branches through Definition-owned Steps. A raw `{ model }` beside a connected recipe is rejected; ordinary raw-only handlers can return results directly. Do not hide errors with casts or broad return annotations: a later wrapper cannot recover channels already erased upstream.

For a package shipping declarations, name each ordinary public completed contract with a same-name interface extending the matching checked `FromAssembly*<typeof Model, typeof prepare>`, followed by `export const FeatureBlock: FeatureBlock = Block.assemble(prepare)`. Keep producer, interface, and value adjacent as one assembly unit. A reusable named generic `Completed` interface can provide that boundary for a generic factory. JavaScript-only applications retain the existing checked value annotation. Verify declaration emission for actual public entrypoints and external consumption; `noEmit` alone is insufficient and there is no reliable child-count threshold. Naming the header prevents repeated child expansion, but it does not guarantee arbitrary root serialization or seal deliberate ambient augmentation.

An authored update is dual: the Runtime uses
`update(model, message, ...context)`, while application composition can use
`update(message)(model, ...context)` as an internal Step. Put a local Message
constructor directly under `operations` when its payload is the public input.
Assembly creates the callable operation without constructing a Message. A constructor with fields takes one constructor payload
object followed by the update context, with constructor defaults honored; a
constructor without fields takes no payload placeholder. Keep a tuple producer
under `operations` when public inputs need mapping, refinement, defaults, or an
exact context tuple. Both forms pass their Message through update synchronously
as part of the pure transition; they do not enqueue another Runtime Message.
Use `InformedOf*` for parent notifications and `Requested*` for requested
actions. `Update.combineSteps` accepts unary Steps, so wrap a contextual curried
update in a unary adapter that supplies every required context argument.

Use `FeatureDefinition.makeFieldsStep(producer)` for owning field transformations, `FeatureDefinition.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureDefinition.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

In a split feature, `definition.ts` exports the Step helpers used by its implementation and those modules named-import the helpers from that file. A colocated feature destructures helpers beside its Definition in the scope that uses them. Keep Definition-qualified calls when several Definitions in one module need visible ownership. Feature barrels keep authoring helpers private and export the completed Block.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Use `makeStep.fromMessage(message => stepOrResult)` when only the Message is needed to select or construct a composed Step or initialization recipe. The returned handler stays Model-first, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Definition-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

An empty record returned by `makeFieldsStep` preserves the exact incoming Model and evaluates no field transformers. `FieldTransforms<Model>` from `foldkit/struct` is available when a helper genuinely accepts a field-update record; it follows ordinary structural typing and does not enforce exact keys or Model-variant relationships alone. For a local policy helper that gates Model changes, accept a Model-to-Model callback and keep `modifyFields` at the call site, preserving its field validation without duplicating generic machinery in application code.

Choose the helper when authoring a Step. Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep existing reusable operations, sequential composition, and Definition-owned local Steps needed when mixing local branches with connected recipes; those preserve result channels and registration evidence.

Parent-facing operation names describe the communication: `requestCloseMenu` produces `Message.RequestedCloseMenu`, `informJoined` produces `Message.InformedOfJoin`, and `informRouteChanged` produces `Message.InformedOfRouteChange`. Use `request*` for actions and `inform*` for notifications. Both enter child update; avoid silent `reflect*` Model synchronization. Keep an actual UI fact separate when it represents a different event.

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
factory. Each specialization calls `FeatureNamespace.makeDefinition(...)`. An
ordinary feature calls `Block.makeDefinition(id, contracts)` directly. A
graphless feature still has a Composition.

Author the primary view through the Composition. A completed Block's `makeView`
method is for an alternate embed view against the fixed graph. Plain helpers
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
`bindings` registers it. Binding construction alone does not route
Messages, collect lifecycle entries, or contribute handler recipes.

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

`makeBinding` derives child delivery from the completed child Block. Do not add a
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
`ProfileComposition.Message` and the completed `ProfileBlock.Message` add the
generated child envelope schemas required by registered Bindings. Derive a
dispatch type from one of those complete contracts when another module needs it;
do not maintain a second authored union. A parent calls a declared
child operation through its named Binding method. For example, when a Dialog
Block declares `requestClose` under `operations`, its parent calls
`DialogBinding.requestClose(...)`; it does not construct a child Message to force that
transition. The operation producer constructs `RequestedClose`, and Dialog
update owns the transition. Render through
`h.block(SettingsBinding.embedView(...))`.

## OutMessages and sibling policy

Inline an ordinary unkeyed fold as
`makeBinding(WholeChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(WholeChildBlock, handlers) })`.
Pass the completed child explicitly to `makeOutMessageFold` whether the fold is
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
the current Block's OutMessage. Pass the completed child explicitly when
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
Command Message, requirements, and OutMessage channels. Derive exported parent
contracts from the Composition-authored update or completed Block. A
Definition-owned `makeStep` preserves or wraps the connected value. A completed operation is
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
namespace and result Messages from its completed Block.

When a parent Story needs a direct child fact without a view, use
`toParentMessage(binding, childMessage)` from `foldkit/test`. A keyed Binding
takes its decoded key before the Message. It validates decoded values and uses
the Binding's tracked mapper for one synthetic generation-`0` replay boundary.
It does not select a live occurrence or bypass normal dispatch. Do not obtain
a mapper through unrelated `embedView` configuration or fabricate generated
envelopes. Production parents still call Binding operations.

`Story.message` may send another fact while Commands are pending. Pending work
keeps its captured identity and must still be resolved before the Story ends.
Use this to test concurrent updates and delayed results without manufacturing
pending Models. It does not change Scene's pending-Command or Mount checks.

A Scene that emits a Subscription Message registers
`Scene.subscriptions(ApplicationComposition, localSubscriptions?)`, passes the
registry in its config, and calls `Subscription.emit(entry, rawMessage)`. The
selected entry must declare that raw Message. Keep `*.test.ts` and `*.test.tsx`
files inside the project's TypeScript `include` coverage so signature changes
fail during the normal typecheck.

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
directly; a completed operation may dispatch a Message whose update
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

## Compose handlers and Services

Composition and Layers describe different parts of the program:

| Value                                  | Owns                                                                                           |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `FeatureComposition`                   | Registered child placements and Mount capabilities; authors init, update, and the primary view |
| `FeatureComposition.prepareBlock(...)` | Local operations, Subscriptions, ManagedResources, `EffectsLayer`, and declared `hostHandlers` |
| Feature `EffectsLayer`                 | Handler recipes declared by that feature                                                       |
| Registered child Binding               | The selected completed child's registrations and handler graph                                 |
| Root `ApplicationLayer`                | Shared HTTP, storage, RPC, browser, and other environment Service providers                    |

Pass only local handler recipes to `FeatureComposition.prepareBlock` or root
preparation. Registered child Bindings contribute their selected recipes and
descendants automatically. Never merge a child's `EffectsLayer` again at its
parent or root.

Keep a small local `EffectsLayer` beside its definitions. Extract `layer.ts`
when the bundle is substantial or reused. Name a single provider `FooLayer`
only when it is public or independently reused. Import Effect's module as
`Layer` and reserve `ApplicationLayer` for the root's ordinary Service
providers.

When Subscription declarations are split from Block assembly, that module
exports the Block's one `subscriptions` registry. Compose
`Feature.subscriptions.layer` directly in the local handler bundle. When that
registry supplies all local handlers, pass `EffectsLayer: subscriptions.layer`
directly to `prepareBlock`.

`config.handler` defines a recipe; it does not build it. Its generator runs
once when the Runtime builds the application Layer. A Command, Subscription, or
Mount constructor returns the invocation function used with each current args,
dependencies, or element value. A ManagedResource constructor returns an
`{ acquire, release }` object; Foldkit calls those functions as the Model starts
and stops requesting the handle. Capture application-scoped Services in the
generator. Keep workflow state visible in the Model rather than in a captured
`Ref`.

An existing Effect or Stream can keep its Service requirements open. Return it
from the invocation function; the handler Layer retains those requirements and
captures its construction Context. Contextual lookups prefer invocation
Services. Do not yield a Service solely to re-provide the same instance to that
operation. A closure that directly calls a captured Service keeps that instance.

### Choose the provider boundary

Keep concrete HTTP, storage, RPC, and browser providers open for the root to
select by default. This lets production and whole-application tests use the
same handlers with different transports. A feature may provide a business
Service it owns beneath its local `EffectsLayer`; leave the environment
provider that Service consumes open at the root. Use `Layer.provideMerge` when
a provider's output must remain available to both Flags and handlers.

Use a private `Effect.provide` only when one operation deliberately owns the
provider and no application environment should select, share, or replace it.
That provider is built for each operation execution rather than once for the
Runtime. A Layer constructor runs during application startup, before a Model
exists. If acquisition failure, loading, or retry belongs in the UI, perform it
inside a Command invocation or ManagedResource and report it through Messages.

Keep these lifetimes distinct:

| Lifetime             | Examples                                              |
| -------------------- | ----------------------------------------------------- |
| One Runtime start    | Shared Service instances and constructed handlers     |
| One Command dispatch | Command args, current time, one response              |
| One Model condition  | Subscription Streams and ManagedResource handles      |
| One mounted element  | Element observers, chart instances, anchored overlays |

Do not capture a Command argument, current time, Subscription dependency, DOM
element, or active ManagedResource handle in an application-scoped constructor.

Omit `handler` only for a contract intentionally supplied by an external host.
List that definition under `hostHandlers` when preparing the Block, then call
`provideHandlers` on that completed Block before binding it:

```ts
const prepare = () =>
  EditorComposition.prepareBlock({
    init,
    update,
    view,
    hostHandlers: [SaveDocument],
  })
const EditorBlockWithHostContract: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const SaveDocumentLayer = SaveDocument.toLayer(saveDocumentHandler)

export const EditorBlock =
  EditorBlockWithHostContract.provideHandlers(SaveDocumentLayer)
```

The host constructs `saveDocumentHandler` as the constructor Effect expected by
`SaveDocument.toLayer`. `provideHandlers` must satisfy exactly the contracts
declared in `hostHandlers`; it is a method on the completed Block, not on the
Definition or Composition.

To replace a feature's complete local recipe, call
`EditorBlock.replaceEffectsLayer(recipe)` before binding; selected child recipes
stay attached. Ordinary execution tests keep real handler recipes and replace
the ordinary Service providers below them.

At the root:

```ts
const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
})

Runtime.run(program.provide(ApplicationLayer))
```

The completed Program is still passive. `provide` supplies remaining
ordinary Services and returns another passive value. The Runtime builds the
graph once per start and releases its application scope when that run stops.

## Organize the graph once

A compact feature may keep all four stages together. In a split feature, `definition.ts` owns a Definition that is reused by authoring methods. When the factory's only use is `makeComposition`, `composition.ts` owns the top-level factory chain instead. `composition.ts` owns Bindings, OutMessage
policies, the complete registrations, the named Composition, and any owner
ViewBuilder alias. When policy needs a `composition/` directory,
`composition/composition.ts` remains the single assembly point and its barrel
exports intended values explicitly. Composition does not import the primary
view, update matcher, or completed Block.

A split graphless feature puts its empty Composition in `composition.ts`.
A retained split `definition.ts` contains contracts and the Definition, never a Composition or owner-specific ViewBuilder. Do not inline the factory into a callback, loop, or conditional because the owner identity must remain a singleton.
A split root always gives its Composition an assembly module, including when
the graph is empty. The root entry imports init, update, view, local
`EffectsLayer`, and `ApplicationLayer` from their owners, assembles the
Application, and starts the Runtime. It does not maintain a second child or
handler inventory.

## Review invariants

Before finishing composition work, verify these properties:

- Every Block and Application has one Definition and one named Composition.
- Every selected Binding is registered exactly once and every embedded view
  uses a registered Binding.
- Every connected fold or Binding-projected operation is applied to a Composition-provided
  Model, or returned from a Definition-owned Step for deferred application.
- Every explicit Binding init recipe is returned intact from `makeInit` or a
  Definition-owned Step; no caller projects result fields from it.
- Parent code uses Binding operations for parent-driven transitions and lets
  Composition route generated child envelopes.
- Optional absence and keyed removal cannot deliver stale callbacks or Command
  results into a replacement occurrence.
- OutMessage policy is exhaustive, forwards only intentionally, and retains
  context or inferred Command requirements when branches need them.
- Init declares who creates every child and returns only parent-owned fields.
- Each feature supplies only its local handler recipes. The root supplies
  ordinary Services once.
- An ordinary feature barrel exports only its completed `FooBlock`; reusable
  Schemas and pure utilities use an explicit domain barrel.
- Definition, Composition, preparation, assembly, Binding, and `provide` remain passive;
  only the Runtime starts execution.
