# Block

## Overview

A large application becomes difficult to change when every feature's transition logic accumulates in one update function. A Block keeps one feature's state machine together: its Model, Messages, update, Commands, view, and lifecycle work. Blocks preserve a single Application Model assembled from those owned child Models. The parent receives child Messages and decides how each feature participates in the larger application.

The child describes what it owns. The parent creates a Binding that describes the relationship between that child and the rest of the application.

Four values make those responsibilities visible:

| Value           | Owner   | What it decides                                                                                |
| --------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Definition      | Feature | Model, Message, optional OutMessage and Startup contracts, Commands, lifecycle work, and Steps |
| Composition     | Feature | The exact child Binding and Mount graph used by init, update, and the main view                |
| Completed Block | Feature | The implementation and local handler recipe that a parent may bind                             |
| Binding         | Parent  | Model storage, Message mapping, startup inputs, and OutMessage policy                          |

The Settings example on this page grows through that sequence. Settings first defines and completes its own state machine. Profile then creates `SettingsBinding`, registers it in `ApplicationComposition`, handles the `ChangedTheme` fact, and embeds the Settings view.

Definition, Composition, Block completion, Binding, and Application completion are passive. They validate and retain a program description. At the root, `application.provide(ApplicationLayer)` supplies ordinary Effect Services. `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` then builds the selected handler graph, resolves Flags when required, calls init, and begins performing effects.

The factory names describe what they return. `makeComposition`, `makeBlock`, `makeApplication`, and `makeElement` return configured values. `makeInit`, `makeUpdate`, and `makeView` return functions for the Runtime to call later. None of these methods executes application behavior.

A Binding lets Foldkit use one parent-owned policy across update, view, Subscriptions, ManagedResources, Mounts, and handler collection. The parent still decides where the child Model lives, what child facts mean, when the child exists, and where it renders.

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

Declare the Schemas, then call `Block.define('Settings', { Model, Message, OutMessage })`. This creates the feature's local identity and typed authoring helpers. The Definition does not yet know which children or Mounts the feature will register, and it is not the value a parent binds.

::Snippet{name="blockDefinition" label="Defining a typed Block"}

Name the Definition `Settings`. Its ID is local to the feature, so it needs no ancestor or filesystem path. Keep this value in one module and import it; creating another Definition with the readable ID `Settings` creates a different Definition.

The Definition supplies `command`, `mount`, `mountStream`, `resource`, `step`, `subscriptions`, `managedResources`, and `bindChild`. These methods declare behavior owned by Settings before its graph exists.

Add a `Startup` Schema only when this feature's child startup selectors share one input. [Init & Flags](/core/init-and-flags) explains that boundary and the supported initializer signatures.

Commands and lifecycle handlers declare local names such as `SaveTheme`. Foldkit derives the full runtime path from Binding placements. With explicit `profile` and `settings` placements, a nested Settings Command becomes `profile/settings/SaveTheme`; the feature remains reusable under another parent.

### Define the Composition

Call `makeComposition({ childBindings, mounts })` after defining the child Bindings and parent policies. Name the result `<Feature>Composition`. It fixes the feature's graph before init, update, and the primary view are authored. Both fields are optional and default to empty collections.

Keep the Definition and Composition as separate named values. Author public Steps and child Bindings through `Settings`, then create `SettingsComposition`. Author init, update, and the primary view through that Composition. The resulting view builder exposes only registered children and Mounts, and update routes the registered child Message wrappers.

Features without children or Mounts still call `makeComposition()`. Creating a Composition records capabilities. It does not build Layers, call init, or start child behavior.

### Produce the completed Block

Call `makeBlock` after the feature's pieces exist. Completion packages the Definition, fixed graph, implementation, and local handler recipe into the value a parent can bind. It does not build a Layer, call init, or start lifecycle work.

::Snippet{name="blockSettings" label="Producing a completed Block"}

Export the completed value as `block`. Parents import the feature namespace and bind `Settings.block` through their own Definition.

`EffectsLayer` contains only the feature's local Foldkit handler recipes. Omit it when the feature has no local handlers; Foldkit uses an empty recipe and still checks completeness. Registered child Bindings contribute their recipes automatically. A handler recipe may require an ordinary HTTP, storage, RPC, clock, or browser Service. Those Service requirements continue through composition until the application root supplies them.

### Export the feature

Export the completed `block` with the feature's public contracts. Keep small features together; split them when separate files make the responsibilities easier to navigate. [Project Organization](/patterns/project-organization) shows compact and split layouts, Composition assembly, and import direction.

Export `block` and the intended structural pieces from the feature barrel. Export the feature as a namespace from the parent barrel. The namespace supplies context for `Settings.Model`, `Settings.Message`, and `Settings.OutMessage.match`:

::Snippet{name="blockFeatureExports" label="Exporting a completed feature"}

## Bind a Child {#embedding}

Call the parent Definition's `bindChild` method with the completed child Block. The resulting Binding belongs to the parent because it describes parent decisions: where the child Model lives, how child Messages enter the parent, and how the parent responds to child OutMessages.

::Snippet{name="blockProfile" label="Binding a required child"}

For the common case, store the child in an exact required Struct field and pass that field name. Here, Profile stores Settings under `settings`. Use `parentMessage: Message.GotSettingsMessage` when the wrapper contains only `{ message }`. Foldkit constructs that parent Message for every child Message, including Command results and lifecycle emissions.

`bindChild` creates passive configuration. The example registers `SettingsBinding` in `ApplicationComposition.childBindings` so the parent update and view can use it and Foldkit can collect the child's handlers and lifecycle declarations. The same Binding routes child Messages, validates embedded views, collects handler recipes and lifecycle definitions, and assembles child startup. Nothing has run yet.

### Route child Messages {#fold-child}

The parent Composition routes a canonical unkeyed wrapper declared with `parentMessage` through the Binding automatically when the child update has only its Model and Message parameters. The parent update callback handles only Message variants that no registered Binding claims. The Binding runs the child's update, writes the next child Model, lifts Commands back to the parent Message type, and applies its OutMessage policy.

::Snippet{name="blockFoldChild" label="Routing a bound child Message"}

Declare parent-driven operations under `expose`, then call them through the Binding. Let the Composition route received child Messages; use named operations for changes the parent initiates. Settings exposes `reset`, so Profile can apply that exact operation:

::Snippet{name="blockProjectedSteps" label="Calling a bound public operation"}

These calls are pure. They produce connected parent Update.Steps whose Model input requires the exact registered graph. A raw domain Model cannot satisfy that input. Return or compose the connected result intact from `makeUpdate` or startup processing; its public type exposes no `.model` or `.commands` before checked execution. A Definition-owned `step` may preserve or wrap a connected Step for later execution. The Composition consumes it while the graph is active and returns the readable next Model, optional Commands, and optional OutMessage. A completed Block's exposed operation is also a checked executor: it accepts the raw Block Model because the completed Block carries its own graph. Ordinary pure Update.Steps remain directly callable. The Runtime executes returned Commands later. Every public operation uses the same Model access, Command lifting, and OutMessage policy as `fold`.

The direction carries meaning. A child Message records something that happened inside the child. An exposed operation is a transition the parent asks the child to perform. Delegating an operation to update can share behavior, but use a truthful Message such as `RequestedClose`; a programmatic close did not click a button. A direct pure Step or shared pure helper is also valid. Do not invent a Message only to route through update. Omit `expose` when the Block exposes no named operations.

Binding operations retain the exact argument types, Command requirements, Binding requirement, and OutMessage behavior of the child operation.

### Initialize the child

The Binding also declares how its child joins the initial parent Model. A required direct child whose initializer takes no arguments needs no `init` property. The basic `SettingsBinding` omits it, so Composition calls the initializer packaged in `Settings.block` and supplies `model.settings` while Profile init returns only `displayName` and `previewTheme`.

Use `init: { args }` when another child needs inputs, or `init: false` when the parent will supply that field itself. This separate Profile contains a ThemePicker whose initializer requires a Theme. The Binding selects the saved theme, while Profile owns the username:

::Snippet{name="blockFoldChildInit" label="Assembling an initial child Model"}

The parent init callback returns only parent-owned fields. Composition calls the selected child initializer, stores its Model, and retains its Commands. See [Init & Flags](/core/init-and-flags#child-initialization) for optional children, keyed occurrences, custom storage, Command order, and initial Steps.

Block init cannot emit an OutMessage. Author it through the Block Composition, then pass that same `init` function to `FeatureComposition.makeBlock`. An optional `boot` helper is an ordinary initial Step listed in the parent's init plan after the child Model exists; Foldkit has no special Runtime boot phase. When an existing domain operation such as `restore` or `open` already describes the transition, expose that Step instead. The same operation may run later from update. Do not create a Message only to trigger startup behavior.

The Binding's `outMessage.fold` policy can handle a fact from that initial Step against the complete parent Model. Parent init cannot forward an OutMessage, so a startup Step used there must finish with a plain update result.

### Embed the child view {#wiring-the-view}

`binding.embedView` supplies the canonical view, the Message wrapper, the composition identity, and the Binding's Mount evidence. Pass its result to `h.block`:

::Snippet{name="blockParentView" label="Embedding a connected child view"}

`slotId` identifies one render position inside the current view boundary. Keep it stable. The parent still supplies the child Model explicitly, which keeps rendering a pure function of the parent Model.

For per-render data owned by the parent, define the child view with the owning `makeView.withInputs<ViewInputs>` helper and pass `viewInputs` through the `embedView` call.

::Snippet{name="blockChildViewInputs" label="Defining a view with inputs"}

::Snippet{name="blockParentViewInputs" label="Embedding a view with inputs"}

The Model owns persistent state. `viewInputs` carries render-only data and callbacks selected by the parent.

## Handle Child Facts with OutMessages {#surfacing-facts}

A child reports facts to its parent through an OutMessage. An exposed operation carries a parent request down; an OutMessage carries a child fact up. For example, Profile may ask Settings to reset, while Settings reports that its theme changed. The parent Binding decides what that reported fact means at this boundary.

Every Binding for a Block with OutMessages must declare an explicit policy.

- `outMessage.fold` handles the fact in the current parent and returns a parent Step.
- `outMessage.forward` translates selected facts into the current Block's own OutMessage.
- A Binding may do both. A derived OutMessage from the local fold takes precedence for that dispatch.

Build an OutMessage fold directly from the child's exhaustive matcher:

::Snippet{name="blockOutMessagePolicy" label="Handling a child OutMessage"}

The parent configures integration policy in its child Binding. That policy executes during the pure child fold or exposed operation. The flow is parent update → child fold or operation → parent OutMessage handling → parent result. Keep a substantial policy in a named parent fold beside that child's Binding, extracting both to `composition/<child>.ts` when the policy becomes substantial. An OutMessage fold receives `FoldContext` when it needs to lift a child Command or compare the transition with parent state from before the child update. `modelBeforeUpdate` is that previous parent Model. The Step returned by the fold still receives the parent Model after the next child Model has been written.

## Complete the Application

Import `defineApplication` from `foldkit` and export the early typed value as `Application`. Its owned methods author root Commands, Steps, and lifecycle declarations. Create `ApplicationComposition` with the root child Bindings and Mounts, author init, update, and the primary view through that Composition, then call its `makeApplication` or `makeElement` in `entry.ts` with explicitly listed implementation pieces and browser inputs. A graphless root still calls `Application.makeComposition()`. An Application cannot be bound as a child.

Root `services.ts` supplies the shared store required by the child handler:

::Snippet{name="blockApplicationServices" label="Application settings provider"}

The entry completes and starts the Application:

::Snippet{name="blockApplicationCompletion" label="Completing the Application"}

The Application Composition carries the child graph. Its completion config supplies root-local handler recipes and lifecycle definitions. Registered child Blocks contribute their own handlers through that graph. `ApplicationLayer` supplies ordinary application Services such as storage or an HTTP client. It does not re-merge each feature's `EffectsLayer`.

`ApplicationComposition.makeApplication` validates the concrete composition before the Runtime starts. It returns another passive value. `application.provide(ApplicationLayer)` records the ordinary Service providers. The Runtime builds those Layers and the selected handler graph when the application starts. Missing handlers, incompatible child Bindings, and unavailable Mount requirements fail before a user interaction.

Server rendering uses the same root:

::Snippet{name="blockServerRender" label="Rendering the Application on the server"}

The server runs init and view. It does not construct browser handler Layers or start lifecycle work.

## Callback Dispatch Boundaries

A child view builds handlers for the child's Message union. A top-level callback in `viewInputs`, such as `toView`, runs in the parent's boundary. Handlers built by that callback reach the parent update directly. Foldkit preserves that boundary when the child invokes the callback.

Keep callbacks at the top level of `viewInputs`. A function nested inside a plain object or array is rejected during view construction because Foldkit cannot infer which boundary should own it.

### Publish child attributes {#child-attributes}

A headless Block may supply behavior while its parent chooses the markup. The child builds attribute groups with `childAttributes` before passing them to `toView`. Each group retains the child's dispatcher and any Mount requirements.

::Snippet{name="blockChildAttributesPublish" label="Publishing child attributes"}

The parent spreads those groups onto its own elements. Child handlers still reach the child update through the Binding's Message wrapper; parent handlers built alongside them reach the parent update.

::Snippet{name="blockChildAttributesConsume" label="Rendering child attributes"}

Block authors call `childAttributes`; consumers spread the supplied groups. Stateless render helpers such as Button already use the caller's builder and Message type, so they do not establish a child boundary or need this wrapper.

### Share parent renderers

Build shared renderers in the parent and pass them as top-level `viewInputs` callbacks. A renderer can embed a sibling Block through that sibling's Binding. Each embed then establishes its own child boundary.

Thread `h` through view functions and render callbacks. Do not store a builder in module state; its dispatch context belongs to the current render boundary.

## Custom Child Message Routes

Custom, keyed, and contextful Bindings declare `fromParentMessage: { parentMessage, args }`. This includes optional or defaulted context parameters: the Binding must explicitly choose whether to supply a value or use the child default. The `args` callback receives the current parent Model and the exact wrapper payload. Return `Option.some(...)` with the arguments after `model` in the Binding's native `fold`, including the key and child update context where required. Return `Option.none()` when the wrapper belongs to a removed, stale, or inactive occurrence; the parent Model remains unchanged. Use `fromParentMessage: false` only when the Composition should not route a parent Message into that Binding.

## Optional Children

An exact `Option<ChildModel>` field declares an optional child without a manual accessor. When the field is `None`:

- connected folds leave the parent Model unchanged;
- that occurrence's Subscription Streams stop;
- its ManagedResource handles release;
- its mounted elements clean up.

When the child reappears, Foldkit creates a new occurrence with new lifecycle scopes. A Command already running for the old occurrence keeps application lifetime, but its result is discarded if that occurrence is no longer current. This preserves Command interruption semantics while preventing a stale result from updating a replacement child.

Use `presentWhen` with a direct field when parent policy controls the whole child's presence independently of storage. The predicate applies to folds, exposed operations, Subscriptions, ManagedResources, and Mounts. A false result behaves like an absent Option field and never clears or replaces the stored child Model.

::Snippet{name="blockPresenceGate" label="Gating a child occurrence"}

Use explicit `read` and `write` for nested storage, tagged parent variants, or a custom write that updates more than the child field. The accessor's `None` result already determines presence, so accessor Bindings do not also take `presentWhen`.

Resource cleanup owns work that requires a live resource handle. See [operations using a handle](/core/managed-resources#operations-using-a-handle) for coordinating that lifetime with a running Command.

Use `subscriptions.when` when only child Streams need additional activation policy while the child remains present:

::Snippet{name="blockSubscriptionGate" label="Gating a child Subscription"}

The gate controls Streams. It does not remove the child or disable its update.

## Coordinate Sibling Blocks

A policy may return a parent Step that calls a registered sibling Binding operation. This supports parent-owned coordination in either direction: one child's OutMessage can initialize, update, or remove another child while preserving both boundaries. Keep reciprocal policies together in the same parent `composition.ts` or `composition/composition.ts`, and defer each sibling call through its policy callback. The callback may close over a Binding declared later in that module. `makeComposition` validates the policy's captured output and confirms that every sibling Binding used by the policy is registered in `childBindings`. Keep the chain synchronous and finite; one policy may invoke another Binding policy before the original update returns.

This parent opens the selected Room when Home reports `SelectedRoom`. When Room later reports `SavedRoom`, the parent marks that Room as saved in Home. The omitted child contracts expose both operations: `RoomBinding.open` returns a pure connected Step, while `HomeBinding.markRoomSaved` returns a connected Step with a persistence Command. Neither operation emits another sibling OutMessage:

::Snippet{name="blockSiblingCoordination" label="Coordinating sibling Blocks in both directions"}

## Keyed Collections {#fold-child-at}

When a parent field is an array of child Models and each child has its stable key in a direct field, pass both field names:

::Snippet{name="blockDirectCollection" label="Binding a direct child collection" class="mb-4"}

This shorthand requires a child Model Schema that exposes Struct fields. Use the general keyed form for union, suspended, or other Schema declarations whose fields are opaque, even when every decoded variant has the same key field.

When each array item wraps the child Model, add `childField`:

::Snippet{name="blockMultipleInstances" label="Binding a wrapped child collection" class="mb-4"}

This form requires an exact parent Struct whose `field` is a required `Schema.Array` of closed Struct wrapper records. `key` must name a required string or finite-number field on each wrapper. `childField` must name a different required field whose Schema has exactly the same decoded shape as the child Model. The child Model itself may be a primitive or union because the wrapper owns the key. Like the direct child array shorthand, this form defaults placement to `field`.

When Foldkit writes a child result, it replaces only `childField` in the matching wrapper. It preserves array order, wrapper metadata, and every unmatched wrapper reference. If the key has been removed, it leaves the array unchanged instead of inserting a wrapper.

Use the general keyed form when the parent or wrapper Schema is opaque, wrappers are a union or use open/index-signature storage such as `Schema.StructWithRest`, the collection is derived from a zero-or-one `Option<RoomInstance>`, or writing a child requires other parent changes. `readAll` enumerates the items, `key` selects stable identity, `read` selects the child Model, and `writeAt` stores its next value.

Each active key gets independent Subscription, ManagedResource, and Mount scopes. `fold`, exposed operations, `init`, and `embedView` take the key first. The key must be a stable string or finite number and must be unique in the current collection.

Removing a key synchronously makes its dispatchers stale and starts lifecycle cleanup. Reusing the same key later creates a new occurrence; results and callbacks captured by the earlier occurrence cannot update it.

Keyed Bindings do not reconcile the collection itself. Application update remains responsible for adding, removing, and ordering items in the parent Model. An explicit `Binding.init({ key, args, toParentModel })` must place exactly one initialized occurrence under the requested key. A child fold or operation cannot change that key. In the wrapped array form, the wrapper key stays fixed while child folds and operations replace only the child field. The parent changes occurrence identity by removing one item and adding another under its own update logic.

A keyed Binding can also represent one optional child whose domain identity changes. Enumerate zero or one item from an `Option`, and store its ID beside the child Model.

For example, in [Typing Terminal](/example-apps/typing-terminal), the Room Binding captures `roomId` in `GotRoomMessage` for views, Command results, and Subscription emissions. Navigating to another room replaces the keyed occurrence and initializes a fresh Room Model. A delayed result keeps its original room ID; the parent does not infer its origin from the current Route. Local child Messages such as `ChangedUserText` need no additional room ID.

Discarding a Command result does not undo its external writes. Scope persistent data by the same domain ID when a completed write from one occurrence must not overwrite another occurrence's data.

## Reading Parent State

The child Model should contain state the child owns. Parent-owned values can cross the boundary in two explicit ways.

The basic Settings Block needs only its Model and Message. When a different child truly needs parent state for each transition, declare that context in the child's update signature and supply it through the Binding's Message route. This separate AccountSettings Block records which current user changed the theme:

::Snippet{name="blockParentStateInUpdate" label="Parent context in child update" class="mb-4"}

Pass render-only values through `viewInputs`:

::Snippet{name="blockParentStateInView" label="Parent state through view inputs" class="mb-4"}

If a value must survive independently or drive future child transitions, put it in the child Model through a child-owned Step.

## Reflect External State {#reflecting-external-state}

Sometimes another source is authoritative: the URL may own filter bounds, or a form library may own the current field value. A child can expose a pure `reflect*` helper that returns only its next Model. The parent uses it while handling the source's Message.

::Snippet{name="blockReflectExternalState" label="Reflecting URL state into a child"}

Use reflection only for silent synchronization. If the transition should emit Commands or an OutMessage, expose a public Step and call it through the Binding.

## Select a Handler Recipe {#select-a-local-handler-recipe}

The canonical `block` includes the feature's attached handlers. Most tests should keep them and replace their underlying service Layers. This exercises the same mapping, retry, error, and Message policy as production.

When a host intentionally replaces the feature's handlers as a group, call `replaceEffectsLayer` before connecting it:

::Snippet{name="blockEffectsLayerSelection" label="Selecting a feature handler recipe"}

Use the original definitions' `toLayer` methods so the alternate providers retain the same contracts and runtime identities. The selected recipe replaces the feature's local recipe and retains its child recipes. The unselected recipe is never built.

Whole-handler replacement is useful for a host-owned feature contract, a deliberately simulated demo environment, or focused Runtime orchestration tests. It is a secondary seam; service replacement is the usual application-testing boundary.

## Generic Blocks

A reusable factory can refine a completed Block with a Schema while sharing one identity and one local handler recipe. For this specialized case, `Block.define('Combobox')` establishes the identity and primitive methods before the single/multi and generic item contracts exist. Its `.define({ Model, Message, OutMessage })` method then establishes each typed contract under that same identity. Ordinary features use the two-argument form.

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

Expose a named operation under `expose` and call it through the Binding:

::Snippet{name="blockDelegateViaHelper" label="✅ Resetting child state through a connected Step"}

This preserves invariants, Commands, OutMessages, effect requirements, and the child's freedom to change its Model shape.

## Boundary Identity and Model Identity {#boundary-id-and-model-identity}

A Block Definition identifies a reusable feature. A Binding's placement identifies that one Binding in its parent's composition graph. `slotId` identifies one render position, and a keyed Binding's key identifies one dynamic occurrence under the Binding. These values serve different jobs and should all remain stable.

Register each repeated Binding once in the parent's Composition. This Chat parent connects two distinct Composer fields through two Bindings:

::Snippet{name="blockRegisterChildren" label="Registering repeated child Bindings"}

Every field shorthand defaults placement to `field`, including static children, optional children, direct child arrays, and wrapped child arrays. Static accessor and general `readAll` keyed configs default to the child Block ID. A direct `Option` field keeps the same placement whether it contains `Some` or `None`.

Set `placement` only when a default would collide with a sibling Binding or when the graph deliberately needs another stable identity. For example, two accessor Bindings of the same Composer Block both default to `Composer`, so the second needs another placement:

::Snippet{name="blockStaticPlacements" label="Resolving an accessor placement collision"}

The Binding may read a same-named Model field, another field, or custom storage. The child Model may also have its own domain ID. Foldkit does not infer graph placement from either storage or domain identity. Foldkit validates direct storage from the decoded Schema shape. Reuse the same Schema instance when the child Model uses an opaque declaration, or use explicit `read` and `write` for custom storage.

## Debugging in DevTools

Name wrapper Messages `Got<Child>Message`. DevTools uses that convention to group nested Message paths. Effect names come from the derived composition path, so repeated placements and keyed occurrences remain distinguishable while local definitions keep short names.

## API

### Block.define

`Block.define(id, { Model, Message, OutMessage? })` creates a local identity and typed effect, Step, lifecycle, and child Binding authoring methods. `id` is a nonempty segment without `/` or `::`. Name the returned value `<Id>`, such as `Settings` for the ID `Settings`. Name the result of `makeComposition({ mounts?, childBindings? })` `<Id>Composition`; it owns init, update, the primary view, and completion for that fixed graph.

For shared definitions specialized by a generic factory, `Block.define(id)` supplies the primitive methods and `.define(contracts)` establishes each later typed contract. Both forms are passive configuration.

### Feature.makeComposition

`Feature.makeComposition({ childBindings?, mounts? })` checks the composition graph and returns `FeatureComposition`. Omitted child Bindings and Mounts default to empty collections without granting their capabilities.

### FeatureComposition.makeBlock

`FeatureComposition.makeBlock({ init, update, view?, expose?, subscriptions?, managedResources?, EffectsLayer?, hostHandlers? })` checks and returns the passive completed Block. `EffectsLayer` may require ordinary Services supplied by `application.provide(ApplicationLayer)`. `hostHandlers` explicitly declares contracts left to the host. Complete those Blocks with their own `provideHandlers(...)` before binding them into a runnable application; final Application completion rejects unresolved child handlers.

### Parent.bindChild

`Parent.bindChild(block, config)` creates one static, optional, or keyed Binding in the established parent Model and Message context. Use `field` for an exact direct Struct field containing the child Model or `Option<ChildModel>`; `presentWhen` can add whole-child presence policy to that direct form. Use explicit `read`/`write` for custom access. Supply exactly one outgoing mapping with `parentMessage` or `toParentMessage`. A canonical unkeyed `parentMessage` mapping also supplies the default incoming route when child update has no context parameters. Custom, keyed, or contextful delivery declares `fromParentMessage` with the exact parent Message constructor and a callback that returns the native fold arguments in `Option`. Every field shorthand defaults placement to `field`; static accessor and general keyed configs default to the child Block ID. Use an explicit placement only to resolve a sibling default collision or retain a deliberately different stable graph identity. `subscriptions.when` gates only Streams. OutMessage handling is parent policy.

### Feature.step

`Feature.step(producer)` authors a pure operation over the child Model. Its producer may return an owned update result, a connected Step, or a Binding initialization recipe. The helper preserves or wraps a connected value until a Composition or completed exposed operation interprets it under the registered graph. It infers the operation's arguments, result Messages, Command requirements, and Binding requirements. Ordinary pure Steps remain directly callable. Select public operations in the completed Block's `expose` record; internal Steps need not be exposed.

### binding.fold

`binding.fold(model, message, ...context)` forwards a received child Message through the child update and the Binding's policies. Its Model input requires the graph capability for that exact Binding, so a typed call with a raw domain Model fails. Return its opaque connected result intact from the owning Composition's `makeUpdate` callback; no `.model` or `.commands` fields are available before checked execution. The Composition also supplies and consumes this result while routing a claimed wrapper Message. Parents import the child Message Schema to declare their wrapper Message, but should invoke a named operation when initiating a change.

### Exposed Binding operations

A declared operation such as `clearSelection` becomes `binding.clearSelection(...args)`. It returns a connected parent Update.Step through the same Model access, Command lifting, resource access, and OutMessage policy as `fold`. Return or compose its opaque result intact after applying it to the contextual Model inside `makeUpdate`, list the Step in Composition startup, or return it from the parent's `step` producer. Typed calls with a raw Model fail the graph-input check, and the opaque result cannot be narrowed to a useful `{ model }` return. TypeScript can still erase a function result when assigning it to a method that returns `void`; outside the exact graph, invoking that erased method only constructs and discards passive configuration and executes no child work. A completed `block.expose.clearSelection(model, ...args)` is different: it is a checked raw-Model executor and returns the readable executed result. A keyed Binding takes the occurrence key before the operation arguments. Operation names cannot collide with Binding members such as `fold`, `init`, or `embedView`.

### binding.init

`binding.init({ key?, args, toParentModel, commands? })` returns a passive, noncallable initialization recipe. `key` is required for a keyed Binding, `args` is the exact child init tuple, and `toParentModel` receives the initialized child and constructs the complete parent Model. Return the recipe directly from the owning Composition's `makeInit` or `makeUpdate` callback, or preserve it through the parent's `step` producer. The Composition callbacks interpret it directly; a completed exposed operation interprets a recipe preserved by its Step. The exact graph then produces all lifted child Commands before optional parent Commands. The recipe has no `.model` or `.commands` fields.

### binding.embedView

`binding.embedView({ slotId, model, viewInputs? })` returns the only accepted `h.block` config for that placement. A keyed Binding also requires `key`.

### Block.inspectBinding

`Block.inspectBinding(binding)` exposes the exact Subscriptions, ManagedResources, Mounts, and `EffectsLayer` carried by a static or keyed Binding. Use it when tooling or a lifecycle test must inspect eligibility. Normal parent code uses the Binding's `placement`, `init`, `fold`, `embedView`, and exposed operations; Composition collects the Binding's lifecycle records and handler graph automatically.

::Snippet{name="blockInspectConnection" label="Inspecting Binding lifecycle metadata"}

### block.replaceEffectsLayer

`block.replaceEffectsLayer(recipe)` selects another complete local handler recipe and returns a completed Block with the same state, lifecycle, children, and public operations.

### block.provideHandlers

`block.provideHandlers(layer)` satisfies handler contracts intentionally left for the embedding host. It preserves the original definitions and composes the supplied providers into the selected handler graph.
