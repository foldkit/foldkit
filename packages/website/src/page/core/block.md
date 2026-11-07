# Block

## Overview

A Block keeps a feature's Model, Messages, transitions, view, and lifecycle work together. The parent owns where each child Model lives and how child OutMessages affect the rest of the application. Foldkit still has one Application Model and pure updates.

The public Block contract describes what a parent can use. An implementation Layer constructs the child graph behind that contract. A Binding declares the relationship once, so update, init, and view can be authored independently of construction.

| Value                | Responsibility                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block declaration    | Establish Model, local Message, optional InMessage, InitArgs, OutMessage and Context contracts; expose typed helpers and the public child boundary. |
| Composition          | Register Bindings and Mounts; author graph-aware init, update, InMessage updates, and views.                                                        |
| Implementation Layer | Acquire child implementations and connect them to the authored init, update, view, and lifecycle declarations.                                      |
| Program              | Select the browser host, Flags, routing, Ports, and DevTools.                                                                                       |

For a complete application, the [Workspace example](/example-apps/workspace) shows retained editors, keyed Boards, Commands, Subscriptions, optimistic updates, and Story and Scene tests.

## When to Create a Block

Use a Block when part of the application owns a state machine rather than only markup. Common reasons are:

- A reusable component owns interaction state, keyboard behavior, focus, or accessibility wiring.
- A feature area owns enough Model and Message variants that its update loop should be separate.
- A feature owns Commands or lifecycle work that should travel with its state and update boundary.

If a section only renders parent state, use a view function. A card that receives a title and content does not need its own Block.

## Define a Block {#child-block}

### Establish the feature boundary

Call `Block.make` once at module scope. Put its unique key immediately above the declaration without a blank line, using the same Symbol description as the readable Block name. Supply that `key`, the Model and local Message Schemas, and an `InitArgs` tuple. Declare an OutMessage Schema when the child reports facts to its parent.

A compact key can remain private when it does not cross an emitted boundary. Split implementation modules commonly need to export the original key declaration because their inferred contracts carry that identity. When downstream declarations need to name it, the feature’s public barrel can use a type-only re-export of the original declaration. Verify real source and relocated declarations before removing an export.

`InitArgs` describes initializer arguments. `Context` describes read-only per-dispatch arguments. `ChildInitContext` describes the value that the parent's init passes to deferred child argument producers. These are separate inputs; none starts construction or lifecycle work.

Declare a rendered Block's `view.kind` and optional `view.Inputs`. Use Schema tuples and records for ordinary data. Use `Block.makeInputContract<...>()` for deliberately nonserialized inputs such as render callbacks. Declare ordinary handler Services under `effects.services` and any public operation channels on the Block.

::Snippet{name="blockDefinition" label="Block contracts and a local Command"}

A Command's generator constructor obtains its Services and returns its invocation function. Keep request state in the Model and changing request inputs in Command args. The Block constructor acquires the executable child graph; it does not replace the Command handler constructor.

### Define the Composition

Call `makeComposition({ bindings, mounts })` after defining the child Bindings and parent policies. Name the result `<Feature>Composition`. It fixes the feature's graph before init, update, and the primary view are authored. Both fields are optional and default to empty collections.

Keep the named `SettingsBlock` for its public contract, local authoring helpers, and completion. Create `SettingsComposition` from that Block, then author init, update, and views through the Composition. Its view builder exposes only registered children and Mounts. Its update plan handles local facts and routes child delivery through the selected implementations after acquisition.

Features without children or Mounts still call `makeComposition()`. Creating a Composition records capabilities. It does not build Layers, call init, or start child behavior.

### Construct the implementation

Complete the implementation with `FeatureBlock.makeLayer(Effect.gen(function* () { ... }))`. Yield the registered Bindings to acquire their child implementations. Return those connections as `children`, together with the complete init, update, and view builder expressions and the local handler and lifecycle declarations.

::Snippet{name="blockFeatureExports" label="Public contract and implementation Layer"}

Provide each child's implementation Layer through ordinary Layer composition. The static Composition uses `bindings`; the constructor returns the acquired `children`. Each relationship is declared once. Yielding it acquires that relationship's executable implementation.

If construction only collects those connections, acquire the registered inventory with `Composition.acquireChildren()`. It preserves the exact child tuple, Layer requirements, construction errors, registration order and scoped cleanup. Keep individual Binding yields when the constructor uses a child handle. Acquisition does not evaluate initialization arguments or create child Models.

::Snippet{name="blockAcquireChildren" label="Acquire the registered child graph"}

A complete builder expression can stay inline, move to a local value in the constructor, or move to another module. Its owning Block or Composition preserves contextual inference. Extracted transitions keep referring to stable Binding declarations, so they need no bag of constructor-local child instances.

Declaring the constructor is passive. The host builds its Layer under a Scope. Construction does not call init, evaluate `init.contextToArgs`, construct handler Layers, or start Commands, Subscriptions, ManagedResources, or Mounts. The acquired init, update, and operations are synchronous.

### Export the feature

Export the same `SettingsBlock` declaration and its implementation `layer` from the feature barrel. Parents author against `SettingsBlock`; construction supplies the chosen child Layers. Program and Server receive the root pair `{ block: ApplicationBlock, layer }`.

A feature can also deliberately export pure read-only queries and public domain contracts. For example, the [Job Application example](/example-apps/job-application) exposes `PersonalInfo.isComplete(model)` and `PersonalInfo.hasErrors(model)` so the child owns its validation rules and the parent can decide whether to advance. Keep substantial queries in a responsibility module such as `validation.ts` and expose them through the explicit barrel. Reading a query does not require a Message or a state transition.

Ordinary query exports are independent of implementation Layer selection. They should describe stable semantics of the public Model. Keep local authoring helpers, init, update, and private implementation details inside the feature.

The contract is bounded before the implementation exists. Ordinary applications need no private preparation function or assembly annotation. A package publishing generic factories may give its refined public contract a named interface, but that interface names the declared contract rather than the inferred implementation graph. See [public Block declarations](/patterns/project-organization#declaration-emission).

## Bind a Child {#embedding}

Choose the parent Block's Binding constructor from the child's storage. A required field uses `makeRequiredFieldBinding(ChildBlock, { field })`. The resulting Binding belongs to the parent because it describes parent decisions: where the child Model lives, how child Messages enter the parent, and how the parent responds to child OutMessages.

::Snippet{name="blockProfile" label="Binding a required child"}

For the common case, store the child in an exact required Struct field and pass that field name. Here, Profile stores Settings under `settings`. The Binding supplies child Message delivery for views, Command results, and lifecycle emissions. The parent does not declare or construct a wrapper.

Declare only local facts in the parent's `Message` Schema. Composition derives its complete dispatch Schema from those facts and the registered Bindings. It routes child Messages before the authored update handlers, so those handlers cover only local facts. The `Got*` prefix is reserved for generated delivery; a local Message with that prefix is rejected.

A child whose Message Schema is `Schema.Never` cannot emit a Message. Its Binding declares storage and lifecycle policy without a delivery policy:

::Snippet{name="blockMessageFreeChild" label="Binding a Message-free child"}

Every Binding constructor creates passive configuration. The example registers `SettingsBinding` in `ApplicationComposition.bindings` so the parent update and view can use it. The constructor yields that Binding to acquire the selected child implementation. The acquired graph routes child Messages, validates embedded views, collects handler recipes and lifecycle definitions, and assembles child startup through the same relationship. Declaring the Binding and Composition runs none of that work.

### Route child Messages {#fold-child}

Composition automatically routes the Messages of every registered child. The Binding runs the child's update, writes the next child Model, lifts returned Commands, and applies its OutMessage policy. The authored parent update handles its own local facts. Declare a `delivery.toUpdateContext` callback when the child update needs additional context, or `delivery.when` when incoming child delivery needs a parent condition.

::Snippet{name="blockFoldChild" label="Routing a bound child Message"}

### Receive parent requests and notifications {#inmessages}

Declare an ordinary optional `InMessage` Schema with `defineInMessageUnion` for transitions a parent can initiate. Keep local facts such as `SubmittedForm`, Command results, and OutMessages on `defineMessageUnion`. The two Schemas have distinct tags; InMessages do not join the local update record or generated child Message delivery.

This MessageComposer can receive a submit request, a clear request, or a changed draft:

::Snippet{name="blockInMessageDefinition" label="Declaring a composer's parent inputs"}

Author an exhaustive `Composition.makeInMessageUpdate` record alongside `makeUpdate`. Both records can reuse the same extracted Step. Here, a local form submission and a parent submit request share trimming and validation:

::Snippet{name="blockInMessageHandlers" label="Sharing a transition across local and parent inputs"}

Return `inMessageUpdate` from the constructor with init, update, and view:

::Snippet{name="blockInMessageImplementation" label="Completing a Block with parent input handling"}

`defineInMessageUnion` returns the same Schema, constructors, and exhaustive matcher as `defineMessageUnion`; it adds no brand. It rejects invalid names at the offending literal property, keeps that validation for an extracted literal case record, and repeats the check at runtime when JavaScript or type erasure hides the keys. Other Schema forms remain valid InMessage contracts subject to the Block's existing constructor and tag validation.

The Block generates Binding methods directly from its InMessage tags. `RequestedX` becomes `requestX`; `InformedOfX` becomes `informOfX`. The remaining suffix is preserved exactly. Other prefixes and empty suffixes are rejected:

| InMessage tag            | Binding method                   |
| ------------------------ | -------------------------------- |
| `RequestedSubmit`        | `requestSubmit()`                |
| `RequestedClear`         | `requestClear()`                 |
| `InformedOfDraftChanged` | `informOfDraftChanged({ text })` |

Each method takes the variant's constructor payload when it has fields. Keyed Bindings take the occurrence key first. The method invokes the matching `makeInMessageUpdate` handler through a connected parent Step; authors do not write a separate wrapper or `operations` mapping for that request. Pass the Step directly to a handler record or compose it in a parent transition:

::Snippet{name="blockInMessageParent" label="Calling generated request and inform methods"}

`inMessageOutputs` declares each input's public result bounds. Include an entry when that input can emit an OutMessage or needs additional `services` or `managedResources`. An omitted entry is silent and adds no public requirements. Commands returned from `inMessageUpdate` still produce local Messages, which enter update when the Runtime completes them.

Declare an `InMessageContext` tuple when `inMessageUpdate` needs read-only per-call values. Author the record with `Composition.makeInMessageUpdate.withContext`, whose factory receives those values. Generated Binding methods take the InMessage context after the payload. This context is separate from update's `Context`; `delivery.toUpdateContext` supplies only incoming child update context.

Receiving an InMessage is synchronous and pure. It returns the next Model, Commands, and optional OutMessage without enqueueing another Runtime Message. Binding storage, OutMessage policy, occurrence identity, and lifecycle ownership remain the same. Defining or acquiring an InMessage update does not create Model occurrences or start effects.

Use `Story.inMessage` and `Scene.inMessage` in Block-aware tests. The runner acquires the selected implementation before applying the cause; Command results still use the ordinary resolution steps. Supply required InMessage context through `{ block, layer, inMessageContext: [...] }`, independently of `updateContext`.

::Snippet{name="blockInMessageTesting" label="Testing a parent input through Story and Scene"}

An acquired Block also exposes `inMessageUpdate(model, inMessage, ...context)` and `inMessageUpdate(inMessage)(model, ...context)` for pure transition composition. Raw Story and Scene runners do not acquire an InMessage update, so they reject unresolved `inMessage` causes.

### Compose parent input handling

Keep an exhaustive `makeInMessageUpdate({ ... })` record as the default. For additional transitions, use its `cases`, `each`, `on`, `except`, and `compose` helpers with the same ordering and output rules as [composed updates](/core/update#composing-updates). These selectors use InMessage tags. The full record applies once at its position, and callbacks retain the original `before` Model across grouped bundles.

Here, the exhaustive input record applies the changed draft before a focused transition trims it. Submit and clear requests retain their existing behavior:

::Snippet{name="blockInMessageComposition" label="Composing parent input handling"}

A shared Model-only Step can serve both entry points. InMessage composition uses `InMessageContext`, does not route child Messages, and returns Commands producing ordinary local Messages. It does not merge the local Message and InMessage unions.

### Apply bound transitions

Generated input methods and explicit operation adapters produce connected parent Steps. Settings declares `InMessage.RequestedReset`, so Profile can apply its generated `requestReset` method:

::Snippet{name="blockProjectedSteps" label="Calling a bound public operation"}

These calls are pure. A Binding operation produces a connected parent Update.Step whose Model input requires the exact registered graph. A raw domain Model cannot satisfy that input. Return or compose the connected result intact from `makeUpdate` or startup processing; its public type exposes no `.model` or `.commands` before checked execution. A Block-owned `makeStep` may preserve or wrap a connected Step for later execution. The Composition consumes it while the graph is active and returns the readable next Model, optional Commands, and optional OutMessage. An acquired Block operation is also a checked executor: it accepts the raw Block Model and returns the readable result. Explicit operations retain their declared Command requirements and OutMessage bounds. Aggregate update utilities retain the union across local handlers. Calling a pure operation does not run effects returned by another branch. Ordinary internal Update.Steps remain directly callable. The Runtime executes returned Commands later.

Use a payload-mapping callback when the parent needs to derive different inputs. A wrapper that only renames the generated request adds no transition behavior.

### Adapt explicit operation arguments

The explicit `operations` path remains available for positional arguments, generic adapters, defaults, or mappings to existing local Messages. Put the local Message constructor directly under `operations` when the public arguments map directly to its payload. Completion creates the callable operation without constructing a startup Message. A constructor with payload fields takes one constructor payload object, with constructor defaults honored, followed by any update context. A constructor without payload fields takes no payload placeholder. These operations pass their Message through the child's update synchronously.

Explicit mappings enter the child's update. New parent requests and notifications belong in InMessage and enter `inMessageUpdate`. Both transition paths own their validation, Commands, and OutMessages. Keep actual UI facts separate when they have a different cause. For example, a parent request to close a menu should not impersonate a click on its close button. Do not expose a `reflect*` helper that bypasses those transitions to change child state silently.

Use a tuple producer under `operations` when the public inputs need mapping, refinement, defaults, or an exact context tuple. It returns `[Message, ...context]`; prefer an array literal when contextual typing from the Block preserves the tuple. Use `Tuple.make` only if extraction would otherwise widen the result and lose the required tuple positions. Message constructors and tuple producers complete through the same update path. Keep pure helpers for selectors and derived view inputs. Use standalone or Block-owned Steps for internal composition, and omit `operations` when the Block declares no named operations. See [Calling update as a Step](/core/update#calling-update-as-a-step) for internal curried update composition and the required-context adapter.

An operation must supply the child's required update context even when its selected handler does not read it. The `makeUpdate.withContext` factory runs before selecting the handler and can read that context while constructing the record. A tuple producer can supply a meaningful fixed context or derive it from the operation's inputs. `delivery.toUpdateContext` supplies context for incoming child Messages; it does not supply arguments to an explicitly called operation.

Binding operations retain the exact argument types, Command requirements, Binding requirement, and OutMessage behavior of the child operation.

:::Info{label="Completion inference"}
Author update through `Composition.makeUpdate`. The complete expression retains its contextual Model and per-Message typing inline in the constructor return, as a constructor-local value, or in an extracted module.
:::

### Initialize the child

The Binding also declares how its child joins the initial parent Model. A required direct child whose initializer takes no arguments needs no `init` property. The basic `SettingsBinding` omits it, so the acquired parent init calls the selected Settings implementation's initializer and supplies `model.settings` while Profile init returns only `displayName` and `previewTheme`.

Use `init: { contextToArgs }` when another child needs inputs, or `init: false` when the parent will supply that field itself. This separate Profile contains a ThemePicker whose initializer requires a Theme. The Binding selects the saved theme, while Profile owns the username:

::Snippet{name="blockFoldChildInit" label="Assembling an initial child Model"}

The parent init callback returns only parent-owned fields. Composition calls the selected child initializer, stores its Model, and retains its Commands. See [Init & Flags](/core/init-and-flags#child-initialization) for optional children, keyed occurrences, custom storage, Command batching, and initial Steps.

Block init cannot emit an OutMessage. Author it through the Block Composition, then return that init builder from `FeatureBlock.makeLayer`. An optional `boot` helper is an ordinary initial Step listed in the parent's init plan after the child Model exists; Foldkit has no special Runtime boot phase. When an existing request such as `RequestedRestore` or `RequestedOpen` already describes the transition, call its generated Binding method. The same method may run later from update. Do not create a separate startup-only Message when an existing InMessage already describes the request.

The Binding's selected `fold` policy can handle a fact from that initial Step against the complete parent Model. Parent init cannot forward an OutMessage, so a startup Step used there must finish with a plain update result.

### Embed the child view {#wiring-the-view}

`binding.embedView` supplies the canonical view, generated Message delivery, occurrence identity, and the Binding's Mount evidence. Pass its result to `h.block`:

::Snippet{name="blockParentView" label="Embedding a connected child view"}

`slotId` identifies one render position inside the current view boundary. Keep it stable. The parent still supplies the child Model explicitly, which keeps rendering a pure function of the parent Model.

For per-render data owned by the parent, define the child view with the owning `makeView.withInputs<ViewInputs>` helper and pass `viewInputs` through the `embedView` call.

::Snippet{name="blockChildViewInputs" label="Defining a view with inputs"}

::Snippet{name="blockParentViewInputs" label="Embedding a view with inputs"}

The Model owns persistent state. `viewInputs` carries render-only data and callbacks selected by the parent.

Let `makeView` infer the primary view's builder. For an extracted helper on the same rendering path, derive an owner-specific alias with `Block.ViewBuilderFor<typeof FeatureComposition>`. It retains the Composition's complete Message, Mount, and child embedding capabilities; `HtmlBuilder<LocalMessage>` does not describe that graph.

A shared helper that forwards Mount-bearing child Attributes accepts a typed caller-owned render callback. The callback uses the caller's inferred builder, preserving its registered Binding capability. See [Builder ownership](/core/view#builder-ownership) for the shared Dialog pattern.

The local `Message` alias describes the facts handled by authored update logic. A boundary such as `Runtime.CrashContext` also accepts private child delivery. Derive its dispatch type from `Block.ExecutableOf<typeof FeatureBlock>`; use the acquired implementation's `Message` Codec when decoding serialized complete history. DevTools replay uses values already retained in memory and does not run that Codec.

::Snippet{name="blockCompositionTypes" label="Composition-specific builder and dispatch types"}

## Handle Child Facts with OutMessages {#surfacing-facts}

A child reports facts to its parent through an OutMessage. A public operation carries a parent request down; an OutMessage carries a child fact up. For example, Profile may ask Settings to reset, while Settings reports that its theme changed. The parent Binding decides what that reported fact means at this boundary.

Every Binding for a Block with OutMessages must select an explicit policy with
`withOutMessagePolicy` on the storage-specific Binding. For a required-field
child, keep the ordinary case as one fluent declaration:
`ParentBlock.makeRequiredFieldBinding(ChildBlock, config).withOutMessagePolicy(policy)`.
The selected value is the full Binding to register and use.

- `fold` handles the fact in the current parent and returns a parent Step.
- `forward` translates selected facts into the current Block's own OutMessage.
- A Binding may do both. A derived OutMessage from the local fold takes precedence for that dispatch.

Build a parent-owned OutMessage fold with the parent Block and the child's
public contract:

::Snippet{name="blockOutMessagePolicy" label="Handling a child OutMessage"}

Keep a single-use exhaustive fold inline with its Binding. Extract a reused fold or a mapping that substantially obscures the relationship. For a complicated branch, first consider extracting its transition while keeping the tag mapping here. Explicit no-op cases record deliberate parent behavior; the child still performs its own update. Reciprocal policies may need an extracted fold to keep inference independent of the Binding declarations.

Keyed Bindings accept the same authored fold directly when the handlers do not
need the occurrence key. When they need it, return the fold from a callback:
`fold: key => makeOutMessageFold(ChildBlock, handlers)`. The Binding supplies the
OutMessage and its FoldContext; handlers close over the exact key type.

::Snippet{name="blockKeyedOutMessageFolds" label="Handling keyed child facts with and without the key"}

Both forms preserve exhaustive payload inference, Command requirements and
sibling Binding checks. Construction stays passive. A key-dependent callback
runs only when an existing occurrence emits an OutMessage, and its parent Step
receives the Model after the child write. Take FoldContext inside the variant
handler when using `modelBeforeUpdate` or its lifters. The explicit
`(key, outMessage, context) => step` form is also supported for adaptations that
need those inputs together.

For a required-field child, inline a one-way policy as
`ParentBlock.makeRequiredFieldBinding(ChildBlock, config).withOutMessagePolicy({ fold: ParentBlock.makeOutMessageFold(ChildBlock, handlers) })`.
The child supplies the exact OutMessage contract, while the parent
Block supplies the Model, Message, and OutMessage contracts. Name the fold
when reuse, keyed adaptation, or reciprocal staging benefits from a separate
value. Both inline and named folds pass the child contract explicitly and
retain Command requirements and sibling Binding registration evidence for
Composition to check. Name each child OutMessage variant directly in `handlers`;
a missing or extra variant fails type checking. Each handler returns the parent
Step for that fact without a repeated `Update.Step` annotation or refined
OutMessage type argument.

Inline `ParentBlock.makeOutMessageForward(handlers)` under the Binding's
`withOutMessagePolicy({ forward })` when selected facts continue through the
current Block's own OutMessage. Pass the child contract explicitly when the
callable forward is extracted. The helper is available only when the parent
Block declares an OutMessage Schema. Name every child variant; return a
declared parent OutMessage for variants that continue and `undefined` for named
variants that stop here. At least one handler must forward.

::Snippet{name="blockOutMessageForward" label="Forwarding selected child OutMessages"}

The selected constructor fixes storage, delivery, lifecycle, and child identity before policy
selection. `withOutMessagePolicy` selects one immutable policy for that same
child Binding. Register the selected Binding in the Composition. A missing
policy, a missing or extra handler, an undeclared forwarded OutMessage, or a
sibling operation absent from `bindings` fails type checking. Runtime checks
supplement those guarantees for erased JavaScript. Block declaration, Binding, policy,
and Composition construction remain passive: they do not build Layers, call
handlers, or start lifecycle work.

The parent configures integration policy in its child Binding. That policy executes during the pure child fold or operation. The flow is parent update → child fold or operation → parent OutMessage handling → parent result. Keep a substantial policy in a named parent fold beside that child's Binding, extracting both to `composition/<child>.ts` when the policy becomes substantial. A handler takes the exact `FoldContext` as its second argument only when it needs to lift a child Command or compare the transition with parent state from before the child update. A fold whose handlers omit that argument remains unary. `modelBeforeUpdate` is the previous parent Model. The Step returned by the handler still receives the parent Model after the next child Model has been written. When update or init also uses that parent Step, put it in the owning Block's `steps.ts` and keep the OutMessage mapping here. See [Shared Steps](/core/update#shared-steps).

## Complete the Application

Create the root's `ApplicationBlock` with its unique `key`, Model, Message, `InitArgs` tuple, and view contract. Author init, update, and the primary view through `ApplicationComposition`, then export `layer = ApplicationBlock.makeLayer(...)`. In `entry.ts`, pass `{ block: ApplicationBlock, layer }` and browser inputs to `Program.make` or `Program.makeElement`.

Root `services.ts` supplies the shared store required by the child handler:

::Snippet{name="blockApplicationServices" label="Application settings provider"}

The entry gives `{ block: ApplicationBlock, layer }` to `Program.make` and starts the Program:

::Snippet{name="blockApplicationCompletion" label="Starting the Application"}

The Application Composition carries the child graph. Its completion config supplies root-local handler recipes and lifecycle definitions. Registered child Blocks contribute their own handlers through that graph. `ApplicationLayer` supplies ordinary application Services such as storage or an HTTP client. It does not re-merge each feature's `EffectsLayer`.

`ApplicationBlock.makeLayer` checks the returned child connections and implementation. `Program.make` records the host configuration and `program.provide(ApplicationLayer)` records providers. The Runtime acquires the graph and builds the selected handlers when the Program starts. Missing handlers, incompatible child Bindings, unavailable Mount requirements, and an unhandled root OutMessage fail before a user interaction.

Server rendering uses the same root:

::Snippet{name="blockServerRender" label="Rendering the Application on the server"}

The server runs init and view. It does not construct browser handler Layers or start lifecycle work.

## Callback Dispatch Boundaries

A child view builds handlers for the child's Message union. A top-level callback in `viewInputs`, such as `toView`, runs in the parent's boundary. Handlers built by that callback reach the parent update directly. Foldkit preserves that boundary when the child invokes the callback.

Keep callbacks at the top level of `viewInputs`. View authoring rejects statically visible functions nested inside records, arrays, tuples, unions, or `Option` values because Foldkit cannot infer which boundary should own them. Generic views retain that check when their inputs become concrete. Runtime validation also checks dynamically typed inputs.

Ordinary `Date` values and Effect's `DateTime.Utc`, `DateTime.Zoned`, and `DateTime.TimeZone` values are data, including inside records, arrays, tuples, and `Option`. Their standard prototype and inspection-protocol methods do not count as application callbacks. An added callback field remains subject to the nested-callback check.

TypeScript cannot distinguish an own override of a standard protocol method from its prototype implementation; runtime validation rejects enumerable own function fields. An invalid input diagnostic can identify the nested field. Move an application callback to a top-level input rather than casting the inputs.

### Publish child attributes {#child-attributes}

A headless Block may supply behavior while its parent chooses the markup. The child builds attribute groups with `childAttributes` before passing them to `toView`. Each group retains the child's dispatcher and any Mount requirements.

::Snippet{name="blockChildAttributesPublish" label="Publishing child attributes"}

The parent spreads those groups onto its own elements. Child handlers still reach the child update through the Binding's generated delivery; parent handlers built alongside them reach the parent update.

::Snippet{name="blockChildAttributesConsume" label="Rendering child attributes"}

Block authors call `childAttributes` with raw `TaggedAttribute` entries; consumers spread the supplied groups into ordinary `Attribute` collections. Stateless render helpers such as Button already use the caller's builder and Message type, so they do not establish a child boundary or need this wrapper.

### Share parent renderers

Build shared renderers in the parent and pass them as top-level `viewInputs` callbacks. A renderer can embed a sibling Block through that sibling's Binding. Each embed then establishes its own child boundary.

Thread `h` through view functions and render callbacks. Do not store a builder in module state; its dispatch context belongs to the current render boundary.

## Connected Step Diagnostics

A connected Step needs the Composition that registered its Binding. A plain Model has the right data but cannot establish that registration. The compiler diagnostic names both repairs: return the connected result intact from that Composition's `makeUpdate`, or define a deferred parent Step with the Definition's `makeStep` and apply it there:

::Snippet{name="blockDeferredConnectedStep" label="Deferring a connected Step to its registered Composition"}

The Block helper preserves the Binding requirement; it does not register the Binding. Removing `SettingsBinding` from this Composition still makes completion fail. Do not widen the Step to an ordinary Model-returning function or extract `.model` from its opaque result.

If the compiler reports `Block operations may use only registered child bindings`, add the exact Binding used by the operation to that Composition's `bindings` array. A Binding imported into update, used by an init helper, or embedded in the view is not registered by that use. One omitted Binding can therefore produce errors in several files. Repair the graph in `composition.ts` before changing those consumers; constructing a second Binding does not register the original identity.

At completion, the compiler checks the primary view owner, handler coverage, and the init result separately. Author the primary view through the same Composition's `makeView`; use plain functions for extracted rendering helpers. Supply each local handler through `EffectsLayer`, using an attached `.layer` or a provider from its original definition's `toLayer`. An init plan must supply every parent-owned field with its declared type; registered initialization supplies only the fields its Bindings own. Changing a view cannot repair a missing handler or init field.

## Child Delivery Context

A Binding already knows the child Message and its captured occurrence. Use `delivery.toUpdateContext` only for additional arguments required by the child's update. Its callback receives the current parent Model; a keyed Binding also supplies the captured key. Return the exact context tuple, without repeating the child Message or key. Optional and defaulted parameters still need an explicit policy; return an empty tuple to use child defaults when that signature permits it.

Use `delivery.when` to ignore incoming child Messages under a parent-owned condition. A false result leaves the parent Model unchanged. This gate does not make the child absent, stop its lifecycle work, or gate an explicitly invoked Binding operation. Use `activeWhen` or a custom reader for whole-child presence, and `subscriptions.when` to gate only Streams.

`delivery.when` does not receive the child Message. When a policy must allow completion Messages while refusing user interaction, pass the current parent policy through `delivery.toUpdateContext` and apply it in the relevant child handlers. Leave completion handlers ungated so in-flight work can settle:

::Snippet{name="blockMessageAwareDelivery" label="Gating interaction through child update context"}

The parent supplies the policy when it binds the public Reader contract:

::Snippet{name="blockMessageAwareDeliveryBinding" label="Supplying the current interaction policy"}

The context is read for each routed child Message. It is not stored in the child Model, and changing it does not dispatch a Message. A direct child operation must still receive its context explicitly. Authorization for external data remains the server's responsibility.

## Optional Children

An exact `Option<ChildModel>` field declares an optional child without a manual accessor. When the field is `None`:

- connected folds leave the parent Model unchanged;
- that occurrence's Subscription Streams stop;
- its ManagedResource handles release;
- its mounted elements clean up.

When the child reappears, Foldkit creates a new occurrence with new lifecycle scopes. A Command already running for the old occurrence keeps application lifetime, but its result is discarded if that occurrence is no longer current. This preserves Command interruption semantics while preventing a stale result from updating a replacement child.

Use `activeWhen` with a direct field when parent policy controls the whole child's presence independently of storage. The predicate applies to folds, operations, Subscriptions, ManagedResources, and Mounts. A false result behaves like an absent Option field and never clears or replaces the stored child Model.

::Snippet{name="blockPresenceGate" label="Gating a child occurrence"}

Use explicit `read` and `write` for nested storage or custom child placement. For a child occupying one complete tagged parent variant, use the Schema-backed helper below. The accessor's `None` result already determines presence, so accessor Bindings do not also take `activeWhen`.

A Binding's `write` or `writeAt` places the next child Model into parent storage. Keep parent reactions to child transitions in its OutMessage policy. Do not compare old and new child state in a writer to generate announcements, trigger sibling changes, or maintain unrelated parent fields. Nested storage, keyed replacement, presence checks, and preservation of wrapper metadata remain legitimate custom writes. If a parent needs a child fact that is not exposed, add a truthful public OutMessage rather than using the writer as an event hook.

The recommended `foldkit/no-binding-write-coordination` lint rule detects direct-field readers paired with writers that also derive sibling fields from the next child Model. It follows proven Block imports and immutable local aliases. More complex accessors, mutations, and indirect dependencies remain review concerns; lint does not infer every writer's intent.

Resource cleanup owns work that requires a live resource handle. See [operations using a handle](/core/managed-resources#operations-using-a-handle) for coordinating that lifetime with a running Command.

Use `subscriptions.when` when only child Streams need additional activation policy while the child remains present:

::Snippet{name="blockSubscriptionGate" label="Gating a child Subscription"}

The gate controls Streams. It does not remove the child or disable its update.

### Retain state across navigation

Keep a child Model in parent storage when its state should survive navigation. The current Route determines whether its view is rendered. Keeping a keyed collection of editors lets navigation from Issue A to Issue B and back reuse both Models. Removing an occurrence is an explicit application decision, such as deleting an entity or evicting retained state.

A retained occurrence remains present even when its view is hidden. Its pending Command results can still enter update, and its Subscription Streams remain active unless their activation policy says otherwise. Use `subscriptions.when` for route-specific Streams. Use child Message-backed operations when application policy requires a child transition. State retention alone does not require additional navigation orchestration. A `delivery.when` gate that rejects all hidden-child Messages also rejects save completions; use such a gate only when that is the intended behavior.

### Whole tagged variants

Use `ParentBlock.makeVariantBinding(ChildBlock)` when a child Model is one complete member of the parent `Schema.Union`. Include the actual `ChildBlock.Model` Schema in that union. The child must have one required literal `_tag`; parent members need distinct tags and closed records.

For example, this child owns the editing state:

::Snippet{name="blockVariantChild" label="The profile editor contract"}

The parent stores either that complete child Model or its own submitted state:

::Snippet{name="blockVariantBinding" label="Binding a whole parent variant"}

The helper derives presence from the child's tag. Folds and operations leave other variants unchanged; they never create the child. A matching write replaces the whole active variant. Parent update owns switching variants and explicit initialization through the existing `Binding.init({ args, toParentModel })` API, including the child's Commands. Switching away and back creates a new occurrence; results from the old occurrence remain stale.

Optional configuration accepts `placement`, `delivery` and `subscriptions`. Delivery context still supplies the child's exact update arguments. Subscription gates control only Streams. Add OutMessage policy with the ordinary `.withOutMessagePolicy` call and register the selected Binding in the Composition.

Use general accessors for nested or wrapped variants, custom writers, or opaque Schemas. TypeScript checks the exact decoded member and its tag; runtime validation also requires the actual child Schema instance in the union. It cannot prove Schema object identity statically. Do not reconstruct a same-shaped member or mix the helper with field/accessor initialization options.

## Coordinate Sibling Blocks

A policy may return a parent Step that calls a registered sibling Binding operation. This supports parent-owned coordination in either direction: one child's OutMessage can initialize, update, or remove another child while preserving both boundaries. Keep reciprocal policies together in the same parent `composition.ts` or `composition/composition.ts`. Export and register the policy-complete `HomeBinding` and `RoomBinding`. Keep base Bindings internal when deferred reciprocal callbacks need them to break a dependency cycle. `makeComposition` validates the policy's captured output and confirms that every sibling Binding used by the policy is registered in `bindings`. Keep the chain synchronous and finite; one policy may invoke another Binding policy before the original update returns.

This parent opens the selected Room when Home reports `SelectedRoom`. When Room later reports `SavedRoom`, the parent marks that Room as saved in Home. The omitted child contracts provide both operations: `RoomBinding.requestOpen` returns a pure connected Step, while `HomeBinding.informOfRoomSaved` returns a connected Step with a persistence Command. Neither operation emits another sibling OutMessage:

::Snippet{name="blockSiblingCoordination" label="Coordinating sibling Blocks in both directions"}

When the decision depends on parent state from before the child update, take the inferred `FoldContext` as that variant handler's second parameter and read `modelBeforeUpdate`. Return the selected sibling Binding operation directly. The returned Step runs against the parent Model after the source child's next Model has been written, so the parent does not need to copy a snapshot into either child or add another Message stage.

::Snippet{name="blockParentAwareSiblingPolicy" label="Choosing a sibling operation from parent state"}

## Keyed Children {#fold-child-at}

For a collection that needs only occurrence identity and child state, declare `Schema.Array(ChildBlock.Instance)`. Each ready value contains a string `key` and the child's `model`. Bind the field with `key: 'key'` and `childField: 'model'`:

::Snippet{name="blockInstanceArray" label="Declaring a child Instance array" class="mb-4"}

`CountersBinding.create` returns a passive creation request. The owning `makeFieldsStep` accepts it in the declared Instance array. When the acquired graph executes that Step, Foldkit initializes the child, places its ready Instance, and retains every child init Command before continuing to the next Step. The parent still chooses membership, order, and keys. The Binding still owns delivery and OutMessage policy.

The Model's child array contains ready Instances only. A request cannot be read as a child Model or supplied as a ready Instance to `Model.make` or `modifyFields`. For prebuilt fixtures, use `CounterBlock.Instance.make` with an already constructed key and child Model. Decoding a ready snapshot does not rerun init. See [creating children in field Steps](/core/init-and-flags#creating-child-instances) for startup reuse, same-update operations, and creation limits.

Use the other storage forms below when identity belongs to the child Model, wrappers carry extra parent metadata, or the collection is optional or map-based. A standard Instance array does not require changing those representations.

When a parent field is an array of child Models and each child has its stable key in a direct field, pass both field names:

::Snippet{name="blockDirectCollection" label="Binding a direct child collection" class="mb-4"}

This shorthand requires a child Model Schema that exposes Struct fields. Use the general keyed form for union, suspended, or other Schema declarations whose fields are opaque, even when every decoded variant has the same key field.

When each array item wraps the child Model, add `childField`:

::Snippet{name="blockMultipleInstances" label="Binding a wrapped child collection" class="mb-4"}

This form requires an exact parent Struct whose `field` is a required `Schema.Array` of closed Struct wrapper records. `key` must name a required string or finite-number field on each wrapper. `childField` must name a different required field whose Schema has exactly the same decoded shape as the child Model. The child Model itself may be a primitive or union because the wrapper owns the key. Both keyed array shorthands default placement to the child Block ID; the key distinguishes instances within that Binding.

When Foldkit writes a child result, it replaces only `childField` in the matching wrapper. It preserves array order, wrapper metadata, and every unmatched wrapper reference. If the key has been removed, it leaves the array unchanged instead of inserting a wrapper.

An exact `Schema.Option` field can hold zero or one keyed wrapper with the same `field`, `key`, and `childField` shorthand:

::Snippet{name="blockOptionalKeyedInstance" label="Binding an optional keyed child instance"}

The Option must be required on the parent Struct, and its value must be one closed Struct wrapper. The key and child fields follow the same rules as wrapped arrays. `None` means the occurrence is absent. A fold or operation replaces only the child Model when the stored key matches, preserves the wrapper's other fields, and never creates a missing occurrence. A different key leaves the exact parent Model unchanged. The Binding defaults placement to the child Block ID.

The parent owns optional presence. For a wrapper containing only its key and child fields, `initAndSet` from `foldkit/binding` derives the storage writer. Keep `MaybeRoomInstanceBinding.init({ key, args, toParentModel })` when creating additional parent-owned wrapper metadata. Both retain child init Commands. Automatic `init.instances` applies only to keyed arrays and is rejected for Option storage. See [dynamic storage helpers](/core/init-and-flags#dynamic-storage-helpers).

Use the general keyed form when the parent or wrapper Schema is opaque, wrappers are a union or use open/index-signature storage such as `Schema.StructWithRest`, a zero-or-one occurrence does not use the exact Option wrapper shape above, or writing a child requires other parent changes. `readAll` enumerates the items, `key` selects stable identity, `read` selects the child Model, and `writeAt` stores its next value. For a Message-bearing child, supply `keySchema` so the complete Message Schema can validate and serialize the selected key. Omit it for a Message-free child because that relationship has no delivery envelope. Field shorthands derive the key Schema from their declared key field.

Each active key gets independent Subscription, ManagedResource, and Mount scopes. `fold`, operations, `init`, and `embedView` take the key first. The key must be a stable string or finite number and must be unique in the current collection.

Removing a key synchronously makes its dispatchers stale and starts lifecycle cleanup. Reusing the same key later creates a new occurrence; results and callbacks captured by the earlier occurrence cannot update it.

Keyed Bindings do not reconcile the collection itself. Application update remains responsible for adding, removing, and ordering items in the parent Model. An explicit `Binding.init({ key, args, toParentModel })` must place exactly one initialized occurrence under the requested key. A child fold or operation cannot change that key. In the wrapped array form, the wrapper key stays fixed while child folds and operations replace only the child field. The parent changes occurrence identity by removing one item and adding another under its own update logic.

A keyed Binding can also represent one optional child whose domain identity changes. Prefer the exact Option wrapper shorthand above when the Schema has that shape. Use general keyed accessors for every other storage representation.

For example, in [Typing Terminal](/example-apps/typing-terminal), the Room Binding captures `roomId` as the generated `GotRoomMessage` envelope's key for views, Command results, and Subscription emissions. Navigating to another room replaces the keyed occurrence and initializes a fresh Room Model. A delayed result keeps its original room ID; the parent does not infer its origin from the current Route. Local child Messages such as `ChangedUserText` need no additional room ID.

Discarding a Command result does not undo its external writes. Scope persistent data by the same domain ID when a completed write from one occurrence must not overwrite another occurrence's data.

## Reading Parent State

The child Model contains state the child owns. Choose how parent-owned data crosses the boundary by what the child needs to do with it:

| Child needs                                                                       | Use                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Read current parent data while rendering                                          | View inputs                                            |
| Read current parent data while handling a Message                                 | Update context, supplied by `delivery.toUpdateContext` |
| React to an external event by changing state or producing Commands or OutMessages | An `informOf*` operation                               |
| Keep an independent value or historical editing baseline                          | The child Model                                        |

View inputs and update context supply values when the view or update runs. Changing those values does not itself dispatch a child Message. Call an `informOf*` operation when an external change requires a child transition; avoid copying parent data into the child merely to make it available.

The basic Settings Block needs only its Model and Message. When a different child truly needs parent state for each transition, declare that context in the child's update signature and supply it through the Binding's Message route. This separate AccountSettings Block records which current user changed the theme:

::Snippet{name="blockParentStateInUpdate" label="Parent context in child update" class="mb-4"}

Pass render-only values through `viewInputs`:

::Snippet{name="blockParentStateInView" label="Parent state through view inputs" class="mb-4"}

An editor may retain the original editable fields and revision for an unsaved draft while receiving current comments as view inputs. A changed field revision may require an `informOf*` operation to refresh a clean form or flag an editing conflict. A new comment can appear through view inputs without changing that baseline.

## Inform a Child about External State {#informing-external-state}

When an external fact requires a child transition, expose an `informOf*` operation that produces an `InformedOf*` Message and call it through the registered Binding. For example, a URL change may reset a child-owned selection or invalidate work. Values needed only for a current read belong in view inputs or update context.

::Snippet{name="blockInformExternalState" label="Informing a child about URL state"}

The child update handles the child-local fact and may return only `{ model }`. It does not echo an OutMessage to the parent that just supplied the fact. Keeping the notification in update centralizes the child invariant and shares transition behavior with every other cause of the same Model change. The same path remains valid when the transition later gains Commands. Pure selectors and derived view inputs remain ordinary helpers because they do not change the child Model. When a child reports a change through an OutMessage, update the parent-owned data in its policy. Notify that same child again only if it needs another transition; an acknowledgement that repeats work it already performed adds unnecessary synchronization.

## Customize a Block {#customizing-a-block}

Choose the approach that matches what changes:

| Need                                                                            | Supported choice                                                                                                                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Refine a Model or Message contract, or accept stable construction configuration | Return a passive Block contract backed by a construction Layer. Create one module-level `Block.makeNamespace` when the results share the same feature identity. |
| Select different markup at one embedding site                                   | Author an alternate view with the child Composition’s `makeView` or `makeView.withInputs`, then pass it as `view` to `ChildBinding.embedView`.                  |
| Supply parent-owned render-only values                                          | Declare `viewInputs` and pass them through `ChildBinding.embedView`.                                                                                            |
| Let the parent own the elements while the child owns their behavior             | Publish checked attribute groups with `childAttributes`.                                                                                                        |
| Select another implementation of attached handlers                              | Provide the real implementation’s Service dependencies. Use `provideHandlers` for contracts deliberately left to the host.                                      |
| Add state, Messages, public operations, or coordination policy                  | Create a wrapper Block, bind the original Block as its child, and express the new policy through operations and OutMessages.                                    |

An alternate view uses the child's fixed Model and Message contracts and its owning Composition's child Binding and Mount graph. The parent selects it for one render position without changing the Block's primary view:

::Snippet{name="blockCustomizationAlternateView" label="Selecting an alternate embedded view"}

The public Block contract has no general `withView`, `rename`, or `mapUpdate` transform. Use a factory for contract-level variation and a wrapper Block when the adaptation changes behavior or ownership. The sections below show handler selection and generic factories in detail; [view inputs](#wiring-the-view) and [child attributes](#child-attributes) cover the two markup boundaries.

## Select a Handler Recipe {#select-a-local-handler-recipe}

Provide ordinary test Services beneath the real implementation Layer when testing handler behavior. This exercises the production request, decoding, error handling, and Message mapping.

::Snippet{name="blockEffectsLayerSelection" label="Provide implementation dependencies"}

Construction Layers select the Block implementation and compose construction dependencies. The implementation's local `EffectsLayer` supplies its Command, Subscription, Mount, and ManagedResource handlers. Ordinary request Services remain in those handler constructors.

A constructor can deliberately list original handler definitions under `hostHandlers`. Apply `layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))` to select providers made through those definitions' `toLayer` methods before passing the Layer to a Program, Story, Scene, or Server. The providers must cover the exact original handlers and fit the Block's declared Service and constructor-error bounds.

Handler selection is passive. Pure Stories acquire the graph without building
handler Layers. For an implementation with attached handlers, supply ordinary
test Services rather than replacing an entire HTTP or storage workflow.

## Generic Blocks

An advanced library factory can specialize a public Block contract with a Schema while sharing one identity and implementation Layer. This example uses Foldkit’s internal library-authoring entry point to declare each specialization and resolve its checked implementation through a shared family provider. That mechanism supports generic component libraries; ordinary application Blocks use `Block.make(id, contracts)` and `makeLayer` directly.

::Snippet{name="blockGenericFactory" label="Schema-refined Block factory"}

A parent uses the factory's contract and provides its shared implementation Layer:

::Snippet{name="blockGenericConsumer" label="Binding a specialized Block"}

Keep the shared identity and recipe at module scope. Factory calls may refine Model, Message, OutMessage, view inputs, and public operation payloads. They must not manufacture new effect identities for the same reusable component.

Library conveniences supplied through the resolver's `members` record cannot replace reserved Block members. `Instance` names the ready occurrence Schema and is reserved alongside the other contract fields. Both TypeScript and runtime validation reject a convenience with that name. Rename an existing conflicting convenience in the factory and its callers.

## Lifetimes

Composition preserves the owner of each effect lifetime. Startup assembles the initial Model and Commands once. It does not define another handler or service lifetime.

| Lifetime                    | Owner                                            |
| --------------------------- | ------------------------------------------------ |
| One application start       | Handler constructors and ordinary Service Layers |
| One Command invocation      | The returned Command handler                     |
| One active Block occurrence | Subscription Streams and ManagedResource handles |
| One mounted element         | Mount acquisition and cleanup                    |

Connecting a Block does not build a Layer. The Runtime builds the selected handler graph once, calls each Command handler when that Command is returned, and starts or stops occurrence work as the Model changes. Effect's [Effect type](https://effect.website/docs/v4/getting-started/the-effect-type) explains the same description-before-execution boundary, while [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) explains how Layers construct Services and their dependencies.

## Never Bypass the Child's Update {#never-bypass-the-update}

The parent stores the child Model but does not own its transitions. Do not reach into the child Model with `modifyFields`.

::Snippet{name="blockDirectModifyFieldsAntipattern" label="❌ Resetting child state directly"}

Declare a named operation under `operations` and call it through the Binding:

::Snippet{name="blockDelegateViaHelper" label="✅ Resetting child state through a connected Step"}

This preserves invariants, Commands, OutMessages, effect requirements, and the child's freedom to change its Model shape.

## Boundary Identity and Model Identity {#boundary-id-and-model-identity}

A Block declaration identifies a reusable feature. A Binding's placement identifies that one Binding in its parent's composition graph. `slotId` identifies one render position, and a keyed Binding's key identifies one dynamic occurrence under the Binding. These values serve different jobs and should all remain stable.

Register each repeated Binding once in the parent's Composition. This Chat parent connects two distinct Composer fields through two Bindings:

::Snippet{name="blockRegisterChildren" label="Registering repeated child Bindings"}

An unkeyed direct field defaults placement to `field`, including an optional field. Record and HashMap Bindings created by their respective constructors also default to `field`. Accessor Bindings and keyed array or Option Bindings default to the child Block ID. A keyed Binding's key distinguishes instances under that one placement. An explicit `placement` overrides either default. A direct `Option` field keeps the same placement whether it contains `Some` or `None`.

Set `placement` only when a default would collide with a sibling Binding or when the graph deliberately needs another stable identity. For example, two accessor Bindings of the same Composer Block both default to `Composer`, so the second needs another placement:

::Snippet{name="blockStaticPlacements" label="Resolving an accessor placement collision"}

The Binding may read a direct Model field or custom storage. Direct unkeyed storage supplies the placement default described above; a child's domain ID does not. Choose an explicit placement when the graph needs a stable identity different from that default. Foldkit validates direct storage from the decoded Schema shape. Reuse the same Schema instance when the child Model uses an opaque declaration, or use explicit `read` and `write` for custom storage.

## Debugging in DevTools

Composition derives readable `Got<FormattedPlacement>Message` tags. It capitalizes placement segments separated by hyphens, underscores, or spaces and preserves capitals inside each segment. Duplicate sibling placements and names that format to the same tag are rejected.

The envelope records placement, the captured occurrence generation, the child Message, and a key for keyed delivery. The Runtime captures that origin when a view, Command, or lifecycle source emits. Removing and recreating an occurrence does not let its old results update the replacement.

Use the acquired implementation's `Message` Codec to decode, serialize, or inspect complete dispatch history. `FeatureBlock.Message` remains the public local union; the private implementation graph determines generated delivery. The acquired Codec retains local constructors, while generated wrappers have no public constructors. Effect names use the derived composition path, so repeated placements and keys remain distinguishable while local definitions keep short names.

Decoding checks the envelope's structure, placement, and key Schema. It does not establish that its occurrence is still current. Before queueing externally supplied live Messages, the Runtime checks the complete placement, key, and generation chain against the active graph. History replays previously accepted Messages; pure update, Story, and Scene replay do not repeat live admission. A Message that decodes for replay is not necessarily valid for live delivery.

Generations belong to one Program runtime. They are not portable occurrence IDs or authentication tokens: a generated child envelope from another runtime can pass decoding and live admission when its placement, key, and generation happen to match. Use these envelopes for that runtime's delivery and history, not as a cross-runtime live-dispatch protocol. Replication, persisted intent, Ports, and agent integrations need an application-owned protocol. Decode its inputs into local parent Messages, then call registered Binding operations from the parent's update.

## API

### Block.make

`Block.make(id, { key, Model, Message, InitArgs, ... })` declares the public contract and provides typed effect, Step, lifecycle, and child Binding authoring methods. `id` is a nonempty segment without `/` or `::`. Name the result `<Id>Block`, such as `SettingsBlock` for the ID `Settings`. Keep the factory and its unique Symbol key at module scope. That same value exposes the public contract and typed authoring helpers; its Composition authors graph-aware init, update, and views.

When related contracts share owned effect definitions, `Block.makeNamespace(id)` supplies their identity and primitive helpers. Name that value `<Id>Namespace` and pass it to `Block.make(FeatureNamespace, contracts)`. Both calls are passive configuration. Generic libraries with a shared implementation provider use the advanced mechanism described under [Generic Blocks](#generic-blocks).

### FeatureBlock.makeComposition

`FeatureBlock.makeComposition({ bindings?, mounts? })` checks the composition graph and returns `FeatureComposition`. Omitted child Bindings and Mounts default to empty collections without granting their capabilities.

### FeatureBlock.makeLayer

`FeatureBlock.makeLayer(constructor)` checks the constructor's returned init, update, view, local lifecycle declarations, handler recipe, and acquired `children` against the Block declaration and Composition. Missing, duplicate, incompatible, or unregistered child connections are rejected. A leaf returns `children: []`.

The returned ordinary Layer is passive. Compose child implementation providers with `.pipe(Layer.provide(Child.layer))`. Program and Server receive `{ block: FeatureBlock, layer }` and acquire the graph under their lifetime. Scoped Story and Scene runners accept that same pair.

### ChildBlock.Instance

`ChildBlock.Instance` is the ready Schema for `{ key: string, model: ChildModel }`. Use `Schema.Array(ChildBlock.Instance)` for a required top-level collection with standard occurrence storage. The Schema retains the exact child contract's ownership. Its `make` constructor creates a ready value from an existing child Model; it does not call child init or produce its Commands. Schema decoding likewise restores ready data without initialization.

### Handler requirement bounds

The public `effects` contract describes runtime handler capabilities. The implementation chooses the corresponding handlers in its local `EffectsLayer`.

| Contract field             | What it bounds                                              |
| -------------------------- | ----------------------------------------------------------- |
| `effects.services`         | Ordinary Services required while building the handler Layer |
| `effects.managedResources` | ManagedResource handle requirements                         |
| `effects.Error`            | Failures while building the handler Layer                   |

Graph-constructor requirements and errors are inferred separately from the Effect passed to `makeLayer`. A Command invocation's ordinary failures still become Messages. Use `Block.makeEffectsContract<E, R>()` as the type-based alternative for generic handler-Layer errors and ordinary Service bounds. Extra ManagedResource requirements on an explicit operation or `inMessageOutputs` use the same `managedResources` spelling.

## Serializable Model and Message Codecs

Foldkit serializes a Block's Model and Messages at synchronous host boundaries. The Model Codec, local Message Codec, and complete Message Codec must encode and decode without Effect Services. Delete the `codec` config when migrating; `codec.decoding` and `codec.encoding` have no replacement aliases.

The complete Message Codec contains generated child delivery envelopes. A child Message transformation therefore propagates through every parent that registers that child. Foldkit checks the complete graph instead of trusting the parent's local Message alone.

A synchronous transformation may still use `SchemaTransformation.transformEffect` with `Effect.succeed`. Standard JSON Codecs for values such as `Option` and `Date` are supported too. An Effect requirement of `never` proves that no Service is needed; it does not prove the Effect completes synchronously. A transformation that suspends on a Promise is rejected when Foldkit actually serializes or deserializes a value. Block declaration, Composition, and Layer construction remain passive and do not run the Codec against fabricated values.

Generic factories carry the encoded type and bind both Service channels to `never` with `Schema.Codec<Value, Encoded, never, never>`. A decoded-only `Schema.Schema<Value>` leaves those Service requirements unknown.

This child trims a submitted label through a synchronous transformation:

::Snippet{name="blockCodecChild" label="Child Messages with a synchronous transformation"}

The parent registers the child without repeating or widening its Codec. Its acquired executable receives the complete Message Codec, including the generated child envelope:

::Snippet{name="blockCodecParent" label="Complete Message Codec from the registered graph"}

The restriction applies to Foldkit-managed Model and Message serialization. A Command or another effectful API can retain an effectful boundary Codec and supply its requirements through the Effect that runs it. Any Message emitted back into update must still belong to the owning Block's service-free local Message Codec.

## Binding constructors

Choose a constructor from the parent Model's storage. Each method receives the child Block's public contract and checks the selected relationship against both Schemas.

| Parent storage                              | Constructor                     | Required configuration                                                                |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| One child Model field                       | `makeRequiredFieldBinding`      | `field`                                                                               |
| One `Option<ChildModel>` field              | `makeOptionalFieldBinding`      | `field`                                                                               |
| One closed keyed Option wrapper             | `makeOptionalKeyedFieldBinding` | `field`, `key`, `childField`                                                          |
| An array of child Models                    | `makeKeyedArrayBinding`         | `field`, `key`                                                                        |
| An array of closed wrappers                 | `makeKeyedArrayBinding`         | `field`, `key`, `childField`                                                          |
| A Record of children or closed wrappers     | `makeRecordBinding`             | `field`, optional `childField`                                                        |
| A HashMap of children or closed wrappers    | `makeHashMapBinding`            | `field`, optional `childField`                                                        |
| Custom unkeyed storage                      | `makeCustomBinding`             | `read`, `write`                                                                       |
| Custom keyed storage                        | `makeCustomKeyedBinding`        | `readAll`, function `key`, `read`, `writeAt`; `keySchema` for a Message-bearing child |
| One complete tagged child member of a union | `makeVariantBinding`            | Optional placement, delivery and Subscription policies                                |

All fields in these adapters are required Schema fields. Optional child storage means a required field whose value is an `Option`, not an optional object property. A required child field can retain its Model while `activeWhen` is false. Both direct-field constructors support that predicate; it deactivates the whole occurrence without changing storage. Keyed, map and variant constructors do not accept it. A custom reader expresses absence through `None`.

Generated delivery carries the exact child Message Schema and occurrence identity. `delivery.when` gates incoming Messages; `delivery.toUpdateContext` derives the child's dispatch arguments. Keyed callbacks also receive the occurrence key. `subscriptions.when` gates only Streams. A Message-free child needs no delivery policy.

A child with OutMessages requires `.withOutMessagePolicy({ fold?, forward? })`. Register and use that policy-complete Binding. Name field-backed Bindings after their Model field: `activeMemberListbox` becomes `ActiveMemberListboxBinding`, and `issueDetails` becomes `IssueDetailsBinding`. Preserve optional prefixes, plurals and control roles. Include a nested role when a wrapper container would hide it, such as `EntriesAnimationBinding` for `entries[].animation`. Custom and whole-variant storage use a meaningful relationship name. Keep a necessary `Base<Field>Binding` internal when a self-referential or reciprocal policy needs its operations.

### Record and HashMap fields {#keyed-map-fields}

Call `ParentBlock.makeRecordBinding(ChildBlock, { field })` for a required `Schema.Record(Key, ChildBlock.Model)` field, or `ParentBlock.makeHashMapBinding(ChildBlock, { field })` for a required `Schema.HashMap(Key, ChildBlock.Model)` field. The parent Schema supplies the exact key contract. The property or map key identifies the occurrence; the child Model need not repeat it. Add `childField` for a closed parent-owned wrapper around each child Model.

A split feature can export the needed destructured constructor from its `block.ts` and import it from that owning module. Extraction preserves the parent contracts and contextual inference.

The Entry implementation owns its rename transition:

::Snippet{name="blockKeyedMapChild" label="The map's child contract"}

The parent stores exact child Models in a Record and wrapped child Models in a HashMap:

::Snippet{name="blockKeyedMapFields" label="Schema-backed map Bindings"}

Both constructors default placement to the parent field. Override `placement` when two Bindings select different child fields in the same wrapper collection. Placement distinguishes those relationships; each stored key identifies an occurrence within one relationship.

Record keys decode to strings. Lookup uses own properties, and enumeration follows JavaScript's own enumerable string-key order. HashMap keys decode to strings or numbers; actual numeric occurrence keys must be finite. HashMap iteration does not establish display order. Keep a separate ordered list of IDs when the application needs one.

Ordinary folds and operations replace only existing matching entries. Wrapped writes preserve parent metadata; missing entries preserve the parent Model. Parents own membership, and removing a key ends that occurrence's lifecycle. For direct child values, `initAndInsert` from `foldkit/binding` inserts an absent key and rejects an occupied one. `makeInitIfMissingStep(Binding, { key, args })` retains existing children. Its producer form selects `Option.some({ key, args })` or `Option.none()` from the current Step Model, evaluated once during checked execution. Both forms preserve Model identity and emit no Commands when selection is `None` or the key exists. A missing selected key initializes the child and retains its init Commands. Every branch requires the original Binding registration.

Wrapped maps, custom metadata and parent Commands use explicit `Binding.init({ key, args, toParentModel })`. Use custom keyed accessors for custom writers, enumeration, or composite storage keys with a separate primitive occurrence identity. A fresh object is not a structural HashMap key merely because a Struct Schema describes it.

### Focused Step Producers

Use `makeFieldsStep`, `makeCommandsStep`, and `makeOutMessageStep` when a transition has one responsibility. Each takes a producer callback, evaluated when the Step or handler is applied. An ordinary producer receives the current Model and, for a Message-dependent handler, its exact Message. Use `.fromMessage` when only the Message payload is needed, or `() => value` for a fixed producer.

Pass the resulting compatible Step or Model-first handler directly to the update record:

::Snippet{name="blockMessageStepProducers" label="Composing Message-aware Steps"}

All three helpers support `.fromMessage`. Payload-only producers receive the complete exact Message variant, and the returned handler still receives `(model, message)`. When extracting a Message-dependent producer outside a contextually typed record, give its parameter a named variant alias such as `UpdatedTitle`, declared beside the `Message` union. Compatible function references remain callbacks. When constructing a different Message or OutMessage, map its payload explicitly instead of forwarding the incoming `_tag` through a constructor reference.

`FeatureBlock.makeFieldsStep(producer)` applies the produced field transformers. A zero-argument or Model-only producer creates a reusable unary Step. Omit its Model parameter when the transformers need no other field.

Ordinary field changes produce Model-only results. Writing `Binding.create` requests to the owning `ChildBlock.Instance` array produces an opaque connected recipe that retains child init Commands and exact graph requirements. Return or compose that recipe intact through the registered Composition. Checked execution resolves the requests before subsequent Steps receive the Model.

An empty field-transform record returns the identical incoming Model. This lets a guarded field Step decline an edit without constructing or immediately invoking another Step.

`FieldTransforms<Model>` from `foldkit/struct` is available for helpers whose argument is a field-update record. It follows ordinary TypeScript structural typing and does not enforce exact key sets or Model-variant relationships by itself.

When a local helper gates a Model transformation, accept a Model-to-Model callback and keep `modifyFields` at the call site. This keeps its field validation at the supplied record without duplicating that machinery in the policy helper.

::Snippet{name="blockGuardedModelUpdates" label="Guarded Model transformations"}

`FeatureBlock.makeCommandsStep(model => commands)` authors a Model-preserving Step that only produces Commands. Its callback receives the contextually typed current Model when the Step is applied. Constructing the Step does not call it. The Step returns the same Model object and retains result Message checks, Service requirements, and Binding registration evidence.

This notification Step reads the delay from the Model each time it is applied:

::Snippet{name="blockCommandsStep" label="Producing Commands from the current Model"}

When combined after another Step, the callback receives the Model produced by that preceding Step. Use `FeatureBlock.makeCommandsStep(() => [FocusField()])` when the Commands do not need the Model. Creating the Step only stores the callback; applying it produces Commands without executing their Effects. The Runtime executes those Commands independently.

`FeatureBlock.makeOutMessageStep(producer)` emits one declared OutMessage and no Commands. Its callback may read the Model or Message, and it preserves the identical incoming Model object. It is available only when the Block declares an OutMessage Schema and preserves the exact variant or refined payload. Use `Update.withOutMessage` when attaching an OutMessage to an existing plain result or when the value may be `undefined`.

::Snippet{name="blockOutMessageStep" label="Reporting a fixed OutMessage"}

`Update.combineSteps` rejects OutMessage-producing Steps, including this helper. Attach an OutMessage to the combined plain result with `Update.withOutMessage`.

`FeatureBlock.makeNoopStep()` preserves the exact incoming Model with no Commands or OutMessage. In a child OutMessage fold, pass its factory point-free as the named variant's handler: `Closed: FeatureBlock.makeNoopStep`. A handler-record value calls the factory: `CompletedSave: FeatureBlock.makeNoopStep()`.

### FeatureBlock.makeStep

`FeatureBlock.makeStep(producer)` handles reusable mixed transitions, additional producer arguments, connected Binding operations, initialization, delegated results, and other composed results. It preserves or wraps a connected value until a Composition interprets it under the registered graph, and infers the operation's arguments, result Messages, Command requirements, and Binding requirements. Cohesive mixed handlers can return `{ model, commands, outMessage }` directly. Declare parent inputs through InMessage and inMessageUpdate; retain `operations` for explicit adapters.

An inline handler gets its exact Message from the Composition. An extracted Message-dependent callback needs that contract at its parameter when no handler record supplies it. Annotate the variant; let `makeStep` infer the output, Command requirements and connected graph evidence. The same convention applies to `makeStep.fromMessage`:

::Snippet{name="updateExtractedMessage" label="Exact Message contracts for extracted Steps"}

Do not pass a single Message type argument to these helpers. TypeScript cannot infer the remaining output parameters through the tested one-call encodings; broad defaults lose the exact result channels. The parameter annotation keeps the current inference intact.

Use `makeStep.fromMessage(producer)` when only the Message is needed to select or construct a Step, compose Steps, or create an initialization recipe. An inline `makeUpdate` entry infers the exact Message variant for both the ordinary Model-aware form and `.fromMessage`, including `.withContext` records. The returned handler receives `(model, message)`; applying it evaluates the producer and passes the incoming Model to a returned Step. Construction is passive. An extracted producer needs a precise Message variant annotation, as with the focused helpers. Dispatch context stays in `makeUpdate.withContext`, where the producer can close over it.

Choose the helper when authoring a Step. Inside a local `makeStep` callback, return results directly, including `{ model }` for an unchanged Model. Constructing and immediately applying another local Step merely to express a branch adds an unnecessary layer:

::Snippet{name="blockStepBranchesBefore" label="❌ Constructing Steps for local branches"}

Keep the guard and the field update inside the existing Step:

::Snippet{name="blockStepBranchesAfter" label="✅ Returning results from local branches"}

Calling an existing reusable Step still expresses a named operation, and `Update.combineSteps` sequences transitions. Returning a connected Step or initialization recipe from `makeStep` defers it until Composition execution. A producer mixing connected recipes with local branches still needs Block-owned local Steps to preserve its result channels. Those cases retain their composition and registration checks.

### ParentBlock.makeOutMessageFold

`ParentBlock.makeOutMessageFold(ChildBlock, handlers)` authors an exhaustive parent policy against the child contract. Use the same two-argument form whether the fold is inline under `withOutMessagePolicy({ fold })`, extracted to a named value, or adapted for a keyed policy. Named variant handlers infer the child's precise payload and the parent Model. Each returns a parent Step, preserving its Command requirements and connected sibling obligations. A handler that needs Command lifters or the previous parent Model takes the inferred `FoldContext` as its second argument.

### ParentBlock.makeOutMessageForward

`ParentBlock.makeOutMessageForward(handlers)` authors an exhaustive callable forwarding policy inline under an unkeyed Binding's `withOutMessagePolicy({ forward })`; the Binding supplies the child contract context. Pass the child contract explicitly as `ParentBlock.makeOutMessageForward(ChildBlock, handlers)` when extracting the forward or adapting a keyed policy. Each handler returns one of the Definition's declared OutMessages or `undefined`; at least one variant must forward. The helper is absent when the Definition declares no OutMessage Schema.

### Declaring operation adapters

Declare ordinary parent inputs through [InMessage and inMessageUpdate](#inmessages). Keep the Block's `operations` record for explicit adapters. A local Message constructor is the short form. Use an operation declaration with `message`, `outMessage`, `services`, or `managedResources` when the adapter exposes those channels. Completion checks the implementation against the declaration; it cannot silently drop an OutMessage or Service requirement.

The acquired implementation dispatches the produced Message through its update. A constructor with fields becomes `(model, payload, ...context)` on its `operations`; a constructor without fields becomes `(model, ...context)`. A Binding operation omits the child Model, and a keyed Binding prepends the occurrence key.

Use a tuple producer when public arguments need mapping, defaults, refinement, or a particular Context tuple. Prefer a plain array literal when its tuple positions are contextually typed. Use `Tuple.make` only when an extracted producer would otherwise lose the required tuple typing. The declared Message must belong to the original local union; generated child delivery cannot become a local operation.

### binding.fold

`binding.fold(model, message, ...context)` is the projected primitive that forwards an already received child Message through the child update and the Binding's policies. Composition invokes it after recognizing the Binding's registered wrapper. Its Model input requires the graph capability for that exact Binding, so a typed call with a raw domain Model fails, and its opaque connected result exposes no `.model` or `.commands` before checked execution. Application update normally relies on Composition routing. Framework adapters and focused tests may call `fold` directly when they already own a child Message. Use a generated input method or explicit operation adapter when the parent initiates a child change.

### Binding operations

A declared operation such as `requestClearSelection` becomes `binding.requestClearSelection(...args)`. It returns a connected parent Update.Step through the same Model access, Command lifting, resource access, and OutMessage policy as `fold`. Return or compose its opaque result intact after applying it to the contextual Model inside `makeUpdate`, or list the Step in Composition startup. Typed calls with a raw Model fail the graph-input check, and the opaque result cannot be narrowed to a useful `{ model }` return. TypeScript can still erase a function result when assigning it to a method that returns `void`; outside the exact graph, invoking that erased method only constructs and discards passive configuration and executes no child work. An acquired `block.operations.requestClearSelection(model, ...args)` dispatches the produced Message through the Block's update and returns the readable executed result. A keyed Binding takes the occurrence key before the operation arguments. Operation names cannot collide with Binding members such as `fold`, `init`, or `embedView`.

### binding.init

`binding.init({ key?, args, toParentModel, commands? })` returns a passive, noncallable initialization recipe. `key` is required for a keyed Binding, `args` is the exact child init tuple, and `toParentModel` receives the initialized child and constructs the complete parent Model. Return the recipe directly from the owning Composition's `makeInit` callback or `makeUpdate` handler, or preserve it through the parent's `makeStep` producer. The Composition authoring boundary interprets it directly. The exact graph then produces all lifted child Commands before optional parent Commands. The recipe has no `.model` or `.commands` fields.

For reset behavior, prefer a child-owned InMessage request handled through `inMessageUpdate`. Deliberate baseline initialization must preserve the parent's other fields and the complete recipe; it does not establish occurrence replacement or cancellation. See [Resetting a child](/core/init-and-flags#resetting-a-child) for both paths with a Counter that has no pending lifecycle.

### binding.create

`binding.create({ key, args })` is available for a standard `Schema.Array(ChildBlock.Instance)` field bound with `key: 'key'` and `childField: 'model'`. It returns a passive request accepted by the owning `makeFieldsStep`, with a string key and the child's exact init argument tuple. Checked execution initializes a new occurrence and retains its Commands. Duplicate keys and attempts to replace an existing key are rejected before initialization. Use the existing `init` helpers for other storage or deliberate replacement.

### binding.embedView

`binding.embedView({ slotId, model, viewInputs? })` returns the only accepted `h.block` config for that placement. A keyed Binding also requires `key`.

### Scoped child delivery

Use `Story.messageIn(binding, message)` to deliver a direct child fact in a Block-aware Story. For an advanced direct transition fixture, `withBlock` supplies an acquired test Block and `Test.toParentMessageFor(block)` maps exact child Messages into its dispatch contract. A selected child Binding as the second argument resolves nested delivery against that same graph.

Private lifecycle inventories and inferred child envelopes do not form part of the public Block contract. Test behavior through the owning implementation and its registered definitions.

### Providing child implementations

Compose the parent construction Layer with `.pipe(Layer.provide(Child.layer))`. The Binding uses the child's public Block; the Layer supplies the implementation of that contract. Construction, handler invocation, and Model occurrence lifetimes remain separate.

### FeatureBlock.provideHandlers

`layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))` selects providers for the original definitions listed under the constructor's `hostHandlers`. Every selected Layer must supply every listed handler. A same-shaped foreign definition does not provide the original handler's identity. Ordinary `Layer.provide` composes child construction dependencies without changing that selection.

Select all pending handlers before passing the Layer to a host. Selection does not acquire the graph or build the handler Layer. The public effects bounds are those declared by the Block. Generic family APIs such as [Query](/core/query) also expose checked selection for their published Fetch contracts.
