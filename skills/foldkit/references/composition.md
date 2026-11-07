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

The Block declaration establishes the public contract and typed helpers. The Composition supplies static relationship information for portable typed builders. A Layer-owned constructor acquires the implementations that execute those relationships.

Declare an independent public contract before its implementation. `Block.make` binds a stable module-level unique `key`, Model, local Message, optional OutMessage, and an `InitArgs` tuple. Add a `Context` tuple for dispatch context, `ChildInitContext` for deferred child startup, and a `view` descriptor when the Block renders. A serializable tuple uses `Schema.Tuple`; callbacks or other deliberately nonserialized inputs use `Block.makeInputContract<...>()`.

When construction only collects registered child implementations, acquire their
exact tuple with `const children = yield* FeatureComposition.acquireChildren()`.
Leave a blank line before returning the implementation with `children` shorthand.
The helper preserves Binding order, Layer requirements, errors, identities and
construction Scope; it does not evaluate init arguments, create Models or start
handlers and lifecycles. Keep individual Binding yields when construction uses
their handles. A childless constructor can keep `children: []`.

Export the same `FooBlock` declaration for parent authorship. Parents derive Schemas from `FooBlock.Model`, configure Bindings, author extracted Steps, and render through their Composition without importing the child implementation. The key identifies the contract; the readable Block name is a label and may repeat across independent modules. Declare one unique key at module scope. When verified declaration emission needs a Block’s unique-symbol identity, export its original key declaration from the owning module. A public barrel may re-export it with `export type` when downstream declarations only need to name that identity.

A Block feature's explicit barrel exposes its passive Block, construction `layer`, stable read-only queries, and necessary public Schema/type contracts. A child may expose pure read-only selectors such as `isComplete` and `hasErrors`; the parent passes the child Model and the child owns interpreting its fields. Keep substantial selectors with their responsibility, such as `validation.ts`, rather than exporting them from update. These ordinary exports are independent of implementation Layer selection, so give them stable semantics over the public Model. Keep authoring helpers and update implementations internal. Do not copy derived values into parent state or introduce Messages solely to read them.

Complete the implementation with `FooBlock.makeLayer(Effect.gen(function* () { ... }))`. Yield each registered Binding, then return the acquired connections under `children`, together with init, update, view and local lifecycle/handler declarations. Static Composition configuration still uses `bindings`. Provide child implementations with ordinary Layer composition: `FooBlock.makeLayer(...).pipe(Layer.provide(Child.layer))`. A feature barrel exports the passive `FooBlock` and the implementation `layer`; the root exports the same `ApplicationBlock` declaration and its `layer` for paired Program or Server hosting.

Leave one blank line between the Binding acquisition group and `return`. Write each returned implementation field on its own line, even when the record would fit on one line. Use the same layout for graphless Blocks.

Name field-backed Bindings after their Model field in PascalCase with the `Binding` suffix: `activeMemberListbox` becomes `ActiveMemberListboxBinding`, and `issueDetails` becomes `IssueDetailsBinding`. Preserve optional prefixes, plurals, and role words. For wrapped storage, include the nested child role when the container alone would hide it, such as `entries[].animation` becoming `EntriesAnimationBinding`. Custom and whole-variant storage use a meaningful relationship name. A necessary private pre-policy value uses `Base<Field>Binding`; the policy-complete value keeps the canonical field name.

Inline single-use `bindings` and constructor `children` arrays at their registration sites. Export one policy-complete Binding for each relationship and acquire that same Binding in the constructor. Keep a necessary base Binding internal when reciprocal policies or self-directed operations need to break a dependency cycle. A Binding registers the relationship to a child contract; the supplied child Layer constructs its implementation.

Prefer plain array literals wherever contextual typing preserves the required element or tuple types. Use `Tuple.make` only when a value or producer would otherwise widen and lose necessary tuple typing. Do not add it to `children`, `bindings`, or initializer arguments by default.

The public contract is bounded independently of the implementation graph. Ordinary app code needs no preparation producer, assembly annotation, generic graph reconstruction, casts or `satisfies`. Check real emitted entrypoints and relocated consumers when changing published types. Generic library factories may retain their existing named `Completed` interfaces and a narrow library-owned refinement for type-only payloads; application callers keep `Component.makeBlock<Item>()` and provide `Component.layer`.

Construction builds the executable graph once in its Layer scope. It does not run init, evaluate `init.contextToArgs`, create Model occurrences, build handler Layers, run Commands or start Subscription/ManagedResource/Mount lifecycles. Acquired init, update and operations remain synchronous pure functions. Ordinary Service requirements for requests belong in their attached handler constructors. Use the Block constructor for graph construction and implementation dependencies it actually needs; keep all application workflow state in the Model.

## Canonical shape

```ts
const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const SettingsComposition = SettingsBlock.makeComposition()
const init = SettingsComposition.makeInit(() => ({
  model: { theme: 'System' },
}))
const update = SettingsComposition.makeUpdate({
  UpdatedTheme: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
})
const view = SettingsComposition.makeView((model, h) => h.p([], [model.theme]))

export const layer = SettingsBlock.makeLayer(
  Effect.gen(function* () {
    return {
      children: [],
      init,
      update,
      view,
    }
  }),
)
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

`Composition.makeInMessageUpdate` provides the same `cases`, `each`, `on`, `except`, and `compose` helpers. Its selectors narrow the InMessage union and contextual callbacks use `InMessageContext`. Each invocation owns its original `before` Model; there is no child Message delivery to route in this entry point. Returned Commands still produce ordinary local Messages. Keep one exhaustive InMessage record in the completed input update and reuse compatible Model-only Steps across both entry points. Init remains separate. Callbacks stay pure, workflow state stays in the Model, and effects stay in returned Commands.

## Parent inputs

Declare an ordinary optional `InMessage` Schema with `defineInMessageUnion` for requests and notifications a parent can initiate. Keep local Message and OutMessage unions on `defineMessageUnion`. The InMessage helper returns the same MessageUnion constructors, Schema, and exhaustive matcher, without adding a brand. It rejects invalid literal names at the offending property, retains validation for extracted literal case records, and repeats the check at runtime when JavaScript or type erasure hides the keys. Other Schema forms remain valid InMessage contracts subject to Block's existing constructor and tag validation. Its tags are disjoint from local `Message`: `RequestedSubmit` generates `Binding.requestSubmit()`, and `InformedOfIssueChanged` generates `Binding.informOfIssueChanged(payload)`. Fields use the variant constructor's exact payload contract. A keyed Binding takes its occurrence key first. Do not inflect or alias the generated names.

Author an exhaustive `Composition.makeInMessageUpdate` record and return `inMessageUpdate` with init, update and view from `FeatureBlock.makeLayer`. Local UI facts and Command results remain in `makeUpdate`. Share a reusable Step in `steps.ts` when local `SubmittedForm` and received `RequestedSubmit` need the same transition. Sparse `inMessageOutputs` entries declare emitting OutMessage bounds and additional `services` or `managedResources`; an omitted entry is silent and adds no public requirements. Commands returned from inMessageUpdate produce local Messages, never InMessages.

Declare a separate `InMessageContext` tuple and use `makeInMessageUpdate.withContext` for InMessage context. Binding methods take that context after the payload. The update `Context` and `delivery.toUpdateContext` do not supply it. InMessage handling remains synchronous and pure; it preserves the existing Binding's storage, OutMessage policy, occurrence identity and lifecycle. Acquisition does not call inMessageUpdate or initialize Model state.

An acquired executable supports `inMessageUpdate(model, inMessage, ...context)` and `inMessageUpdate(inMessage)(model, ...context)`. Scoped tests use `Story.inMessage` / `Scene.inMessage` and supply required `{ block, layer, inMessageContext: [...] }` independently of `updateContext`. Raw runners cannot resolve this cause without an acquired InMessage update.

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

Use `FeatureBlock.makeFieldsStep(producer)` for owning field transformations, `FeatureBlock.makeCommandsStep(producer)` for Commands with an unchanged Model, and `FeatureBlock.makeOutMessageStep(producer)` for one declared OutMessage with an unchanged Model.

In a split feature, `block.ts` exports the Step helpers used by its implementation and those modules named-import the helpers from that file. A colocated feature destructures helpers beside its Block declaration in the scope that uses them. Keep Block-qualified calls when several Blocks in one module need visible ownership. Feature barrels keep authoring helpers private and export the passive Block contract and construction `layer`.

Put reusable parent Steps shared by update, inMessageUpdate, composition, or init in the owning Block's `steps.ts`, or in responsibility modules such as `steps/search.ts` with an explicit `steps/index.ts` barrel. Ownership follows the Model being transformed. Keep Message routing in update and Binding registration and child OutMessage policy in composition; colocate Steps used by only one responsibility. Name shared transitions for their operation, without a `make` prefix or `Step` suffix, and defer cyclic Binding access until the producer is applied.

All three take callbacks, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, when authored as a Message-dependent handler, its exact Message. Use `.fromMessage(message => value)` for payload-only producers and `() => value` for fixed producers. Commands-only and OutMessage-only helpers preserve the incoming Model identity. `makeNoopStep()` stays unchanged; in an OutMessage fold, pass its factory point-free when appropriate.

Use `makeStep.fromMessage(message => stepOrResult)` when only the Message is needed to select or construct a composed Step or initialization recipe. The returned handler stays Model-first, evaluates the producer on application, and passes the incoming Model to a returned Step. Keep ordinary `makeStep` for Model-aware producers and additional operation arguments. Close over dispatch context through `makeUpdate.withContext`.

Pass compatible Steps directly as handler-record values. Extracted Message-dependent producers need a precise Message variant contract when no surrounding handler record supplies it. Map payloads explicitly when constructing a different Message or OutMessage; do not pass a constructor that could forward the incoming `_tag`. Keep cohesive mixed transitions as direct results, and use the owning `makeStep` helper for reusable mixed, connected, initialization, delegated, or composed operations. Local branches mixed with connected recipes still need canonical Block-owned results.

`Update.combineSteps` accepts unary non-emitting Steps and preserves its OutMessage rejection. Use `Update.withOutMessage` for an existing plain result or an optional OutMessage. Do not construct and immediately invoke local Steps solely for uniformity.

An empty record returned by `makeFieldsStep` preserves the exact incoming Model and evaluates no field transformers. `FieldTransforms<Model>` from `foldkit/struct` is available when a helper genuinely accepts a field-update record; it follows ordinary structural typing and does not enforce exact keys or Model-variant relationships alone. For a local policy helper that gates Model changes, accept a Model-to-Model callback and keep `modifyFields` at the call site, preserving its field validation without duplicating generic machinery in application code.

Choose the helper when authoring a Step. Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Do not construct and immediately apply another local Step merely to express a branch. Keep existing reusable operations, sequential composition, and Block-owned local Steps needed when mixing local branches with connected recipes; those preserve result channels and registration evidence.

For explicit adapters, name actions `request*` and notifications `informOf*`. Their local Message mapping enters update; generated InMessage methods enter inMessageUpdate. Keep actual UI facts separate from parent requests. Avoid `reflect*` helpers that bypass the owning transition to change child state.

Choose parent inputs by ownership. Use view inputs for current render data and update context (`delivery.toUpdateContext`) for current data read while handling a Message. Use an `informOf*` operation when an external event requires a child transition, Command, or OutMessage. View inputs and context do not dispatch Messages when their values change. Keep an independent editing baseline in the child Model when needed, while passing current comments or other display data through view inputs. Do not mirror parent data merely to read it, or notify a child back about a change it already applied unless another transition is required.

Create one `FeatureBlock.makeSubscriptions(...)` registry for all Subscriptions
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

Keep one Block declaration and one named Composition. Related contracts that share
owned effect definitions may create
`FeatureNamespace = Block.makeNamespace('Feature')` once at module scope, then
call `Block.make(FeatureNamespace, contracts)`. Generic component libraries with
a shared implementation provider use Foldkit’s internal library-authoring
mechanism; ordinary application Blocks need no family machinery. An ordinary
feature calls `Block.make(id, contracts)` directly. A graphless feature still
has a Composition.

Author the primary view through the Composition. An alternate renderer must preserve the declared view-input and graph capability contract.
Plain helpers
that need the same child and Mount capabilities take an owner-specific builder:

```ts
export const ProfileComposition = ProfileBlock.makeComposition({
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

A storage-specific Binding constructor describes one relationship. Adding the Binding to
`bindings` registers it. Binding construction is passive relationship configuration. In the constructor, `yield* SettingsBinding` acquires the Layer-provided child implementation and returns its exact connection; include that value under `children`. A missing child provider is a construction requirement, not an invented Model fallback.

Choose the narrowest storage form that describes the parent Model:

| Parent storage                                                    | Parent Block constructor        | Configuration                                                                         |
| ----------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| One exact child Model field                                       | `makeRequiredFieldBinding`      | `field`                                                                               |
| One required `Option<ChildModel>` field                           | `makeOptionalFieldBinding`      | `field`                                                                               |
| One closed keyed Option wrapper                                   | `makeOptionalKeyedFieldBinding` | `field`, string `key`, distinct `childField`                                          |
| Array of child Models with a declared identity field              | `makeKeyedArrayBinding`         | `field`, string `key`                                                                 |
| Array of closed wrappers or standard `ChildBlock.Instance` values | `makeKeyedArrayBinding`         | `field`, string `key`, distinct `childField`                                          |
| Required Record of child Models or closed wrappers                | `makeRecordBinding`             | `field`, optional `childField`                                                        |
| Required HashMap of child Models or closed wrappers               | `makeHashMapBinding`            | `field`, optional `childField`                                                        |
| One complete tagged child member of the parent union              | `makeVariantBinding`            | Optional placement and delivery/Subscription policies                                 |
| Custom unkeyed storage                                            | `makeCustomBinding`             | `read`, `write`                                                                       |
| Custom keyed storage or enumeration                               | `makeCustomKeyedBinding`        | `readAll`, function `key`, `read`, `writeAt`; `keySchema` for a Message-bearing child |

A Binding's `write` or `writeAt` places the next child Model into parent storage. Keep parent reactions to child transitions in its OutMessage policy. Do not compare old and new child state in a writer to generate announcements, trigger sibling changes, or maintain unrelated parent fields. Nested storage, keyed replacement, presence checks, and preservation of wrapper metadata remain legitimate custom writes. If a parent needs a child fact that is not exposed, add a truthful public OutMessage rather than using the writer as an event hook.

The generated wrapped writer replaces only the matched `childField`. For an
array, it preserves order, wrapper metadata, and unmatched references. For an
Option, it preserves wrapper metadata only when the stored key matches. `None`
and a different key leave the exact parent Model unchanged. Neither form
inserts a missing occurrence. The parent remains responsible for presence and
collection membership.

Call `ParentBlock.makeRecordBinding(ChildBlock, config)` for Record fields or
`ParentBlock.makeHashMapBinding(ChildBlock, config)` for HashMap fields.
The factory derives the key contract from the parent Model Schema and defaults
placement to the storage field.

A split feature can destructure and export the needed constructor from its `block.ts`,
then import that factory from the owning module. It retains the parent Block's
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

Call `ParentBlock.makeVariantBinding(ChildBlock)` when the child
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

Add `activeWhen` to required or optional direct-field Bindings when parent policy gates an entire child occurrence without clearing its stored Model. The predicate gates folds, operations, Subscriptions, ManagedResources and Mounts. Keyed, map and variant constructors do not accept this field; custom readers express absence themselves. A direct
`Option` field is absent while it is `None`; folds and operations do not create
it. Use `subscriptions.when` only for Stream activation.

The Binding constructor derives child delivery from the independent child contract. Do not add a
child wrapper variant to the parent's authored Message or write message
mappers. The generated envelope records the Binding placement, keyed occurrence
when present, and runtime generation. The Composition routes it only to that
exact live occurrence.

Use `delivery.when` when parent policy decides whether an occurrence can receive
a child Message. Use `delivery.toUpdateContext` when the child update requires
context from the parent Model or keyed occurrence. A custom keyed Binding for a
Message-bearing child also provides the exact `keySchema` used to encode and
validate generated delivery. Omit `keySchema` when the child's Message is
`Schema.Never` and no delivery envelope exists. These policies run at the
Binding boundary and do not become parent-authored Message variants.

```ts
export const SettingsBinding = ProfileBlock.makeRequiredFieldBinding(
  SettingsBlock,
  {
    field: 'settings',
  },
).withOutMessagePolicy({ fold: foldSettingsOutMessage })

export const ProfileComposition = ProfileBlock.makeComposition({
  bindings: [SettingsBinding],
})
```

The Composition update record handles locally authored parent Messages.
The passive `ProfileBlock.Message` is the declared local Message Schema. After graph acquisition, the executable's `Message` Codec includes the generated child envelopes required by its actual connections. Use that acquired Codec for serialization or external dispatch; do not fabricate child envelopes or maintain a second authored union. A parent calls a declared
child operation through its named Binding method. For example, when a Dialog
Block declares `InMessage.RequestedClose`, its parent calls
`DialogBinding.requestClose(...)`; it does not construct a child Message to force that
transition. Dialog's `inMessageUpdate` owns the transition. An explicit operation adapter may
instead map to a local Message handled by update. Render through
`h.block(SettingsBinding.embedView(...))`.

## OutMessages and sibling policy

For a required-field child, inline an ordinary fold as
`ParentBlock.makeRequiredFieldBinding(WholeChildBlock, ...).withOutMessagePolicy({ fold: ParentBlock.makeOutMessageFold(WholeChildBlock, handlers) })`.
Pass the passive child contract explicitly to `makeOutMessageFold` whether the fold is
inline, extracted, adapted for keyed policy, or staged for reciprocal
composition. Keep substantial transition helpers beside their fold. Name every variant directly
in the handler record, including the only variant in a union. Missing and extra
handlers fail type checking, and factory-refined payloads stay precise. The
parent Block supplies the parent Model, Message, and OutMessage contracts.
The returned Steps retain inferred Command requirements and sibling Binding
evidence for Composition to check, so do not repeat Step or payload type
arguments.

A handler takes the inferred `FoldContext` as its second parameter only when it
uses `liftCommand` or `modelBeforeUpdate`. The resulting fold stays unary when
every handler omits that parameter. Keep a purposeful factory or adapter when a
keyed fold uses other call-site context. A keyed Binding accepts the authored
fold directly when its handlers do not use the key. Otherwise author
`fold: key => ParentBlock.makeOutMessageFold(ChildBlock, handlers)` and close
over the inferred occurrence key. Pass a compatible extracted factory directly;
retain a callback when it defers a declaration read or adapts inputs. The
Binding supplies the actual OutMessage and FoldContext during delivery; the
parent Step receives the Model after the child write. The factory runs only
when that occurrence emits an OutMessage. Use an authored helper for this form; an ordinary matcher
does not carry its checked contract. Explicit
`(key, outMessage, context) => step` adapters remain available. Let
Command-producing and parent-OutMessage-producing handlers keep the channels
inferred by the owning Block.

Use `ParentBlock.makeOutMessageForward(handlers)` inline under
`withOutMessagePolicy({ forward })` when at least one variant continues through
the current Block's OutMessage. Pass the passive child contract explicitly when
extracting or adapting the forward. The helper is available only when the
parent Block declares OutMessages. Every handler returns a declared parent
OutMessage or `undefined`, and every variant remains named even when it stops.
Local handling still runs for a forwarded variant, and a derived parent
OutMessage takes precedence for that dispatch.

Select the callable `fold` and `forward` through the storage-specific Binding's
`.withOutMessagePolicy({ fold?, forward? })`. The returned value is
the full Binding to register and use. Keep an ordinary one-way policy fluent.
When a fold calls an operation on the same Binding, or two policies call each
other's Binding operations, declare the original `FooBinding` values first.
Author the Block helpers against those values, then select and register
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
Command Message, requirements, and OutMessage channels. Declare the public parent contract on its Block and let completion check
the inferred implementation channels. A
Block-owned `makeStep` preserves or wraps the connected value. An acquired executable's operation is
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
    { block: SettingsBlock, layer },
    Story.init(),
    Story.message(Message.UpdatedTheme({ theme: 'Dark' })),
    Story.model(model => expect(model.theme).toBe('Dark')),
  ),
)
```

`Story.story` and `Scene.scene` return Effects. They acquire the selected root, run ordinary synchronous steps, and close its construction scope on success, assertion failure, interruption or constructor failure. Use `Story.init(...args)` / `Scene.init(...args)` to retain init's Model and Commands, or `given(model)` for a deliberately prebuilt Model. Additional dispatch arguments use `{ block, layer, updateContext: [...] }`. Required default-view inputs use `{ block, layer, viewInputs }`; routing uses the config's `routing` field. Use ordinary test Layers to satisfy construction requirements. Handler Layers are not built automatically, and ordinary HTTP/socket Services are unnecessary for a pure test unless graph construction itself requests them.

Keep a Story or Scene specification declarative. Use immutable fixtures, `messageWith` when a Message needs the current Model at step execution, and assertions of observable Model, OutMessage, pending work, or rendered behavior. Do not use mutable outer variables or `mockImplementation` closures to relay values between steps. If those forms seem necessary, first establish that the test is not expressible through immutable setup and observable behavior, then treat the missing operation as a Story/Scene DSL gap.

Use public assertions for ordinary expectations. `Command.expectExact` is order-independent; `Command.expectExactInOrder` also checks dispatch order while preserving original identity, exact args, occurrence and count matching. Do not inspect `simulation.commands` to reconstruct either assertion. Order in a Command batch does not sequence effects or their completion.

Use `it.effect` from a compatible `@effect/vitest` release for Effect-returning tests and return the runner Effect directly. Pure domain and selector tests stay synchronous. The integration manages execution, scoped cleanup, and test services; use `it.live` for an execution test that deliberately needs the live environment. A plain Vitest test must return or await `Effect.runPromise`; `Effect.runFork` alone does not make Vitest wait. Keep necessary Promise bridges inside typed Vitest fixtures. Normal tests pass the Block and construction Layer together; acquisition wrappers are for fixture initialization, graph identity, private registrations, and custom multi-view renderers. Deliver subsequent application interactions through Story or Scene steps.

A direct child fact in a Block-aware Story uses `Story.messageIn(binding, rawChildMessage)`, with the decoded occurrence key before the Message for a keyed Binding. The runner resolves the relationship against its acquired graph, including grouped `Story.steps`. Never fabricate generated envelopes. Production parents still use Binding operations.

Nested delivery accepts a nonempty Binding path, such as `Story.messageIn([AttachmentsBinding, ResumeDropBinding], message)`. A keyed segment is `{ binding: EntriesBinding, key: entryId }`. Every next Binding must belong to the previous child and the Message must belong to the leaf. Use the direct DSL spelling instead of a forwarding-only wrapper; name concrete steps when their names clarify the scenario. Prefer ordinary `it.effect` and explicit immutable fixture Effects over a custom test function that injects a Model bundle.

`Story.message` may send another fact while Commands are pending. Pending work keeps its captured identity and must be resolved before the Story ends. This does not change Scene's pending-Command or Mount checks.

Use `Story.models(Story.steps(...), (before, after) => ...)` for immutable before/after assertions, including selected child reference comparisons. Place the initial `init` or `given` before the group. `Story.story` returns the final Model after verifying that all Commands were resolved; the Block-aware form returns an Effect of that Model. Bind the result with `const` for a later fixture instead of assigning from a `Story.model` callback. A Scene remains Model-opaque and uses view interactions and rendered assertions.

Use `Story.inMessage(InMessage.RequestedSubmit())` or the Scene equivalent for a parent input. The runner applies `inMessageUpdate` inside the same acquired graph. Command resolution still dispatches the raw local result through update. Reusable `Story.steps` and `Scene.inside` retain the separate input type and do not bypass Scene's pending-Command boundary.

Use `Story.withBlock({ block: FeatureBlock, layer }, acquired => ...)` only when a fixture needs acquired initialization, graph identity or custom view context. Return a synchronous result or an Effect from the callback; an async callback is not accepted. The acquired test facade includes the default renderer and actual selected implementation registrations. Scene Subscription steps use the exact registered entry and a declared raw Message; they do not start live Streams or prove stale-generation admission. A passive public contract does not expose private Subscription registries. Test implementation-owned behavior through its Block/Layer pair or retain a concrete local registry in a lower-level fixture. Keep test files in TypeScript's normal include coverage.

## Initialize children

Choose startup policy from the storage and child initializer:

| Situation                                                             | Policy                                                                                                                                 |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Required exact direct field; child init is callable with no arguments | Omit `init`; Composition initializes it                                                                                                |
| Required exact direct field; child init needs arguments               | `init: { contextToArgs }`                                                                                                              |
| Parent supplies a required direct field itself                        | `init: false`                                                                                                                          |
| Optional direct field                                                 | Omit `init` when the parent supplies the `Option`; use `init.contextToArgs` when Composition should create `Some(child)` automatically |
| Exact Option of one keyed wrapper                                     | Parent-owned; use `Binding.init({ key, args, toParentModel })` for creation                                                            |
| Exact keyed array                                                     | `init.instances`; omit `init.toItem` for direct child Models, supply it for wrappers or metadata                                       |
| Accessor or custom storage                                            | Parent-owned unless initialized explicitly                                                                                             |

When an optional direct field omits `init`, the parent supplies its `Option`
value; that value may be `Some(child)` or `None`. `init.contextToArgs` instead asks the
Composition to initialize the child and place it in `Some` automatically.

Add a `ChildInitContext` Schema to the parent Block when several direct child
initializer selectors share context. `init.contextToArgs` and `init.instances`
then receive that decoded value, and Composition init returns it as
`childInitContext`. This context prepares arguments for the parent's direct child
initializers; it is not the current Block's own init arguments. The init plan's `model`
contains only parent-owned fields. Composition initializes children once in
`bindings` order and applies `steps` afterward.

Parent Commands come first, retained child init Commands follow, and Step
Commands come last. Collection order does not sequence their effects or completion.
Foldkit drops init Commands for occurrences absent or `activeWhen`-inactive in
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
`foldkit/binding` helpers with the Binding, current parent Model and `{ args }`,
plus `key` for keyed storage. `initAndSet` replaces a required/optional direct
field or a keyed Option wrapper containing only its key and child fields. Direct
fields need no startup policy; a custom unkeyed accessor can reuse an existing
`init.toParentFields` projection. `initAndAppend` reuses a keyed array's existing
`init.instances` policy and direct-storage default or explicit `init.toItem`.
`initAndInsert` inserts into direct-value
Record storage declared through `makeRecordBinding` or HashMap storage declared through `makeHashMapBinding`.

All preserve passive recipes, child init Commands and registration. Append and
insert reject occupied keys. Additional
wrapper metadata, sibling changes, parent Commands, custom relationships,
array/map replacement and whole tagged variants retain explicit `Binding.init`.
Do not add a startup policy solely to enable a helper.

For direct-value Record/HashMap children that should be retained, use
`makeInitIfMissingStep` from `foldkit/binding`. The `{ key, args }` form
snapshots a static selection at construction. A pure producer may instead return
`Option.some({ key, args })` or `Option.none()` from the current Step Model; the
Binding contextually supplies the exact Model, key and init argument types.
Construction remains passive. The registered graph evaluates the producer
exactly once during interpretation, after preceding Steps have produced their
Model. `None` and an existing key preserve that exact Model, emit no Commands and
do not run child init; a missing selected key retains the initialized child's
Commands. Every branch requires the original Binding registration. Pass the
Step directly to `Update.combineSteps` or a compatible handler; use the owning
`makeStep` when selecting or composing Steps. Entity lookup and handling of
unknown URL IDs belong in the application. Wrappers, custom metadata and parent
Commands keep explicit `Binding.init`.

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

### Create children in Instance arrays

For a required top-level array containing only occurrence keys and child state,
declare `Schema.Array(ChildBlock.Instance)`. Each ready Instance is
`{ key: string, model: ChildModel }`. Bind it with the explicit
`{ field, key: 'key', childField: 'model' }` configuration. The parent owns
membership and order; the Binding still owns child delivery and OutMessage policy.

The owning `makeFieldsStep` can append `Binding.create({ key, args })` while
changing sibling parent fields. `args` retains the child's exact init tuple.
For example:

```ts
const CountersBinding = ApplicationBlock.makeKeyedArrayBinding(CounterBlock, {
  field: 'counters',
  key: 'key',
  childField: 'model',
})

const addCounter = makeFieldsStep(model => ({
  counters: Array.append(
    CountersBinding.create({
      key: `counter-${model.nextCounterId}`,
      args: [],
    }),
  ),
  nextCounterId: Number.increment,
}))
```

`create` returns a passive request. It does not call init, acquire a child,
build handlers, or start lifecycles. Checked execution through the registered
Composition resolves the requests synchronously before the following Step,
stores ready Instances, and retains child init Commands, exact requirements,
and registration evidence. Creation-bearing field results are opaque connected
recipes until execution. Ordinary field changes remain Model-only.

Startup can supply an empty Instance array and reuse the same creation transition
in `makeInit`'s `steps`. Subsequent Steps can immediately apply bound child
operations. Requests cannot substitute for ready Instances in `Model.make` or
`modifyFields`, and their child Models cannot be read before resolution. Seed prebuilt Models with
`ChildBlock.Instance.make({ key, model })`; Schema decoding restores ready
snapshots without rerunning init or producing init Commands.

Creation rejects duplicate keys and replacement of keys present before the
Step. Removal uses ordinary parent field transforms and the existing occurrence
lifecycle. Reintroducing a key in a later update creates a new generation;
removing and readding it within one update does not. Keep existing initialization
helpers for Option fields, Record/HashMap storage, custom wrapper metadata, or
arrays whose child Model owns its ID. Do not change those representations solely
to adopt `create`. See `examples/counters/src/block.ts` for a complete app.

## Organize child Blocks

Each Block keeps its own child Block folders under `blocks/`, with an explicit
`blocks/index.ts` barrel. A parent imports its immediate children through that
barrel. Child feature barrels expose passive contracts, construction Layers,
and intentional accessors. Keep local Block declaration, init, update and view imports
direct inside their owner; tests may import original effect definitions from
the owning structural files. Domain and ordinary helper folders stay separate.

Import a file's Foldkit UI component namespaces together from `@foldkit/ui`.
Use each owning namespace for its passive Block, factory, construction Layer,
types, and tests: `Dialog.DialogBlock`, `Listbox.makeBlock`, `Dialog.layer`,
`Listbox.RenderInfo`, and `Listbox.test`. Alias a namespace only for a genuine
local collision; never import a component subpath or alias one of its members.
The parent registers the passive child contract and provides its construction
Layer.

Listbox and Combobox are the Schema-backed selection families. Pass Combobox
its Item Schema. Use `Listbox.makeBlock()` for plain strings,
`Listbox.makeBlock(ValueSchema)` when items are values directly, or
`Listbox.makeBlock(ItemSchema, ValueSchema)` for richer view items;
`Listbox.Multi` has the same forms. The Value Schema validates selected
Messages and OutMessages at runtime. The Item Schema only witnesses view
inputs and adds no serialization or Service requirements. Omit `itemToValue`
only when the actual items satisfy Value; otherwise extract Value explicitly.
There is no type-argument-only Listbox form. Menu, RadioGroup, Tabs, and other
generic factories retain their own type-parameter APIs.

When a feature's rendering is subdivided, `view/view.ts` composes the feature's
render fragments and `view/index.ts` explicitly exports the intended view
surface. Keep route, page, and demo renderers below `view/`; keep Model,
Message, contracts, init, update, and other non-rendering ownership above it.

## Compose handlers and Services

| Value                                 | Owns                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `FeatureBlock`                        | Independent Model, local Message, InMessage, InitArgs/Context, view inputs, operations and external effect contracts |
| `FeatureComposition`                  | Static Binding/Mount inventory and typed init/update/inMessageUpdate/view builders                                   |
| `FeatureBlock.makeLayer(constructor)` | Layer-owned acquisition of child implementations and checked completion                                              |
| Feature `EffectsLayer`                | Locally owned handler recipes                                                                                        |
| Feature `layer`                       | Construction provider for the public contract                                                                        |
| Root `ApplicationLayer`               | Ordinary HTTP, storage, RPC, browser and other environment Services                                                  |

Return only local handler recipes as `EffectsLayer` from the Block constructor. Acquired child connections carry their own checked recipes and descendants. Supply each child's construction `layer`; do not merge the child's handler `EffectsLayer` again in the parent.

Keep a compact local `EffectsLayer` beside its definitions. A split feature composes the separate bundle in `effectsLayer.ts`. Preserve `Layer` for Effect's module; reserve `ApplicationLayer` for root ordinary Service providers. An attached Subscription registry exposes `subscriptions.layer`, and a fully attached ManagedResource registry exposes `managedResources.layer`; these are handler recipes, distinct from a feature's construction `layer`.

`config.handler` is passive configuration. Its generator runs when the Runtime builds that handler Layer, returns the invocation function or resource `{ acquire, release }`, and can capture stable Services. Request args, current time, Subscription dependencies, DOM elements and active resource handles belong to the invocation or occurrence lifetime. Keep workflow state in the Model. A Block construction Layer does not eagerly build these handler recipes.

Keep concrete HTTP, storage, RPC and browser providers open for the root by default. Execution tests retain production handlers and replace ordinary Services beneath them. A feature-owned Service may be provided beneath its local handler recipe, while an operation-owned provider may be scoped inside that invocation when per-dispatch ownership is intentional. Do not move loading, retry or expected acquisition failure out of the Model into startup construction merely to shorten update.

Omit `handler` for an external host contract. Supply its implementation through the original definition's `toLayer`, preserving identity. Compose that provider into local `EffectsLayer`, or list the original definition under the constructor's `hostHandlers` and let the integrator select it with `layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))` before hosting or scoped tests. Every possible selected Layer must provide all original handlers and fit the Block's effects bounds. Selection is passive, preserves child construction provisioning, and does not build handler Layers in pure Stories. The Block-owned selector checks the exact pending handlers of its construction Layer; an ordinary attached implementation uses its declared request Services. Declare external effects in the Block's `effects` contract, using exact ordinary Services, ManagedResource accessors and typed constructor errors. Generic libraries can use `Block.makeEffectsContract<E, R>()` when the effect channels come from generic code rather than a finite list of Service values.

At a root with a registered child:

```ts
export const layer = ApplicationBlock.makeLayer(
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
).pipe(Layer.provide(Settings.layer))
const program = Program.make({
  block: ApplicationBlock,
  layer,
  container: document.getElementById('root'),
})
Runtime.run(program.provide(ApplicationLayer))
```

The construction Layer and Program remain passive until an execution owner acquires their Layers. Runtime and Server entry points own construction scopes and cleanup. Building a graph explicitly in a scoped test is also execution; it does not start Model-owned lifecycles or run Commands.

## Organize the graph once

Keep compact Blocks cohesive. In a split feature, `block.ts` owns contracts and a stable unique key and exports `FooBlock = Block.make(...)`. `composition.ts` imports only child contracts, owns Bindings, OutMessage policies, registration and its ViewBuilder alias. It does not import init, update, the primary view or child implementations. Portable builders may be inline, local values or imported complete expressions without changing their application types.

`layer.ts` imports those builders and the child implementation Layers, completes the constructor and exports `layer`. The root's `layer.ts` may instead export the `ApplicationBlock` and its construction `layer` used by Program or Server. A feature's explicit `index.ts` exports its public contract and `layer`. Shared Steps live in `steps.ts` or a responsibility folder; keep reciprocal sibling policies together and defer cyclic Binding reads through callbacks.

Do not create a Block declaration or its key in an update, callback or loop. Generic library factories need a genuine provider family for runtime specialization; use the existing component implementations as precedents rather than adding per-instance IDs or application-owned caches.

## Review invariants

- Public contracts establish their own identity, InitArgs/Context tuple, Model, Messages, view and operation/effect channels independently of implementation.
- Every selected Binding is registered once, acquired in the constructor and returned under `children`; views embed only registered relationships.
- Extracted init/update/view/Steps depend on the static authoring contract and Composition, never a bag of constructor-local child instances.
- Connected results and explicit Binding init recipes are preserved intact until graph execution.
- Parent-driven transitions use Binding operations; generated delivery, occurrence keys and replacement admission stay with Foldkit.
- OutMessage policies are exhaustive and retain exact Command requirements, forwarding and derived outputs.
- Deferred startup policies run when parent init receives its inputs, and parent Model owns child presence and collection membership.
- Child construction Layers are provided at the construction boundary. Handler recipes remain local and ordinary external Services stay explicit.
- Block declaration, Composition, Layer and Program creation are passive. Test/Runtime/Server acquisition owns construction cleanup; Model and DOM lifecycles retain their separate owners.
- Real source and relocated emitted consumers preserve exact public payloads, operation channels, provider requirements and declaration reachability.

## Contract bounds and extraction

Declare the unique key immediately before its Block and give `Symbol('Feature')` the same description as the Block's readable name. Keep the key private unless verified declaration emission needs its original declaration exported. Split implementation modules commonly need that export because their inferred contracts name the owner key. A public barrel may re-export the original declaration with `export type` when only its identity is needed in types. Verify source and relocated declarations before removing an export.

Declare ordinary parent requests and notifications in the child's `defineInMessageUnion` union and handle them with `Composition.makeInMessageUpdate`. Keep local Messages and OutMessages on `defineMessageUnion`. `RequestedX` generates `Binding.requestX`, and `InformedOfX` generates `Binding.informOfX`. The remaining suffix is preserved exactly; other prefixes and empty suffixes are rejected. Methods take the constructor payload when present, with a keyed occurrence first and InMessage context last. They return connected parent Steps, so pass them directly to handler records or compose them. Do not add a manual request wrapper or an `operations` entry that only repeats an InMessage constructor. Keep explicit operations for real argument adaptation, generic interfaces or intentional local-Message mappings.

Inline handlers receive their exact Model and Message from the Composition. When extracting a Message-dependent callback without that context, annotate its precise Message variant, as in `makeStep((model, { url }: ChangedUrl) => ...)` or `makeStep.fromMessage(({ url }: ChangedUrl) => ...)`. The helper still infers result channels. The proposed single-Message type-argument forms are not supported; defaulting the remaining type parameters loses output inference. Do not replace the useful parameter annotation with broad return types, casts or repeated generic arguments.

Application behavior belongs in Story or Scene. Use their DSL to deliver Messages and InMessages, resolve Commands, and assert Models, OutMessages and views. Do not manually chain acquired `update` calls or invoke application Steps as a substitute for the DSL. Pure fixture construction and intentional `given(model)` remain valid; use scoped acquisition only when a fixture genuinely needs initialized state, graph identity or custom view context. Keep pure domain/selector tests separate from application behavior, and reserve low-level transition tests for framework infrastructure.

The public `effects` contract bounds runtime capabilities: `services` lists ordinary handler Services, `managedResources` lists resource accessors, and `Error` bounds handler-constructor failures. Explicit operation declarations and `inMessageOutputs` use the same `managedResources` spelling for their extra resource requirements. These contracts describe capabilities; local `EffectsLayer` selects their handlers. Construction dependencies still flow through ordinary Layer provision, and ordinary request Services stay inside handler constructors.

Do not declare `codec` on a Block. Foldkit requires the Model, local Message, and complete generated Message Codecs to encode and decode synchronously without Effect Services. Generated child envelopes propagate their requirements through the registered graph, so a Service-dependent child Message also rejects its parents. Synchronous transformations backed by `Effect.succeed` and standard `Option` and `Date` JSON Codecs remain valid. An Effect requirement of `never` proves only that no Service is needed; a Promise-backed transformation is rejected when Foldkit actually serializes or deserializes a value. Block declaration, Composition, Layer construction, and Program construction remain passive. This restriction does not narrow private Codecs used inside Commands or other effectful APIs; supply those requirements in the Effect that runs them.
