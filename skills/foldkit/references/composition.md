# Block Composition and Layers

Read this reference when a Foldkit app defines a Block, binds a stateful UI
component, initializes children, exposes child operations, or supplies handler
Layers. For exact overloads, inspect the installed declarations and the
matching example from the same Foldkit version.

## The ownership model

A Block owns one state machine: its Model, Messages, update, optional
OutMessages, canonical view, effects, lifecycle entries, and public operations.
Its parent owns integration policy: where the child Model is stored, whether an
occurrence exists, how child Messages are wrapped, what OutMessages mean to the
parent, and where the child renders.

Build that boundary in three passive stages:

1. `Block.define` establishes the contracts and authors Commands, Steps,
   lifecycle entries, and child Bindings.
2. `makeComposition` fixes the registered child and Mount graph. The named
   Composition authors init, update, and the canonical view against that graph.
3. `makeBlock` receives that authored implementation plus local exposed
   operations, Subscriptions, ManagedResources, `EffectsLayer`, and
   `hostHandlers`, then checks and packages the completed Block. It does not run
   init, construct Layers, or start effects.

The root follows the same first two stages with `defineApplication`, then calls
`makeApplication` or `makeElement`. The Runtime constructs the resulting Layer
graph and starts effects.

Use a plain view helper when a section only renders state owned elsewhere. Use
a Block when the section owns a state machine, effect or lifecycle boundary,
or reusable interaction behavior. Foldkit UI follows the same distinction:
stateful components are Blocks; stateless components expose `view` and use the
caller's Model and builder.

## Canonical shape

```ts
export const Settings = Block.define('Settings', {
  Model,
  Message,
  OutMessage,
})

export const SettingsComposition = Settings.makeComposition()

export const init = SettingsComposition.makeInit(() => ({
  model: { theme: 'System' },
}))

export const update = SettingsComposition.makeUpdate((model, message) =>
  Message.match(message, {
    UpdatedTheme: ({ theme }) => ({
      model: modifyFields(model, { theme: () => theme }),
    }),
  }),
)

export const view = SettingsComposition.makeView((model, h) =>
  h.p([], [model.theme]),
)

export const block = SettingsComposition.makeBlock({ init, update, view })
```

Keep one Definition and one named Composition. Use the name-only
`Block.define('Feature')` form only to establish shared early identity for a
generic API that later specializes several typed contracts with `.define(...)`.
That shared identity may be declared outside the specialization factory. A
graphless feature still has a Composition.

Author the primary view through the Composition. A completed Block's `makeView`
method is for an alternate embed view against the fixed graph. Plain helpers
that need the same child and Mount capabilities take an owner-specific builder:

```ts
export const ProfileComposition = Profile.makeComposition({
  childBindings: [SettingsBinding],
})
export type ProfileViewBuilder = Block.ViewBuilderFor<typeof ProfileComposition>
```

Declare that alias immediately after the Composition and export it only when a
different file uses it. A helper shared across owners uses the general
`HtmlBuilder<Message>` type.

## Bind a child

`bindChild` describes one relationship. Adding the Binding to
`childBindings` registers it. Binding construction alone does not route
Messages, collect lifecycle entries, or contribute handler recipes.

Choose the narrowest storage form that describes the parent Model:

| Parent storage                                                                       | Binding shape                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Exact Struct field containing `Child.Model` or `Option<Child.Model>`                 | `field`                                          |
| Exact array of child Models with a declared stable string or finite-number key field | `field` and string `key`                         |
| Exact array of closed wrappers around the child Model                                | `field`, string `key`, and distinct `childField` |
| Tagged, nested, opaque, union, open, or custom static storage                        | `read` and `write`                               |
| Custom keyed storage or enumeration                                                  | `readAll`, function `key`, `read`, and `writeAt` |

The generated wrapped-array writer replaces only the matched `childField`; it
preserves wrapper metadata, order, and unmatched references, and it never
inserts a missing item. The parent remains responsible for collection
membership.

Every field shorthand defaults placement to the field name. Static accessor
and general keyed Bindings default to the child Block ID. Placement identifies
one Binding in the composition graph; a keyed occurrence's key identifies one
runtime child under that placement. Override placement only to resolve a
sibling collision or preserve a deliberate stable graph identity.

Add `presentWhen` only when parent policy gates an entire direct child. A direct
`Option` field is absent while it is `None`; folds and operations do not create
it. Use `subscriptions.when` only for Stream activation.

Use `parentMessage` for the canonical unkeyed `{ message }` wrapper. The
Composition routes that wrapper automatically when child update has no context
parameters. Use `toParentMessage` for a custom wrapper. Keyed, custom, or
contextful delivery also needs `fromParentMessage`, whose `args` returns the
Binding's native fold arguments. Return `Option.none()` for a stale, absent, or
inactive occurrence. Use `fromParentMessage: false` only when the Composition
must never route that wrapper.

```ts
export const SettingsBinding = Profile.bindChild(Settings.block, {
  field: 'settings',
  parentMessage: Message.GotSettingsMessage,
  outMessage: { fold: foldSettingsOutMessage },
})

export const ProfileComposition = Profile.makeComposition({
  childBindings: [SettingsBinding],
})
```

The Composition update callback handles parent-owned Message variants.
Registered Bindings handle the wrappers they claim. A parent calls a declared
child operation through its named Binding method. For example, when a Dialog
Block declares `close` under `expose`, its parent calls
`DialogBinding.close(...)`; it does not construct a child Message to force that
transition. Render through
`h.block(SettingsBinding.embedView(...))`.

## OutMessages and sibling policy

Keep each local OutMessage fold as a standalone exhaustive matcher. Name every
variant, including the only variant in a union. If the matcher needs only the
OutMessage, bind the matcher directly. Keep a function or factory when it also
needs a key, the previous parent Model, another payload, or `FoldContext`.

For a generic child, pass its refined OutMessage type as the matcher's second
type argument. Let Command-producing Steps infer their requirements through
the owning `step` helper; an explicit requirement-free `Update.Step` can erase
them. Use `FoldContext.liftCommand` when parent policy returns a Command whose
result is a child Message.

Use `Update.StepWithOutMessage` when an explicitly typed fold derives a parent
OutMessage. `Update.Step` describes a result without one. Keep the keyed fold's
key parameter when policy uses it, and let the returned Step receive the parent
Model.

`outMessage.fold` applies parent policy locally. Add `outMessage.forward` only
when at least one variant continues through the current Block's OutMessage.
Match every variant and return `undefined` for named variants that stop. Local
handling still runs for a forwarded variant, and a derived parent OutMessage
takes precedence for that dispatch.

Policy may return parent Steps and call a registered sibling Binding operation.
Connected Binding Steps require their exact registered graph when applied to a
Model, so a typed call with the raw domain Model fails. Return or compose the
opaque connected result intact from `Composition.makeUpdate` or
`Composition.makeInit`; it exposes no `.model` or `.commands` before checked
execution and cannot narrow to a useful `{ model }` return. A Definition-owned
`step` preserves or wraps the connected value. A completed exposed operation is
a checked raw-Model executor with its own graph and returns a readable result.
Ordinary pure Steps remain callable. Keep reciprocal sibling policies in the
same parent assembly, defer the calls through policy callbacks, register every
captured Binding, and keep the synchronous chain finite. TypeScript may erase a
function result when assigning it to a method that returns `void`; outside the
exact graph, invoking that method only constructs and discards passive
configuration and executes no child work.

## Initialize children

Choose startup policy from the storage and child initializer:

| Situation                                                             | Policy                                                                                                                        |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Required exact direct field; child init is callable with no arguments | Omit `init`; Composition initializes it                                                                                       |
| Required exact direct field; child init needs arguments               | `init: { args }`                                                                                                              |
| Parent supplies a required direct field itself                        | `init: false`                                                                                                                 |
| Optional direct field                                                 | Omit `init` when the parent supplies the `Option`; use `init.args` when Composition should create `Some(child)` automatically |
| Exact keyed array                                                     | `init.occurrences` plus `init.toItem`                                                                                         |
| Accessor or custom storage                                            | Parent-owned unless initialized explicitly                                                                                    |

When an optional direct field omits `init`, the parent supplies its `Option`
value; that value may be `Some(child)` or `None`. `init.args` instead asks the
Composition to initialize the child and place it in `Some` automatically.

Add a `Startup` Schema to the parent Definition when several selectors share
startup input. `init.args` and `init.occurrences` then receive that decoded
value, and Composition init returns it as `startup`. The init plan's `model`
contains only parent-owned fields. Composition initializes children once in
`childBindings` order and applies `steps` afterward.

Parent Commands come first, retained child init Commands follow, and Step
Commands come last. Collection order does not order asynchronous completion.
Foldkit drops init Commands for occurrences absent or `presentWhen`-inactive in
the final Model. `subscriptions.when` gates Streams and does not gate init.

Use the exact registered `Binding.init({ key?, args, toParentModel,
commands? })` for custom storage, deliberate Command interleaving, or dynamic
creation. It returns a passive, noncallable recipe that retains the arguments,
mapping, key, and optional parent Commands. Return the recipe directly from the
owning Composition's `makeInit` or `makeUpdate`, or preserve it through the
parent's owned `step` producer. The Composition callbacks interpret it
directly; a completed exposed operation interprets a recipe preserved by its
Step. The recipe has no `.model` or `.commands` fields. The compiler checks the key, arguments,
complete parent Model, requirements, and exact Binding requirement. During
checked execution, runtime validation still checks the active composition frame,
child placement, and exactly one requested keyed occurrence. The available runtime
metadata cannot reconstruct TypeScript's required, optional, defaulted, and rest
parameter distinctions.

For a keyed array of wrappers, prefer `init.occurrences` and `init.toItem` when
startup creates the complete collection. Each occurrence supplies child init
args and the parent metadata needed by `toItem`, such as an ID or server
revision. Use `Binding.init` when an update adds one instance later, or when
startup needs custom interleaving or writes beyond that collection. Both paths
retain and lift the child initializer's Commands; never take only its Model.

`toItem` receives the planned `{ key, args }` and initialized child, not the full
parent Startup value. If wrapper metadata comes from Startup, make it available
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

| Value                               | Owns                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `FeatureComposition`                | Registered child placements and Mount capabilities; authors init, update, and the primary view         |
| `FeatureComposition.makeBlock(...)` | Local exposed operations, Subscriptions, ManagedResources, `EffectsLayer`, and declared `hostHandlers` |
| Feature `EffectsLayer`              | Handler recipes declared by that feature                                                               |
| Registered child Binding            | The selected completed child's registrations and handler graph                                         |
| Root `ApplicationLayer`             | Shared HTTP, storage, RPC, browser, and other environment Service providers                            |

Pass only local handler recipes to `FeatureComposition.makeBlock` or root
completion. Registered child Bindings contribute their selected recipes and
descendants automatically. Never merge a child's `EffectsLayer` again at its
parent or root.

Keep a small local `EffectsLayer` beside its definitions. Extract `layer.ts`
when the bundle is substantial or reused. Name a single provider `FooLayer`
only when it is public or independently reused. Import Effect's module as
`Layer` and reserve `ApplicationLayer` for the root's ordinary Service
providers.

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
List that definition under `hostHandlers` when completing the Block, then call
`provideHandlers` on that completed Block before binding it:

```ts
const blockWithHostContract = EditorComposition.makeBlock({
  init,
  update,
  view,
  hostHandlers: [SaveDocument],
})

const SaveDocumentLayer = SaveDocument.toLayer(saveDocumentHandler)

export const block = blockWithHostContract.provideHandlers(SaveDocumentLayer)
```

The host constructs `saveDocumentHandler` as the constructor Effect expected by
`SaveDocument.toLayer`. `provideHandlers` must satisfy exactly the contracts
declared in `hostHandlers`; it is a method on the completed Block, not on the
Definition or Composition.

To replace a feature's complete local recipe, call
`block.replaceEffectsLayer(recipe)` before binding; selected child recipes stay
attached. Ordinary execution tests keep real handler recipes and replace the
ordinary Service providers below them.

At the root:

```ts
const application = ApplicationComposition.makeApplication({
  init,
  update,
  view,
  EffectsLayer,
  container: document.getElementById('root'),
})

Runtime.run(application.provide(ApplicationLayer))
```

The completed application is still passive. `provide` supplies remaining
ordinary Services and returns another passive value. The Runtime builds the
graph once per start and releases its application scope when that run stops.

## Organize the graph once

A compact feature may keep all three stages together. In a split feature,
`definition.ts` owns the Definition. `composition.ts` owns Bindings, OutMessage
policies, the complete registrations, the named Composition, and any owner
ViewBuilder alias. When policy needs a `composition/` directory,
`composition/composition.ts` remains the single assembly point and its barrel
exports intended values explicitly. Composition does not import the primary
view, update matcher, or completed Block.

A split graphless feature may keep its empty Composition beside the Definition.
A split root always gives its Composition an assembly module, including when
the graph is empty. The root entry imports init, update, view, local
`EffectsLayer`, and `ApplicationLayer` from their owners, completes the
Application, and starts the Runtime. It does not maintain a second child or
handler inventory.

## Review invariants

Before finishing composition work, verify these properties:

- Every Block and Application has one Definition and one named Composition.
- Every selected Binding is registered exactly once and every embedded view
  uses a registered Binding.
- Every connected fold or exposed Step is applied to a Composition-provided
  Model, or returned from a Definition-owned Step for deferred application.
- Every explicit Binding init recipe is returned intact from `makeInit` or a
  Definition-owned Step; no caller projects result fields from it.
- Parent code uses Binding operations for parent-driven transitions and lets
  Composition route received child Messages.
- Optional absence and keyed removal cannot deliver stale callbacks or Command
  results into a replacement occurrence.
- OutMessage policy is exhaustive, forwards only intentionally, and retains
  context or inferred Command requirements when branches need them.
- Init declares who creates every child and returns only parent-owned fields.
- Each feature supplies only its local handler recipes. The root supplies
  ordinary Services once.
- Definition, Composition, completion, Binding, and `provide` remain passive;
  only the Runtime starts execution.
