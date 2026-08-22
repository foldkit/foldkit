# Submodel

## When to Create a Submodel {#overview}

Use a Submodel when part of the application owns a state machine, not merely a section of markup. A Submodel has its own Model, Message, update, view, and Commands. Its parent stores the child Model, routes child Messages, and decides what to do with facts that cross the boundary.

Two needs commonly create that boundary:

- **Encapsulation:** A reusable component owns interaction state, keyboard behavior, focus, or accessibility wiring that consumers should not manage. Stateful [Foldkit UI Submodels](/ui/overview) such as `Dialog`, `Menu`, and `Listbox` use this shape.
- **Decomposition:** A feature area such as Settings or Profile owns enough state and Messages that separating its update loop makes the application easier to navigate.

Both use the same contract. Internal state stays behind the boundary, and values crossing it have named roles. A `Listbox` can report that an item was selected without exposing its highlight index or focus bookkeeping. A feature Submodel can [read shared parent state](#reading-parent-state) and [surface domain facts](#surfacing-facts) without taking ownership of the whole application.

:::Info{label='The word "boundary"'}
Each `h.submodel` call creates a runtime boundary identified by `slotId`. When the child dispatches a Message, `toParentMessage` wraps it in the parent's Message type. Nested Submodels repeat that process at every level until the Message reaches the root update.
:::

:::Info{label="The restaurant analogy"}
A Submodel is one station in the restaurant. The station owns its work and internal order state. The head waiter routes work to it and responds to the facts it reports without directing each step inside the station.
:::

:::Info{label="When a view function is enough"}
If a section only renders parent state and owns no Messages or update logic, make it a view function. A reusable card that receives a title and content does not need a Submodel.
:::

## The Child Submodel {#child-submodel}

A child Submodel does not know which parent embeds it. This Settings Submodel owns its state and handles its Messages without importing the root Model or Message.

::Snippet{name="submodelChildModule" label="Submodel"}

## Embedding the Submodel {#embedding}

The parent has three jobs: embed the child’s Model, wrap its Messages, and delegate to its update.

### Embedding the Model

The child’s Model becomes a field in the parent’s Model:

::Snippet{name="submodelParentModel" label="parent model"}

### Never Bypass the Child’s Update {#never-bypass-the-update}

The parent stores the child Model, but the child still owns it. Do not use [evo](/best-practices/immutability#immutable-updates) to change fields inside that slice from the parent.

::Snippet{name="submodelDirectEvoAntipattern" label="antipattern"}

For a parent-initiated change, export a helper from the child and fold that helper with `Update.foldChild`. The parent can call `Settings.setTheme` without importing the internal `ChangedTheme` constructor.

::Snippet{name="submodelDelegateViaHelper" label="helper delegation"}

Stateful Foldkit UI components expose the same kind of entry point. For example: `Popover.close` and a Listbox instance's `selectItem` helper run the component's update without exposing its internal Message constructors.

Messages produced by the child take the regular wrapper path described below. Helpers cover the opposite direction, when the parent needs to initiate a child transition.

Bypassing update creates three problems:

- The transition bypasses invariants enforced by the child's update.
- Commands and OutMessages that the child's update would return are skipped.
- A later change to the child Model can leave the parent writing obsolete fields.

### Wrapping Messages

Every Message eventually reaches the root update. Each parent therefore declares a wrapper Message for the child Message type. Name it with the `Got*Message` convention, such as `GotSettingsMessage`.

::Snippet{name="submodelWrapperMessage" label="wrapper message"}

:::Warning{label="DevTools expects this naming convention"}
The Foldkit DevTools use the `Got*Message` pattern to power the Submodel filter, which lets you scope DevTools Messages to a chosen Submodel. If your wrapper Messages don’t follow this naming convention, they won’t appear in the list of filterable Submodel Messages.
:::

A wrapper carries routing information only. It holds the child `message` and, for repeated instances, an identifier such as `entryId`. Domain data belongs inside the child Message that uses it.

### Folding Update with Update.foldChild {#fold-child}

`Update.foldChild` is the update half of embedding a Submodel. Its configuration tells Foldkit how to:

- run the child update;
- read and write the child Model;
- wrap result Messages from child Commands.

The resulting fold reads the child, runs its update, writes it back, and lifts its Commands through `toParentMessage`.

::Snippet{name="submodelFoldChild" label="foldChild"}

`read` returns an `Option` because a routed page or keyed child may no longer exist when its Message arrives. `None` makes the fold a no-op. An always-present child returns `Option.some(model.settings)`.

The fold is dual. `foldSettings(model, message)` runs it immediately. `foldSettings(message)` returns an `Update.Step` for `Update.combine`. Close over per-dispatch context in the `update` field, and apply route gates before calling the fold.

Use `Update.foldChildStep` for an entry point that takes only the child Model, such as `Dialog.close`. It accepts the same boundary fields and returns an `Update.Step` directly. When the parent is itself a Submodel, add `toParentOutMessage` and the fold returns an `Update.StepWithOutMessage`.

### Wiring the View with h.submodel {#wiring-the-view}

Define the child view with `Submodel.defineView<Model, Message>`. It receives the child Model and a builder for child Messages.

`defineView` brands the function with its child Model and Message types. The parent can then embed it without repeating those types, and handlers inside the child accept only child Messages.

::Snippet{name="submodelChildView" label="child view"}

The parent passes four required fields to `h.submodel`:

- `slotId` identifies this position under the current boundary.
- `model` supplies the child Model.
- `view` supplies the branded child view.
- `toParentMessage` wraps a child Message for the parent.

::Snippet{name="submodelParentView" label="parent view"}

Any parent with the required Model and wrapper can embed the same `Settings.view`.

### Per-render View Inputs

Use `ViewInputs` for parent-owned data the child needs only while rendering. A Listbox may need items and an item renderer, while its Model owns highlight and selection state.

Pass `ViewInputs` as the third type parameter to `defineView`. The view then receives `(model, viewInputs, h)`.

::Snippet{name="submodelChildViewInputs" label="child view with view inputs"}

The parent supplies `viewInputs` at the embed site.

::Snippet{name="submodelParentViewInputs" label="parent view with view inputs"}

Keep state in the child Model and per-render configuration in `viewInputs`. The child changes its Model through update. The parent rebuilds `viewInputs` on each render.

A top-level slot callback such as `toView` lets the parent choose markup while the child supplies state and attributes. Foldkit runs top-level `viewInputs` functions in the parent's boundary. A handler the parent builds inside the callback therefore dispatches a parent Message. [childAttributes](#child-attributes) handles the opposite case, when child-owned attributes cross into that markup.

:::Warning{label="Keep slot callbacks at the top level"}
Functions nested inside an object or array in `viewInputs` throw when Foldkit builds the view. The error names the path, such as `viewInputs.config.onSubmit`. Move the function to the top level so Foldkit can run it in the parent's boundary.
:::

## Boundary Id and Model Identity

`slotId` identifies a rendered position, not a Model value. Every `h.submodel` call under one parent boundary needs a distinct `slotId`, even when two positions render the same child Model.

For fixed positions, name the position: `'desktop-sidebar'` and `'mobile-sidebar'`. For a list, use the stable item identifier because each item occupies its own position.

Foldkit throws while building the view when sibling boundaries reuse a `slotId`.

## Multiple Instances

A parent can hold a fixed or dynamic number of child instances.

For a fixed set, give each child its own Model field and `slotId`. For a dynamic set, store the children in an array. Use the same stable identifier for the row key, `slotId`, and wrapper Message.

::Snippet{name="submodelMultipleInstances" label="multiple instances snippet" class="mb-4"}

`foldApplicant(entryId)` reads and writes only the matching child. When the child no longer exists, `read` returns `None` and a late Message becomes a no-op. The [job-application example](/example-apps/job-application) uses this shape for repeated education and work-history entries.

Start with an array. If profiling shows that finding and replacing a child is expensive, use a `HashMap` keyed by the same identifier. `Update.foldChild` still works because `HashMap.get` already returns an `Option`.

## Memoization Across Submodel Boundaries {#memoization}

By default, a parent render runs each child view again. If profiling finds repeated work in a long list or expensive child view, place the embed site behind `createKeyedLazy` from `foldkit/html`.

Foldkit keeps the boundary registration alive across cache hits and removes it when the VNode leaves the tree. Key the lazy view with the same stable identifier used by `slotId`.

The [View Memoization](/core/view-memoization) page covers cache identity, limits, and measurement.

## Reading Parent State

Do not copy shared parent state into a child Model merely so the child can read it. Choose the boundary based on when the child needs the value:

- When a child view needs to render state that lives in the parent Model, thread it through `viewInputs` on `h.submodel`.
- When a child update needs context from the parent, add a third `context` argument to the child’s update.

The parent remains the single source of truth in both cases.

### Passing Parent State to a Child Submodel’s view {#parent-state-in-view}

Pass parent state through `viewInputs` when the child needs it for rendering. The parent supplies the current value on every render.

::Snippet{name="submodelParentStateInView" label="snippet" class="mb-4"}

### Providing Parent State to a Child Submodel’s update {#parent-state-in-update}

Add a third `context` argument when child update needs the current parent value while processing a Message. Close over that value when constructing the fold.

::Snippet{name="submodelParentStateInUpdate" label="snippet" class="mb-4"}

The update stays pure because the context is an explicit input. Constructing `foldSettings(model.currentUser)` for each dispatch gives the child the current user without storing a second copy.

Context does not notify the child when a value changes. If the child must react to that change, expose an `inform*` helper and fold it from the parent handler that observed the change. See [Informing Submodels](/patterns/informing-submodels).

## Surfacing Facts to the Parent {#surfacing-facts}

Wrapper Messages route child work back into the child update. An OutMessage reports a fact the parent may need to act on, such as a committed date, selected tab, or completed login.

The child update can include an OutMessage in its optional `outMessage` field. The child describes what happened, and the parent decides the consequence. A Login Submodel can emit `SucceededLogin` without knowing how the root stores a session or changes the URL.

### Defining OutMessages {#defining-out-messages}

Define OutMessages beside the child Message. Name them as past-tense facts: `SucceededLogin`, not `TransitionToLoggedIn`; `RequestedLogout`, not `DoLogout`.

::Snippet{name="outMessageDefinition" label="OutMessage definition"}

### Emitting from the Child

The child update returns its Model, optional Commands, and an optional OutMessage. Most branches omit `outMessage`. A branch includes it only when it has a fact to surface.

::Snippet{name="outMessageChildUpdate" label="child update"}

`SubmittedLoginForm` starts authentication but has no result to report. `SucceededAuthenticate` emits `SucceededLogin({ sessionId })` after the Command completes.

### Handling in the Parent

Handle the OutMessage through `foldOutMessage` on [Update.foldChild](#fold-child). Bind the fold as a standalone `fold<Child>OutMessage` value and match on every OutMessage tag. The returned `Update.Step` receives the parent Model after the updated child has been written back.

::Snippet{name="outMessageFoldChild" label="foldChild with foldOutMessage"}

The fold appends the Step's Commands after the child's lifted Commands. If the Step returns a child Command, use `liftCommand` or `liftCommands` from `Update.FoldContext`. The lifter wraps the Command's result Message with the same `toParentMessage` used by the child fold.

In this example, only the parent knows the redirect Route for `Login.SendMagicLink`. The child emits `RequestedMagicLink`, and the parent fills in the Route while keeping the Command result inside the Login boundary.

::Snippet{name="outMessageFoldContext" label="foldOutMessage with FoldContext"}

[Update.foldChildStep](#fold-child) supplies the same fold context for no-argument child entry points and accepts the same `toParentOutMessage` lift when the parent is itself a Submodel.

A parent that is itself a Submodel adds `toParentOutMessage`. Match the child OutMessage and return the parent OutMessage when the fact should continue upward, or `undefined` when it stops at that level. The [Auth example](/example-apps/auth) carries a successful login through two Submodel levels to the root.

## Reflecting External State

OutMessages move facts from child to parent. A `reflect*` helper handles the inbound direction, when an external source such as the URL, restored storage, or a sibling field requires the child to conform.

A `reflect*` helper returns the child Model directly. It does not return Commands or an OutMessage. The external value is already the source of truth, so emitting it back could create a write loop.

Define reflect helpers with `Function.dual` so they work point-free in [evo](/best-practices/immutability#immutable-updates). Here the URL owns the price range, and the parent reflects that range onto a Slider.

::Snippet{name="submodelReflectExternalState" label="reflect handler"}

Only the owner calls a child's `reflect*` helper. User interactions still go through the child update and may emit OutMessages.

External means outside this child boundary, not outside the application. For example: when a start date changes, the parent can call `reflectMinDate` on the end-date picker. The end-date child did not cause the change, but it must obey the new constraint.

Foldkit UI uses domain verbs such as `selectItem` and `selectDate` for user choices that can emit. Silent inbound setters use the `reflect*` prefix, including Calendar and DatePicker constraints and Slider's `reflectRange`.

## Which Boundary a Handler Dispatches Through {#which-boundary}

An element dispatches through the boundary where it is built. The builder carries that boundary, which is why every view receives `h` as an argument.

Inside a Submodel there are two frames, with opposite defaults:

| Where you build the element                       | Dispatches through        | To change it                                                            |
| ------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- |
| The child’s own view body                         | the **child’s** boundary  | have the parent supply the element through a `viewInputs` slot callback |
| A slot callback the parent passed in `viewInputs` | the **parent’s** boundary | [`childAttributes`](#child-attributes) binds it back to the child       |

The child view normally builds child handlers. A slot callback normally builds parent handlers.

A shared helper may need the parent builder. For example: a copy button inside a documentation Submodel dispatches an app-level Message. Let the parent build that renderer and pass it through a top-level `viewInputs` callback.

::Snippet{name="submodelSharedRenderers" label="shared renderers"}

The callback runs in the parent's boundary, so its Message reaches the parent update without a child wrapper.

Thread `h` through view functions. Never store it in module state. A stored builder can outlive its render boundary and fail when a handler dispatches.

## childAttributes {#child-attributes}

Some Submodels let the parent render the DOM while the child supplies behavior. Tooltip, Dialog, Popover, and selection Submodels publish attribute bundles through a slot callback. The parent chooses the elements and styling.

Those child-built handlers must still dispatch through the child boundary after the parent spreads them onto an element. `childAttributes` preserves that routing.

### The Problem {#child-attributes-the-problem}

Imagine a CommandMenu builds `h.OnClick(OpenedMenu())` but asks the parent to render the button. The click must produce `GotCommandMenuMessage({ message: OpenedMenu() })` for the parent fold.

Without the child dispatcher, the parent-built button would send raw `OpenedMenu()` to the parent update. The child would never receive its own Message.

### How It Works {#child-attributes-how-it-works}

`childAttributes` brands each attribute with the current child dispatcher. When the parent builds an element, its constructor uses the branded dispatcher for those attributes instead of the parent dispatcher.

The child publishes branded attribute groups with the state the slot needs.

::Snippet{name="submodelChildAttributesPublish" label="snippet" class="mb-4"}

The parent consumes that slot data without reading the child Model.

::Snippet{name="submodelChildAttributesConsume" label="snippet" class="mb-4"}

The child `OnClick` uses the carried dispatcher. Parent attributes such as `h.Class` behave normally.

### When to Reach For It {#child-attributes-when-to-reach}

Consumers do not call `childAttributes`. Spread the bundle the Submodel provides.

Authors must wrap every child-owned attribute group before publishing it to a parent slot. Otherwise, handlers route through the parent boundary and skip the child update.

:::Info{label="Render helpers don’t need this"}
Stateless helpers such as `Button` and controlled helpers such as `Checkbox` are not Submodels. Their Messages already belong to the consumer boundary, so they do not use `childAttributes`.
:::

## Testing Submodels

Test child update with Story and child view with Scene. Both accept the same shapes at the child level that they accept at the root.

Use `expectOutMessage` for a child's OutMessage. For an update with context, close over the test context: `(model, message) => Settings.update(model, message, { currentUser })`.

Test the parent when the behavior crosses the boundary, such as routing a wrapper by id or folding an OutMessage. See [Testing](/testing) for choosing the level.

## Debugging Submodels in DevTools {#debugging-in-devtools}

The `Got*Message` convention powers the Submodel filter in [Foldkit DevTools](/core/devtools). Selecting a child scopes the timeline and Model diffs to that boundary.

Another wrapper name still routes correctly, but DevTools cannot discover it for the filter.

An OutMessage is processed within the parent fold. Any later parent Message appears as its own timeline entry.

## Common Pitfalls

Issues new Submodel users hit, and where to read about the fix:

- **Duplicate `slotId` during view construction:** Two sibling `h.submodel` calls identify the same position. See [Boundary Id and Model Identity](#boundary-id-and-model-identity).
- **Child Message reaches the root but nothing changes:** The parent Message union or update is missing the wrapper variant. See [Wrapping Messages](#wrapping-messages) and [Folding Update](#fold-child).
- **Wrapper missing from the DevTools filter:** The wrapper does not follow the `Got*Message` convention. See [Debugging Submodels](#debugging-in-devtools).
- **Child view sees stale parent state:** Parent state was copied into the child Model. Pass it through `viewInputs` instead. See [Reading Parent State](#reading-parent-state).
- **Child-owned handler uses the parent boundary:** The child published attributes without `childAttributes`. See [childAttributes](#child-attributes).
- **Error names a nested `viewInputs` path:** Move the nested callback to the top level of `viewInputs`.
- **A long child list rerenders slowly:** Profile it before adding `createKeyedLazy`. See [Memoization](#memoization).

## API Reference

### h.submodel {#api-h-submodel}

`h.submodel(config: SubmodelConfig<View>): Html`

Embeds a child Submodel under the current boundary. Creates a runtime boundary holding the embed site’s `slotId` and `toParentMessage`, dispatches Messages from inside the child through the wrap chain to the parent, and deregisters the boundary when the DOM node is destroyed. See [Wiring the View with h.submodel](#wiring-the-view) for usage; see [Boundary Id and Model Identity](#boundary-id-and-model-identity) for `slotId` semantics.

### SubmodelConfig {#api-submodel-config}

The configuration record passed to `h.submodel`.

| Name              | Type                                                          | Default | Description                                                                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slotId`          | `string`                                                      | —       | DOM-slot identity for this embed site under the current boundary. Must be distinct from every other h.submodel slotId under the same parent boundary. For lists, use a per-item id (row.id); for fixed slots, name by position. |
| `model`           | `View extends SubmodelView<infer Model, ...> ? Model : never` | —       | The child Submodel’s slice of the parent Model. Type is inferred from the branded view.                                                                                                                                         |
| `view`            | `SubmodelView<Model, Message, ViewInputs?>`                   | —       | The child’s exported view, branded via Submodel.defineView so the embed site can infer the child’s Message type.                                                                                                                |
| `viewInputs`      | `ViewInputs \| undefined`                                     | —       | Optional per-render data threaded into the view’s second argument. Top-level functions are auto-wrapped to execute in the parent’s boundary; nested functions throw at view-build time.                                         |
| `toParentMessage` | `(message: ChildMessage) => ParentMessage`                    | —       | Lifts each child Message into the parent’s wrapper Message type, typically a closure over the Got\*Message constructor.                                                                                                         |

### Submodel.defineView {#api-define-view}

`Submodel.defineView<Model, Message, ViewInputs = void>(fn): SubmodelView<Model, Message, ViewInputs>`

Brands a view function with its Message type so `h.submodel` can type-check the embed site without a per-call type argument, and types the builder the runtime passes the view as its last parameter. The `<Model, Message>` parameters are required at the definition site; `ViewInputs` is optional and, when supplied, makes the view take a second `viewInputs` argument before the builder. Also exported as `defineView` from `foldkit/html`.

### Submodel.View {#api-submodel-view}

`Submodel.View<Model, Message, ViewInputs = void> = (model, viewInputs, h) => Html`

The branded view type produced by `Submodel.defineView`. Without `ViewInputs` the shape is `(model, h) => Html`. Carries the child’s Message type at the type level. Consumers don’t usually annotate values with this type directly; the brand and `Parameters<View>` carry the inference at the embed site. Also exported as `SubmodelView` from `foldkit/html`.

### childAttributes {#api-child-attributes}

`childAttributes<Attribute>(attributes: ReadonlyArray<Attribute>): ReadonlyArray<ChildAttribute>`

Snapshots the Submodel’s dispatcher at publish time and brands each attribute so handlers route through the Submodel’s boundary when later spread into the consumer’s elements. Called inside a Submodel that publishes attribute bundles to a consumer’s `toView` slot. See [childAttributes](#child-attributes) for the full mechanism.

### ChildAttribute {#api-child-attribute}

`ChildAttribute` is the branded attribute type returned by `childAttributes`. Element constructors (`h.button`, `h.input`, etc.) accept `ChildAttribute` alongside ordinary `Attribute<Message>` values, using the carried dispatcher when present.

With Model, Messages, update, view, Commands, and Submodels in place, you have the full vocabulary for describing a Foldkit app. The next page covers the [Runtime](/core/runtime): the engine that executes Commands, runs Subscriptions, manages Mount and ManagedResource lifecycles, and routes Messages back into update.
