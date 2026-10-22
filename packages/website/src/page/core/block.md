# Block

## Overview

A large application becomes difficult to change when every feature's transition logic accumulates in one update function. A Block keeps one feature's state machine together: its Model, Messages, update, Commands, view, and lifecycle work. Blocks preserve a single Application Model assembled from those owned child Models. The parent receives child Messages and decides how each feature participates in the larger application.

The child describes what it owns. The parent creates a Binding that describes the relationship between that child and the rest of the application.

Four values make those responsibilities visible:

| Value           | Owner   | What it decides                                                                                         |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| Definition      | Feature | Model, Message, optional OutMessage and ChildInitContext contracts, Commands, lifecycle work, and Steps |
| Composition     | Feature | The exact child Binding and Mount graph used by init, update, and the main view                         |
| Completed Block | Feature | The implementation and local handler recipe that a parent may bind                                      |
| Binding         | Parent  | Model storage, child initializer arguments, delivery context, and OutMessage policy                     |

The Settings example on this page grows through that sequence. Settings first defines and completes its own state machine. Profile then creates `SettingsBinding`, registers it in `ApplicationComposition`, handles the `ChangedTheme` fact, and embeds the Settings view.

The sequence is Definition → Composition → assembly. A Definition establishes the contracts and authoring methods. A Composition fixes the child Binding and Mount graph. `assembleBlock` checks and packages the authored implementation with that graph. The root follows the same sequence before `Program.make` or `Program.makeElement` adds host behavior.

Definitions, Compositions, Bindings, Blocks, and Programs are passive. `makeInit`, `makeUpdate`, and `makeView` return functions for the Runtime to call later. At the root, `program.provide(ApplicationLayer)` supplies ordinary Effect Services without building them. `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` builds the selected handler graph, resolves Flags when required, calls init, and begins performing effects.

A Binding lets Foldkit use one parent-owned policy across update, view, Subscriptions, ManagedResources, Mounts, and handler collection. The parent still decides where the child Model lives, what child facts mean, when the child exists, and where it renders.

If you are converting an existing suite alongside these production boundaries, the [testing migration cookbook](/testing#migrate-an-existing-test-suite) shows Command identity, generated child results, Subscription registries, and completed UI Block contracts before and after.

:::Info{label="Complete application"}
The [Typing Terminal application](/example-apps/typing-terminal) composes Home and Room as Blocks. Its [client source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src) shows Definitions split across files, parent Bindings, route gates, OutMessages, and root service provision.
:::

## When to Create a Block

Use a Block when part of the application owns a state machine rather than only markup. Common reasons are:

- A reusable component owns interaction state, keyboard behavior, focus, or accessibility wiring.
- A feature area owns enough Model and Message variants that its update loop should be separate.
- A feature owns Commands or lifecycle work that should travel with its state and update boundary.

If a section only renders parent state, use a view function. A card that receives a title and content does not need its own Block.

## Define a Block {#child-block}

### Establish the feature boundary

Declare the Schemas, then call `Block.makeDefinition('Settings', { Model, Message, OutMessage })`. This creates the feature's local identity and typed authoring helpers. The Definition does not yet know which children or Mounts the feature will register, and it is not the value a parent binds.

::Snippet{name="blockDefinition" label="Defining a typed Block"}

Name the Definition `SettingsDefinition`. Its ID is local to the feature, so it needs no ancestor or filesystem path. Keep this value in one module and import it; creating another Definition with the readable ID `Settings` creates a different Definition.

The Definition supplies `makeCommand`, `makeMount`, `makeMountStream`, `makeResource`, `makeStep`, `makeFieldsStep`, `makeNoopStep`, `makeCommandsStep`, `makeSubscriptions`, `makeManagedResources`, and `makeBinding`. These methods declare behavior owned by Settings before its graph exists.

Add a `ChildInitContext` Schema only when this feature's direct child initializer selectors share one input. [Init & Flags](/core/init-and-flags) explains that boundary and the supported initializer signatures.

Commands and lifecycle handlers declare local names such as `SaveTheme`. Foldkit derives the full runtime path from Binding placements. With explicit `profile` and `settings` placements, a nested Settings Command becomes `profile/settings/SaveTheme`; the feature remains reusable under another parent.

### Define the Composition

Call `makeComposition({ bindings, mounts })` after defining the child Bindings and parent policies. Name the result `<Feature>Composition`. It fixes the feature's graph before init, update, and the primary view are authored. Both fields are optional and default to empty collections.

Keep a named Definition when effects, internal Steps, or child Bindings use its authoring methods. Author those pieces through `SettingsDefinition`, then create `SettingsComposition`. When the Definition only supplies `makeComposition`, chain that call directly from `Block.makeDefinition` and name only the resulting Composition. Author init, update, and the primary view through that Composition. The resulting view builder exposes only registered children and Mounts, and update routes the registered child Message wrappers.

Features without children or Mounts still call `makeComposition()`. Creating a Composition records capabilities. It does not build Layers, call init, or start child behavior.

### Produce the completed Block

Call `assembleBlock` after the feature's pieces exist. Completion packages the Definition, fixed graph, implementation, and local handler recipe into the value a parent can bind. It does not build a Layer, call init, or start lifecycle work.

::Snippet{name="blockSettings" label="Producing a completed Block"}

Export the completed value as `SettingsBlock`. Parents import that value and bind it through their own Definition. The completed value carries the Model, complete Message Schema, declared OutMessage contract, and embedding inputs.

`EffectsLayer` contains only the feature's local Foldkit handler recipes. Omit it when the feature has no local handlers; Foldkit uses an empty recipe and still checks completeness. Registered child Bindings contribute their recipes automatically. A handler recipe may require an ordinary HTTP, storage, RPC, clock, or browser Service. Those Service requirements continue through composition until the application root supplies them.

### Export the feature

Export the completed `SettingsBlock` as the feature boundary. Keep small features together; split them when separate files make the responsibilities easier to navigate. [Project Organization](/patterns/project-organization) shows compact and split layouts, Composition assembly, and import direction.

Export `SettingsBlock` from the feature barrel. Also re-export its canonical `Model` Schema when the parent needs it to declare its own Model. The parent can use `Settings.Model` for Schema construction and `Settings.SettingsBlock` for Binding and OutMessage fold helpers. This keeps the parent Schema independent of inference of the completed source implementation. The completed Block still supplies the complete Message, OutMessage, operation, and view contracts. Put shared domain Schemas and selectors in a separate `domain/` barrel. Internal implementation files import their own contracts and Composition directly, avoiding a cycle through the completed Block:

::Snippet{name="blockFeatureExports" label="Exporting a completed feature"}

## Bind a Child {#embedding}

Call the parent Definition's `makeBinding` method with the completed child Block. The resulting Binding belongs to the parent because it describes parent decisions: where the child Model lives, how child Messages enter the parent, and how the parent responds to child OutMessages.

::Snippet{name="blockProfile" label="Binding a required child"}

For the common case, store the child in an exact required Struct field and pass that field name. Here, Profile stores Settings under `settings`. The Binding supplies child Message delivery for views, Command results, and lifecycle emissions. The parent does not declare or construct a wrapper.

Declare only local facts in the parent's `Message` Schema. Composition derives its complete dispatch Schema from those facts and the registered Bindings. It routes child Messages before the authored update callback, so that callback handles only local facts. The `Got*` prefix is reserved for generated delivery; a local Message with that prefix is rejected.

A child whose Message Schema is `Schema.Never` cannot emit a Message. Its Binding declares storage and lifecycle policy without a delivery policy:

::Snippet{name="blockMessageFreeChild" label="Binding a Message-free child"}

`makeBinding` creates passive configuration. The example registers `SettingsBinding` in `ApplicationComposition.bindings` so the parent update and view can use it and Foldkit can collect the child's handlers and lifecycle declarations. The same Binding routes child Messages, validates embedded views, collects handler recipes and lifecycle definitions, and assembles child startup. Nothing has run yet.

### Route child Messages {#fold-child}

Composition automatically routes the Messages of every registered child. The Binding runs the child's update, writes the next child Model, lifts returned Commands, and applies its OutMessage policy. The authored parent update handles its own local facts. Declare a `delivery.toUpdateContext` callback when the child update needs additional context, or `delivery.when` when incoming child delivery needs a parent condition.

::Snippet{name="blockFoldChild" label="Routing a bound child Message"}

Declare parent-driven operations under `operations`, then call them through the Binding. Put the local Message constructor directly under `operations` when the public arguments map directly to its payload. Block completion creates the callable operation without constructing a Message. A constructor with payload fields takes one constructor payload object, with constructor defaults honored, followed by any update context. A constructor without payload fields takes no payload placeholder. The completed Block and its Bindings pass that Message through the child's update synchronously as part of the pure transition; they do not enqueue another Runtime Message. The update remains the only place that enforces the child invariant and changes the child Model. Let the Composition route received child Messages; use named operations for changes the parent initiates. Settings declares `requestReset`, so Profile can apply that exact operation:

::Snippet{name="blockProjectedSteps" label="Calling a bound public operation"}

These calls are pure. A Binding operation produces a connected parent Update.Step whose Model input requires the exact registered graph. A raw domain Model cannot satisfy that input. Return or compose the connected result intact from `makeUpdate` or startup processing; its public type exposes no `.model` or `.commands` before checked execution. A Definition-owned `makeStep` may preserve or wrap a connected Step for later execution. The Composition consumes it while the graph is active and returns the readable next Model, optional Commands, and optional OutMessage. A completed Block operation is also a checked executor: it accepts the raw Block Model, dispatches its produced Message through update, and returns the readable result. Completion gives the operation the update function's complete Command requirements and OutMessage type even when its selected Message branch returns less. Calling a pure operation does not run effects returned by another branch. Ordinary internal Update.Steps remain directly callable. The Runtime executes returned Commands later.

Name an operation for what the parent communicates, and its Message for what the child received:

| Binding operation    | Child Message           |
| -------------------- | ----------------------- |
| `requestCloseMenu`   | `RequestedCloseMenu`    |
| `informJoined`       | `InformedOfJoin`        |
| `informRouteChanged` | `InformedOfRouteChange` |

A `request*` operation asks the child to act; its `Requested*` Message records the request, not completion. An `inform*` operation tells the child about an external fact; its `InformedOf*` Message records that notification. Keep actual UI facts separate when they have a different cause. For example, a parent request to close a menu should not impersonate a click on its close button.

Both forms enter the child's update. Even when a notification only synchronizes Model state, update owns that transition and any validation, Commands, or OutMessages. Do not expose a `reflect*` helper that changes child state silently.

The operation below produces `InformedOfRouteChange`; update owns the resulting transition:

::Snippet{name="updateCurriedStep" label="Declaring an informRouteChanged operation"}

Use a tuple producer under `operations` when the public inputs need mapping, refinement, defaults, or an exact context tuple. It returns `[Message, ...context]`; inline array literals receive tuple context from `assembleBlock`, and an extracted producer uses `Tuple.make`. Message constructors and tuple producers complete through the same update path. Keep pure helpers for selectors and derived view inputs. Use standalone or Definition-owned Steps for internal composition, and omit `operations` when the Block declares no named operations. See [Calling update as a Step](/core/update#calling-update-as-a-step) for internal curried update composition and the required-context adapter.

Binding operations retain the exact argument types, Command requirements, Binding requirement, and OutMessage behavior of the child operation.

:::Info{label="Completion inference"}
Author `update` as a named value with `Composition.makeUpdate`, then pass it to `assembleBlock`. With a view, operations, Subscriptions, and ManagedResources in one completion record, nesting `makeUpdate` directly in that record can make the current overloads infer an incomplete handler Layer. Naming the authored update first retains its full inferred type without annotations.
:::

### Initialize the child

The Binding also declares how its child joins the initial parent Model. A required direct child whose initializer takes no arguments needs no `init` property. The basic `SettingsBinding` omits it, so Composition calls the initializer packaged in `SettingsBlock` and supplies `model.settings` while Profile init returns only `displayName` and `previewTheme`.

Use `init: { contextToArgs }` when another child needs inputs, or `init: false` when the parent will supply that field itself. This separate Profile contains a ThemePicker whose initializer requires a Theme. The Binding selects the saved theme, while Profile owns the username:

::Snippet{name="blockFoldChildInit" label="Assembling an initial child Model"}

The parent init callback returns only parent-owned fields. Composition calls the selected child initializer, stores its Model, and retains its Commands. See [Init & Flags](/core/init-and-flags#child-initialization) for optional children, keyed occurrences, custom storage, Command batching, and initial Steps.

Block init cannot emit an OutMessage. Author it through the Block Composition, then pass that same `init` function to `FeatureComposition.assembleBlock`. An optional `boot` helper is an ordinary initial Step listed in the parent's init plan after the child Model exists; Foldkit has no special Runtime boot phase. When an existing domain operation such as `requestRestore` or `requestOpen` already describes the transition, declare that Message-producing operation and call it through the Binding. The same operation may run later from update. Do not create a separate startup-only Message when an existing Message already records the transition.

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

The local `Message` union remains the right type for authored update logic. Derive `typeof FeatureComposition.Message.Type` only at a boundary that consumes the complete dispatch contract, such as a root `Runtime.CrashContext`. Do not add a parallel complete Message alias to every feature.

::Snippet{name="blockCompositionTypes" label="Composition-specific builder and dispatch types"}

## Handle Child Facts with OutMessages {#surfacing-facts}

A child reports facts to its parent through an OutMessage. A public operation carries a parent request down; an OutMessage carries a child fact up. For example, Profile may ask Settings to reset, while Settings reports that its theme changed. The parent Binding decides what that reported fact means at this boundary.

Every Binding for a Block with OutMessages must select an explicit policy with
`withOutMessagePolicy`. Keep the ordinary case as one fluent declaration:
`ParentDefinition.makeBinding(ChildBlock, config).withOutMessagePolicy(policy)`.
The selected value is the full Binding to register and use.

- `fold` handles the fact in the current parent and returns a parent Step.
- `forward` translates selected facts into the current Block's own OutMessage.
- A Binding may do both. A derived OutMessage from the local fold takes precedence for that dispatch.

Build a parent-owned OutMessage fold with the parent Definition and the whole
completed child Block:

::Snippet{name="blockOutMessagePolicy" label="Handling a child OutMessage"}

Inline a one-way policy as
`ParentDefinition.makeBinding(ChildBlock, config).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(ChildBlock, handlers) })`.
The completed child supplies the exact OutMessage contract, while the parent
Definition supplies the Model, Message, and OutMessage contracts. Name the fold
when reuse, keyed adaptation, or reciprocal staging benefits from a separate
value. Both inline and named folds pass the completed child explicitly and
retain Command requirements and sibling Binding registration evidence for
Composition to check. Name each child OutMessage variant directly in `handlers`;
a missing or extra variant fails type checking. Each handler returns the parent
Step for that fact without a repeated `Update.Step` annotation or refined
OutMessage type argument.

Inline `ParentDefinition.makeOutMessageForward(handlers)` under the Binding's
`withOutMessagePolicy({ forward })` when selected facts continue through the
current Block's own OutMessage. Pass the completed child explicitly when the
callable forward is extracted. The helper is available only when the parent
Definition declares an OutMessage Schema. Name every child variant; return a
declared parent OutMessage for variants that continue and `undefined` for named
variants that stop here. At least one handler must forward.

::Snippet{name="blockOutMessageForward" label="Forwarding selected child OutMessages"}

`makeBinding` fixes storage, delivery, lifecycle, and child identity before policy
selection. `withOutMessagePolicy` selects one immutable policy for that same
child Binding. Register the selected Binding in the Composition. A missing
policy, a missing or extra handler, an undeclared forwarded OutMessage, or a
sibling operation absent from `bindings` fails type checking. Runtime checks
supplement those guarantees for erased JavaScript. Definition, Binding, policy,
and Composition construction remain passive: they do not build Layers, call
handlers, or start lifecycle work.

The parent configures integration policy in its child Binding. That policy executes during the pure child fold or operation. The flow is parent update → child fold or operation → parent OutMessage handling → parent result. Keep a substantial policy in a named parent fold beside that child's Binding, extracting both to `composition/<child>.ts` when the policy becomes substantial. A handler takes the exact `FoldContext` as its second argument only when it needs to lift a child Command or compare the transition with parent state from before the child update. A fold whose handlers omit that argument remains unary. `modelBeforeUpdate` is the previous parent Model. The Step returned by the handler still receives the parent Model after the next child Model has been written.

## Complete the Application

Call `Block.makeDefinition('Application', { Model, Message })` for the root. Export the early typed value as `ApplicationDefinition` when its owned methods author root Commands, Steps, lifecycle declarations, or Bindings. When the factory only creates the Composition, chain its top-level result directly into `makeComposition()`. Author init, update, and the primary view through `ApplicationComposition`, then assemble `ApplicationBlock` with explicitly listed implementation pieces. In `entry.ts`, pass that Block and browser inputs to `Program.make` or `Program.makeElement`.

Root `services.ts` supplies the shared store required by the child handler:

::Snippet{name="blockApplicationServices" label="Application settings provider"}

The entry gives the completed `ApplicationBlock` to `Program.make` and starts the Program:

::Snippet{name="blockApplicationCompletion" label="Starting the Application"}

The Application Composition carries the child graph. Its completion config supplies root-local handler recipes and lifecycle definitions. Registered child Blocks contribute their own handlers through that graph. `ApplicationLayer` supplies ordinary application Services such as storage or an HTTP client. It does not re-merge each feature's `EffectsLayer`.

`ApplicationComposition.assembleBlock` validates the concrete composition before the Runtime starts. `Program.make` returns another passive value, and `program.provide(ApplicationLayer)` records ordinary Service providers. The Runtime builds those Layers and the selected handler graph when the Program starts. Missing handlers, incompatible child Bindings, unavailable Mount requirements, and an unhandled root OutMessage fail before a user interaction.

Use `assembleBlock` when a root needs the full Block API. Child Bindings, `Block.inspectBinding`, Layer inspection, `replaceEffectsLayer`, `provideHandlers`, and view-configuration tooling all consume ordinary completed Blocks.

A split application root can opt into a smaller terminal boundary instead. `assembleRoot` returns a root for `Program.make`, `Program.makeElement`, and `Server.renderToString`, with six public fields: `owner`, `Model`, `Message`, `init`, `update`, and `operations`. The implementation file checks the full concrete graph, including registered children, lifecycle declarations, handler recipes, operations, view ownership, required update context, root OutMessages, and Layer requirements. The exported value does not expose child binding or tooling helpers.

::Snippet{name="blockApplicationTerminalRoot" label="Assembling a terminal root"}

The assembly snippet imports the named boundary contracts from the implementation module. Those contracts stay derived from the actual Composition and implementation, so they do not duplicate child or operation bookkeeping:

::Snippet{name="blockApplicationRootContract" label="Deriving root boundary contracts"}

Keeping those expensive arguments behind names lets a thin consumer import one compact contract instead of expanding the whole child graph.

::Snippet{name="blockApplicationRootExport" label="Exporting the root boundary"}

Server rendering uses the same root:

::Snippet{name="blockServerRender" label="Rendering the Application on the server"}

The server runs init and view. It does not construct browser handler Layers or start lifecycle work.

## Callback Dispatch Boundaries

A child view builds handlers for the child's Message union. A top-level callback in `viewInputs`, such as `toView`, runs in the parent's boundary. Handlers built by that callback reach the parent update directly. Foldkit preserves that boundary when the child invokes the callback.

Keep callbacks at the top level of `viewInputs`. View authoring rejects statically visible functions nested inside records, arrays, tuples, unions, or `Option` values because Foldkit cannot infer which boundary should own them. Generic views retain that check when their inputs become concrete. Runtime validation also checks dynamically typed inputs.

### Publish child attributes {#child-attributes}

A headless Block may supply behavior while its parent chooses the markup. The child builds attribute groups with `childAttributes` before passing them to `toView`. Each group retains the child's dispatcher and any Mount requirements.

::Snippet{name="blockChildAttributesPublish" label="Publishing child attributes"}

The parent spreads those groups onto its own elements. Child handlers still reach the child update through the Binding's generated delivery; parent handlers built alongside them reach the parent update.

::Snippet{name="blockChildAttributesConsume" label="Rendering child attributes"}

Block authors call `childAttributes`; consumers spread the supplied groups. Stateless render helpers such as Button already use the caller's builder and Message type, so they do not establish a child boundary or need this wrapper.

### Share parent renderers

Build shared renderers in the parent and pass them as top-level `viewInputs` callbacks. A renderer can embed a sibling Block through that sibling's Binding. Each embed then establishes its own child boundary.

Thread `h` through view functions and render callbacks. Do not store a builder in module state; its dispatch context belongs to the current render boundary.

## Child Delivery Context

A Binding already knows the child Message and its captured occurrence. Use `delivery.toUpdateContext` only for additional arguments required by the child's update. Its callback receives the current parent Model; a keyed Binding also supplies the captured key. Return the exact context tuple, without repeating the child Message or key. Optional and defaulted parameters still need an explicit policy; return an empty tuple to use child defaults when that signature permits it.

Use `delivery.when` to ignore incoming child Messages under a parent-owned condition. A false result leaves the parent Model unchanged. This gate does not make the child absent, stop its lifecycle work, or gate an explicitly invoked Binding operation. Use `presentWhen` or a custom reader for whole-child presence, and `subscriptions.when` to gate only Streams.

## Optional Children

An exact `Option<ChildModel>` field declares an optional child without a manual accessor. When the field is `None`:

- connected folds leave the parent Model unchanged;
- that occurrence's Subscription Streams stop;
- its ManagedResource handles release;
- its mounted elements clean up.

When the child reappears, Foldkit creates a new occurrence with new lifecycle scopes. A Command already running for the old occurrence keeps application lifetime, but its result is discarded if that occurrence is no longer current. This preserves Command interruption semantics while preventing a stale result from updating a replacement child.

Use `presentWhen` with a direct field when parent policy controls the whole child's presence independently of storage. The predicate applies to folds, operations, Subscriptions, ManagedResources, and Mounts. A false result behaves like an absent Option field and never clears or replaces the stored child Model.

::Snippet{name="blockPresenceGate" label="Gating a child occurrence"}

Use explicit `read` and `write` for nested storage, tagged parent variants, or a custom write that updates more than the child field. The accessor's `None` result already determines presence, so accessor Bindings do not also take `presentWhen`.

Resource cleanup owns work that requires a live resource handle. See [operations using a handle](/core/managed-resources#operations-using-a-handle) for coordinating that lifetime with a running Command.

Use `subscriptions.when` when only child Streams need additional activation policy while the child remains present:

::Snippet{name="blockSubscriptionGate" label="Gating a child Subscription"}

The gate controls Streams. It does not remove the child or disable its update.

## Coordinate Sibling Blocks

A policy may return a parent Step that calls a registered sibling Binding operation. This supports parent-owned coordination in either direction: one child's OutMessage can initialize, update, or remove another child while preserving both boundaries. Keep reciprocal policies together in the same parent `composition.ts` or `composition/composition.ts`. First declare `HomeBinding` and `RoomBinding`, then author the folds, select `HomeBindingWithOutMessagePolicy` and `RoomBindingWithOutMessagePolicy`, and register those selected values. The callbacks may close over either original Binding. `makeComposition` validates the policy's captured output and confirms that every sibling Binding used by the policy is registered in `bindings`. Keep the chain synchronous and finite; one policy may invoke another Binding policy before the original update returns.

This parent opens the selected Room when Home reports `SelectedRoom`. When Room later reports `SavedRoom`, the parent marks that Room as saved in Home. The omitted child contracts provide both operations: `RoomBinding.requestOpen` returns a pure connected Step, while `HomeBinding.informRoomSaved` returns a connected Step with a persistence Command. Neither operation emits another sibling OutMessage:

::Snippet{name="blockSiblingCoordination" label="Coordinating sibling Blocks in both directions"}

When the decision depends on parent state from before the child update, take the inferred `FoldContext` as that variant handler's second parameter and read `modelBeforeUpdate`. Return the selected sibling Binding operation directly. The returned Step runs against the parent Model after the source child's next Model has been written, so the parent does not need to copy a snapshot into either child or add another Message stage.

::Snippet{name="blockParentAwareSiblingPolicy" label="Choosing a sibling operation from parent state"}

## Keyed Children {#fold-child-at}

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

The parent owns optional presence. Use `RoomBinding.init({ key, args, toParentModel })` when an update or custom startup path creates the occurrence. Automatic `init.instances` applies only to keyed arrays and is rejected for Option storage.

Use the general keyed form when the parent or wrapper Schema is opaque, wrappers are a union or use open/index-signature storage such as `Schema.StructWithRest`, a zero-or-one occurrence does not use the exact Option wrapper shape above, or writing a child requires other parent changes. `readAll` enumerates the items, `key` selects stable identity, `read` selects the child Model, and `writeAt` stores its next value. Supply `keySchema` for this general form so the complete Message Schema can validate and serialize the selected key. Field shorthands derive that Schema from the declared key field.

Each active key gets independent Subscription, ManagedResource, and Mount scopes. `fold`, operations, `init`, and `embedView` take the key first. The key must be a stable string or finite number and must be unique in the current collection.

Removing a key synchronously makes its dispatchers stale and starts lifecycle cleanup. Reusing the same key later creates a new occurrence; results and callbacks captured by the earlier occurrence cannot update it.

Keyed Bindings do not reconcile the collection itself. Application update remains responsible for adding, removing, and ordering items in the parent Model. An explicit `Binding.init({ key, args, toParentModel })` must place exactly one initialized occurrence under the requested key. A child fold or operation cannot change that key. In the wrapped array form, the wrapper key stays fixed while child folds and operations replace only the child field. The parent changes occurrence identity by removing one item and adding another under its own update logic.

A keyed Binding can also represent one optional child whose domain identity changes. Prefer the exact Option wrapper shorthand above when the Schema has that shape. Use general keyed accessors for every other storage representation.

For example, in [Typing Terminal](/example-apps/typing-terminal), the Room Binding captures `roomId` as the generated `GotRoomMessage` envelope's key for views, Command results, and Subscription emissions. Navigating to another room replaces the keyed occurrence and initializes a fresh Room Model. A delayed result keeps its original room ID; the parent does not infer its origin from the current Route. Local child Messages such as `ChangedUserText` need no additional room ID.

Discarding a Command result does not undo its external writes. Scope persistent data by the same domain ID when a completed write from one occurrence must not overwrite another occurrence's data.

## Reading Parent State

The child Model should contain state the child owns. Parent-owned values can cross the boundary in two explicit ways.

The basic Settings Block needs only its Model and Message. When a different child truly needs parent state for each transition, declare that context in the child's update signature and supply it through the Binding's Message route. This separate AccountSettings Block records which current user changed the theme:

::Snippet{name="blockParentStateInUpdate" label="Parent context in child update" class="mb-4"}

Pass render-only values through `viewInputs`:

::Snippet{name="blockParentStateInView" label="Parent state through view inputs" class="mb-4"}

If a value must survive independently or drive future child transitions, put it in the child Model through a child-owned Step.

## Inform a Child about External State {#informing-external-state}

Sometimes another source is authoritative: the URL may own filter bounds, or a form library may own the current field value. The child still owns every change to its Model. Expose an `inform*` operation that produces an `InformedOf*` Message, then call it through the registered Binding while handling the source's Message.

::Snippet{name="blockInformExternalState" label="Informing a child about URL state"}

The child update handles the child-local fact and may return only `{ model }`. It does not echo an OutMessage to the parent that just supplied the fact. Keeping the notification in update centralizes the child invariant and shares transition behavior with every other cause of the same Model change. The same path remains valid when the transition later gains Commands. Pure selectors and derived view inputs remain ordinary helpers because they do not change the child Model.

## Select a Handler Recipe {#select-a-local-handler-recipe}

The completed Block includes the feature's attached handlers. Most tests should keep them and replace their underlying service Layers. This exercises the same mapping, retry, error, and Message policy as production.

When a host intentionally replaces the feature's handlers as a group, call `replaceEffectsLayer` before connecting it:

::Snippet{name="blockEffectsLayerSelection" label="Selecting a feature handler recipe"}

Use the original definitions' `toLayer` methods so the alternate providers retain the same contracts and runtime identities. The selected recipe replaces the feature's local recipe and retains its child recipes. The unselected recipe is never built.

Whole-handler replacement is useful for a host-owned feature contract, a deliberately simulated demo environment, or focused Runtime orchestration tests. It is a secondary seam; service replacement is the usual application-testing boundary.

## Generic Blocks

A reusable factory can refine a completed Block with a Schema while sharing one identity and one local handler recipe. For this specialized case, `Block.makeNamespace('Combobox')` establishes the shared identity and primitive methods before the single, multi, and generic item contracts exist. `ComboboxNamespace.makeDefinition({ Model, Message, OutMessage })` then establishes each typed Definition under that identity. Ordinary features call `Block.makeDefinition(id, contracts)` directly.

::Snippet{name="blockGenericFactory" label="Schema-refined Block"}

Keep the shared identity and recipe at module scope. Factory calls may refine Model, Message, OutMessage, view inputs, and public operation payloads. They must not manufacture new effect identities for the same reusable component.

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

A Block Definition identifies a reusable feature. A Binding's placement identifies that one Binding in its parent's composition graph. `slotId` identifies one render position, and a keyed Binding's key identifies one dynamic occurrence under the Binding. These values serve different jobs and should all remain stable.

Register each repeated Binding once in the parent's Composition. This Chat parent connects two distinct Composer fields through two Bindings:

::Snippet{name="blockRegisterChildren" label="Registering repeated child Bindings"}

An unkeyed direct field defaults placement to `field`, including an optional field. Accessor Bindings and all keyed Bindings default to the child Block ID. A keyed Binding's key distinguishes instances under that one placement. An explicit `placement` overrides either default. A direct `Option` field keeps the same placement whether it contains `Some` or `None`.

Set `placement` only when a default would collide with a sibling Binding or when the graph deliberately needs another stable identity. For example, two accessor Bindings of the same Composer Block both default to `Composer`, so the second needs another placement:

::Snippet{name="blockStaticPlacements" label="Resolving an accessor placement collision"}

The Binding may read a direct Model field or custom storage. Direct unkeyed storage supplies the placement default described above; a child's domain ID does not. Choose an explicit placement when the graph needs a stable identity different from that default. Foldkit validates direct storage from the decoded Schema shape. Reuse the same Schema instance when the child Model uses an opaque declaration, or use explicit `read` and `write` for custom storage.

## Debugging in DevTools

Composition derives readable `Got<FormattedPlacement>Message` tags. It capitalizes placement segments separated by hyphens, underscores, or spaces and preserves capitals inside each segment. Duplicate sibling placements and names that format to the same tag are rejected.

The envelope records placement, the captured occurrence generation, the child Message, and a key for keyed delivery. The Runtime captures that origin when a view, Command, or lifecycle source emits. Removing and recreating an occurrence does not let its old results update the replacement.

Use `FeatureComposition.Message` or `FeatureBlock.Message` to decode, serialize, or inspect complete dispatch history. The feature's local `Message` remains the union authored in its Message module. Completed Schemas retain its local constructors; generated wrappers have no public constructors. Effect names use the derived composition path, so repeated placements and keys remain distinguishable while local definitions keep short names.

Decoding checks the envelope's structure, placement, and key Schema. It does not establish that its occurrence is still current. Before queueing externally supplied live Messages, the Runtime checks the complete placement, key, and generation chain against the active graph. History replays previously accepted Messages; pure update, Story, and Scene replay do not repeat live admission. A Message that decodes for replay is not necessarily valid for live delivery.

## API

### Block.makeDefinition

`Block.makeDefinition(id, { Model, Message, OutMessage? })` creates a local identity and typed effect, Step, lifecycle, and child Binding authoring methods. `id` is a nonempty segment without `/` or `::`. Name the returned value `<Id>Definition`, such as `SettingsDefinition` for the ID `Settings`, when its authoring methods are used. When its only use would be `makeComposition`, chain that call directly into a top-level `<Id>Composition` declaration. Keep the factory at module scope so the owner identity is created once. The Composition owns init, update, the primary view, and assembly for that fixed graph.

For a generic factory that shares definitions, `Block.makeNamespace(id)` supplies the shared identity and primitive methods. Name that value `<Id>Namespace`, then call `<Id>Namespace.makeDefinition(contracts)` for each typed contract. Both stages are passive configuration.

### FeatureDefinition.makeComposition

`FeatureDefinition.makeComposition({ bindings?, mounts? })` checks the composition graph and returns `FeatureComposition`. Omitted child Bindings and Mounts default to empty collections without granting their capabilities.

### FeatureComposition.assembleBlock

`FeatureComposition.assembleBlock({ init, update, view?, operations?, subscriptions?, managedResources?, EffectsLayer?, hostHandlers? })` checks and returns the passive completed Block. `EffectsLayer` may require ordinary Services supplied by `program.provide(ApplicationLayer)`. `hostHandlers` explicitly declares contracts left to the host. Complete those Blocks with their own `provideHandlers(...)` before binding them into `ApplicationBlock`; Program construction rejects unresolved handlers.

Use this form when a parent will bind the result as a child, when code needs `Block.inspectBinding`, or when tooling needs the completed Block surface for child, lifecycle, view, handler, or Layer inspection.

### FeatureComposition.assembleRoot

`FeatureComposition.assembleRoot({ init, update, view, operations?, subscriptions?, managedResources?, EffectsLayer? })` checks and returns a terminal root for `Program.make`, `Program.makeElement`, and `Server.renderToString`. It has exactly six public fields: `owner`, `Model`, `Message`, `init`, `update`, and `operations`.

A terminal root retains the same inferred checks for Model, Message, init, update, operations, the default view kind, handler requirements, ordinary Service requirements, registered child evidence, and concrete composition validation. It cannot declare `hostHandlers`, require extra update context at the root boundary, leave a root OutMessage, expose child Binding helpers, expose graph inspection, inspect Layers, reconfigure Layers, or serve view-configuration tooling. Use `assembleBlock` when any of those consumers need the full Block API.

For a split root, derive `ApplicationMessage` from the Composition, `ApplicationImplementation` from the implementation object, and `ApplicationRootChannels` from both. Pass these named interfaces to `Block.Root<...>` when annotating the exported root. The interfaces preserve the inferred contracts without listing each child or operation again. Downstream files can read the root's public fields without checking its entire implementation; the implementation file checks the complete graph.

### ParentDefinition.makeBinding

`ParentDefinition.makeBinding(FooBlock, config)` creates one static, optional, or keyed Binding in the parent Model context. Use `field` for an exact Struct field containing the child Model or `Option<ChildModel>`. Use `presentWhen` for whole-child presence policy, or explicit `read`/`write` for custom storage. Generated delivery carries each child's exact Message Schema and occurrence identity. A child with OutMessages requires `.withOutMessagePolicy({ fold?, forward? })`; register and use that returned full Binding. Chain the call for an ordinary one-way policy. Keep the first Binding in a named value when a self-referential or reciprocal policy needs to call its operations, then name the selected value `<Child>BindingWithOutMessagePolicy`.

`delivery.when` gates incoming child Messages without making the child absent. `delivery.toUpdateContext` returns the exact additional arguments required by the child update. Unkeyed callbacks receive the parent Model; keyed callbacks also receive the occurrence key. General keyed accessors supply `keySchema`; direct array adapters derive it from the key field. A Message-free child omits delivery configuration. Unkeyed direct fields default placement to `field`; accessor and keyed Bindings default to the child Block ID. `subscriptions.when` gates only Streams. OutMessage handling remains parent policy.

### FeatureDefinition.makeStep

`FeatureDefinition.makeFieldsStep(callback)` authors a unary Model-only Step from field transformers. The callback receives the current Model and returns the same record accepted by `modifyFields`; omit the parameter when the transformers do not need another field. `FeatureDefinition.makeNoopStep()` authors a Step that preserves the exact incoming Model, which is useful when a named child OutMessage intentionally leaves the parent unchanged. Pass the helper point-free as that variant's handler: `Closed: FeatureDefinition.makeNoopStep`.

`FeatureDefinition.makeCommandsStep(commands)` authors a Model-preserving Step from an existing Command collection. Use it when a composed Step only returns Commands, such as focusing a field after opening a Dialog. It retains result Message checks, Service requirements, and Binding registration evidence. Creating or applying the Step does not execute its Commands; Runtime executes them independently.

`FeatureDefinition.makeStep(producer)` handles parameterized, Command-producing, OutMessage-producing, connected Binding, initialization, delegated, conditional, and composed results. It preserves or wraps a connected value until a Composition interprets it under the registered graph, and infers the operation's arguments, result Messages, Command requirements, and Binding requirements. Ordinary update branches continue to return `{ model: modifyFields(...) }`; do not create and immediately invoke a Step solely to use the field helpers. Public operations belong in the completed Block's `operations` record as local Message constructors or Message tuple producers.

### ParentDefinition.makeOutMessageFold

`ParentDefinition.makeOutMessageFold(ChildBlock, handlers)` authors an exhaustive parent policy for the completed child. Use the same two-argument form whether the fold is inline under `withOutMessagePolicy({ fold })`, extracted to a named value, or adapted for a keyed policy. Named variant handlers infer the child's precise payload and the parent Model. Each returns a parent Step, preserving its Command requirements and connected sibling obligations. A handler that needs Command lifters or the previous parent Model takes the inferred `FoldContext` as its second argument.

### ParentDefinition.makeOutMessageForward

`ParentDefinition.makeOutMessageForward(handlers)` authors an exhaustive callable forwarding policy inline under an unkeyed Binding's `withOutMessagePolicy({ forward })`; the Binding supplies the child contract context. Pass the completed child explicitly as `ParentDefinition.makeOutMessageForward(ChildBlock, handlers)` when extracting the forward or adapting a keyed policy. Each handler returns one of the Definition's declared OutMessages or `undefined`; at least one variant must forward. The helper is absent when the Definition declares no OutMessage Schema.

### Declaring operations

Put a local Message constructor directly in `assembleBlock({ operations })`, using the operation name as its key. TypeScript checks its Message shape, and completion verifies that the constructor is an actual member of this Block's declared Message Schema. A same-shaped constructor from another union is rejected at runtime. Routed `Got*` wrappers remain Binding delivery and cannot become local operations.

Completion combines each constructor with the Block's update. A constructor with fields becomes `(model, payload, ...context)` on `block.operations`; a constructor with no fields becomes `(model, ...context)`. The Binding method omits the child Model, and a keyed Binding prepends its key. All operations retain update's complete Command requirements and OutMessage contract.

### binding.fold

`binding.fold(model, message, ...context)` is the projected primitive that forwards an already received child Message through the child update and the Binding's policies. Composition invokes it after recognizing the Binding's registered wrapper. Its Model input requires the graph capability for that exact Binding, so a typed call with a raw domain Model fails, and its opaque connected result exposes no `.model` or `.commands` before checked execution. Application update normally relies on Composition routing. Framework adapters and focused tests may call `fold` directly when they already own a child Message. Use a named operation when the parent initiates a child change.

### Binding operations

A declared operation such as `requestClearSelection` becomes `binding.requestClearSelection(...args)`. It returns a connected parent Update.Step through the same Model access, Command lifting, resource access, and OutMessage policy as `fold`. Return or compose its opaque result intact after applying it to the contextual Model inside `makeUpdate`, or list the Step in Composition startup. Typed calls with a raw Model fail the graph-input check, and the opaque result cannot be narrowed to a useful `{ model }` return. TypeScript can still erase a function result when assigning it to a method that returns `void`; outside the exact graph, invoking that erased method only constructs and discards passive configuration and executes no child work. A completed `block.operations.requestClearSelection(model, ...args)` dispatches the produced Message through the Block's update and returns the readable executed result. A keyed Binding takes the occurrence key before the operation arguments. Operation names cannot collide with Binding members such as `fold`, `init`, or `embedView`.

### binding.init

`binding.init({ key?, args, toParentModel, commands? })` returns a passive, noncallable initialization recipe. `key` is required for a keyed Binding, `args` is the exact child init tuple, and `toParentModel` receives the initialized child and constructs the complete parent Model. Return the recipe directly from the owning Composition's `makeInit` or `makeUpdate` callback, or preserve it through the parent's `makeStep` producer. The Composition callbacks interpret it directly. The exact graph then produces all lifted child Commands before optional parent Commands. The recipe has no `.model` or `.commands` fields.

### binding.embedView

`binding.embedView({ slotId, model, viewInputs? })` returns the only accepted `h.block` config for that placement. A keyed Binding also requires `key`.

### Block.inspectBinding

`Block.inspectBinding(binding)` exposes the exact Subscriptions, ManagedResources, Mounts, and `EffectsLayer` carried by a static or keyed Binding. Use it when tooling or a lifecycle test must inspect eligibility. Normal parent code uses the Binding's `placement`, `init`, `fold`, `embedView`, and operations; Composition collects the Binding's lifecycle records and handler graph automatically.

::Snippet{name="blockInspectConnection" label="Inspecting Binding lifecycle metadata"}

### block.replaceEffectsLayer

`block.replaceEffectsLayer(recipe)` selects another complete local handler recipe and returns a completed Block with the same state, lifecycle, children, and public operations.

### block.provideHandlers

`block.provideHandlers(layer)` satisfies handler contracts intentionally left for the embedding host. It preserves the original definitions and composes the supplied providers into the selected handler graph.
