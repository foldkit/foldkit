# Submodel

## Overview

At some point, your app has 30 Messages, a sprawling Model, and an update function that scrolls for days. Splitting the code into files (`model.ts`, `message.ts`, `update.ts`, `view.ts`) is the first move, but it only organizes the code: you still have one Model, one Message union, and one update. When a feature area’s Messages mostly touch its own slice of the Model, and what crosses to the rest of the app shrinks to a few nameable facts, it’s time to decompose the state machine itself into Submodels.

A Submodel is a self-contained Model, Message, update, and Commands: the same pieces you already know, just embedded inside a larger program. A parent embeds the child by reserving a field for its Model, declaring a wrapper Message that carries the child’s Message, and delegating to it in update.

You’ll reach for a Submodel for one of two reasons:

- **Encapsulation.** The boundary is the point. The Submodel packages behavior (its own state, keyboard handling, accessibility wiring) that the parent should never see inside. Every stateful [Foldkit UI Submodel](/ui/overview) (`Dialog`, `Menu`, `Listbox`, etc.) is shipped this way, which is how they hand you their behavior without you having to know how they work inside.
- **Decomposition.** The boundary is an organizational tool. Your own app has grown large enough that splitting feature areas (for example Settings, Dashboard, or Profile) into Submodels keeps things organized. These children aren’t strictly black boxes; they may need to [read parent state](#reading-parent-state) or [surface domain facts back to the parent](#surfacing-facts).

These are two motivations, not two kinds of Submodel. Every Submodel has the same boundary shape: internals stay hidden, and what crosses is narrow and semantic. A `Listbox` reports that an item was selected, never its highlight index or focus bookkeeping. What varies is whose domain crosses the boundary. A UI component owns interaction state foreign to your app’s domain and needs almost nothing from the parent, while a feature-area child owns a slice of your domain, reads shared parent state, and surfaces domain facts.

Either way, you’ll often want [multiple instances](#multiple-instances) of the same Submodel, for example several accordions on a page, each entry in a form with its own internal state, or repeated cards in a wizard. The Submodel is the unit you instantiate.

:::Info{label='The word "boundary"'}
Each `h.submodel` call creates a boundary: a runtime scope holding that embed site’s `slotId` and `toParentMessage`. When the child dispatches a Message, the runtime crosses the boundary, applying `toParentMessage` to lift the Message into the parent’s Message type. Nested Submodels chain boundaries; dispatch walks up through all of them to reach the top-level Message. The term appears throughout this page.
:::

In the restaurant analogy, think of a large restaurant with multiple stations, for example a sushi bar, a grill, or a pastry counter. Each station has its own chef, its own order flow, its own plating. But the head waiter still coordinates: taking the order, routing it to the right station, and combining everything onto the table.

:::Info{label="Compare to React"}
In React, components nest and communicate through props and callbacks. In Foldkit, composition is explicit: the parent embeds the child’s Model, wraps its Messages, and delegates in update. Every message that crosses the boundary is visible in the update function.
:::

:::Info{label="When NOT to use a Submodel"}
If a piece of UI is just a function of parent state with no internal Messages or update logic, write it as an ordinary render function, not a Submodel. The Submodel machinery (wrapper Messages, `defineView` brand, `h.submodel` embedding) is overhead unless the child genuinely owns its own state machine. Stateful Foldkit UI components such as Dialog, Menu, and Listbox are Submodels because they have keyboard handling, focus state, dismissal logic, and animation lifecycles. A reusable card that takes a title and content as props isn’t a Submodel; it’s a render function.
:::

## The Child Submodel {#child-submodel}

A child Submodel has its own Model, Message, update, and Commands. For example, here’s a Settings Submodel for an app’s Settings page:

::Snippet{name="submodelChildModule" label="Submodel"}

Notice that this Submodel has no awareness of its parent. It manages its own state and handles its own Messages in update. This isolation is the point: you can reason about each Submodel independently.

## Embedding the Submodel {#embedding}

The parent has three jobs: embed the child’s Model, wrap its Messages, and delegate to its update.

### Embedding the Model

The child’s Model becomes a field in the parent’s Model:

::Snippet{name="submodelParentModel" label="parent model"}

### Never Bypass the Child’s Update {#never-bypass-the-update}

Having the child’s Model as a field doesn’t give the parent license to reach into it. Every change to the child’s state must go through the child’s update, never through [evo](/best-practices/immutability#immutable-updates) on the child’s slice. Here’s the antipattern:

::Snippet{name="submodelDirectEvoAntipattern" label="antipattern"}

Instead, go through the child’s update. When the parent has its own Message that needs to change child state (for example, a click handler in the parent), the canonical form is to call a helper the child exports. The parent writes `Settings.setTheme(model.settings, "Light")` and never imports `ChangedTheme`. The child’s Message surface stays internal; the helper is the public verb the parent sees. The snippet’s `Command.mapMessages` and `GotSettingsMessage` are covered just below, in [Wrapping Messages](#wrapping-messages) and [Delegating in update](#delegating-in-update):

::Snippet{name="submodelDelegateViaHelper" label="helper delegation"}

This is the same delegation pattern the stateful Foldkit UI components use for parent-initiated operations. `Popover.close` and the `selectItem` carried by a `Listbox.create` instance are helpers a parent calls without ever constructing the child’s Message, so the child can restructure its Messages later without touching any consumer. Each is a thin wrapper over the child’s `update` and returns the same shape that update does. Settings has no OutMessage, so `setTheme` returns `[Model, Commands]`. The UI components [surface facts](#surfacing-facts), so theirs return the `[Model, Commands, Option<OutMessage>]` 3-tuple and emit. When the parent instead needs to conform the child to an external value without emitting, the silent counterpart is the `reflect*` family covered in [Reflecting External State](#reflecting-external-state).

This only applies to parent-initiated changes. For Messages that came from the child via `GotChildMessage` (a toggle dispatched from the user clicking the child’s button, a Command result returning back into the child), you already have the Message; just call `Child.update(model.child, message)` directly. The helper pattern is for the inverse direction: parent code that needs to drive the child.

Three things break when the parent bypasses the child’s update.

First, DevTools never sees the change as a Submodel Message, so it disappears from the Submodel filter and the timeline reads wrong.

Second, any invariant the child’s update was enforcing (for example validation, derived fields, or state-machine transitions) is silently violated. The parent has no way to type-check against the child’s contract.

Third, the bypass becomes a refactor landmine: the moment the child adds a new invariant or restructures its internal state, the parent’s direct write breaks in ways the type system can’t catch.

### Wrapping Messages

To the Foldkit runtime, every Message is top-level. Each Message is processed by your program’s main update function, and routing to a child Submodel is explicit: the parent wraps the child’s Message at the boundary in a Message its own update can process. Use the `Got*Message` prefix: `GotSettingsMessage`, `GotProductsMessage`, etc:

::Snippet{name="submodelWrapperMessage" label="wrapper message"}

:::Warning{label="DevTools expects this naming convention"}
The Foldkit DevTools use the `Got*Message` pattern to power the Submodel filter, which lets you scope DevTools Messages to a chosen Submodel. If your wrapper Messages don’t follow this naming convention, they won’t appear in the list of filterable Submodel Messages.
:::

A wrapper Message carries routing, not payload. Its job is delivery: it holds the inner child Message and, when several instances of the same Submodel are embedded, the per-instance identifier (e.g. `GotEntryMessage({ entryId, message })`). Anything else belongs inside the child Message, where the child’s update can process it. Mixing domain payload into the wrapper smuggles parent-side logic past the child’s boundary, which is exactly the encapsulation breach this whole pattern is designed to prevent.

### Delegating in update

When the parent receives a `GotSettingsMessage`, it unwraps the child Message, calls the child’s update, updates the child’s slice of the Model, and maps the child’s returned Commands back into the parent’s Message type:

::Snippet{name="submodelUpdateDelegation" label="update delegation"}

About the Command mapping: the Submodel’s Commands produce child Messages when they complete, but the Foldkit runtime expects top-level Messages. The child can’t wrap its own Commands because it doesn’t know its parent’s Message type. So the parent uses `Command.mapMessages` to lift every Command in the list, wrapping each result in `GotSettingsMessage`. The helper preserves each Command’s name and args, so DevTools traces still show each Command’s original name.

::Demo{name="map-messages-under-hood"}

### Wiring the View with h.submodel {#wiring-the-view}

The Submodel exports a view defined with `Submodel.defineView<Model, Message>`. The function takes the child’s `model` and the child’s typed builder `h`, and returns `Html`, the same shape a top-level program’s view has.

The `<Model, Message>` type arguments aren’t just annotations: they brand the view, attaching the child’s Message type to the value at the type level. The `h.submodel` call site reads that brand to type-check the embed site without you having to spell it out, and the runtime uses it to type the builder it hands this view, so the handlers built in the child’s body carry exactly the Messages the child’s boundary dispatches. A third optional type parameter, `ViewInputs`, threads per-render data from the parent; the next section covers it.

::Snippet{name="submodelChildView" label="child view"}

The parent embeds the Submodel via `h.submodel`, passing four things:

- `slotId`: a string that uniquely identifies this embed site under the current boundary. For a single instance, a stable name like `'settings'` works; for repeated instances, a per-instance value like `row.id`.
- `model`: the child’s slice of the parent Model.
- `view`: the child’s exported view, branded by `Submodel.defineView` so the embed site can infer the child’s Message type.
- `toParentMessage`: a callback that lifts each child Message into the parent’s wrapper Message.

::Snippet{name="submodelParentView" label="parent view"}

The same `Settings.view` embeds under any parent that supplies a compatible `toParentMessage`. The child has no static dependency on a particular parent.

### Per-render View Inputs

Some Submodels need data from the parent on every render that doesn’t belong in the child’s `model`. A Listbox needs the array of items and a callback that renders each one. A Menu needs the items and the trigger button’s content. None of this is the child’s state. It’s configuration the parent supplies fresh on every render.

For these Submodels, `defineView` takes a third type parameter `ViewInputs`. The view receives `viewInputs` as its second argument, and the builder `h` moves to third position. Here’s a `CommandMenu` Submodel that owns a menu’s open state and selection behavior while the parent supplies the trigger content and the items:

::Snippet{name="submodelChildViewInputs" label="child view with view inputs"}

At the embed site, the parent passes the `viewInputs` alongside `model` and the other fields:

::Snippet{name="submodelParentViewInputs" label="parent view with view inputs"}

The split between `model` and `viewInputs` is load-bearing. `model` is the child’s internal state, owned by the child and mutated only through the child’s `update`. `viewInputs` is per-render configuration, owned by the parent and rebuilt fresh each render. Putting per-render config in the model would force the parent to write update handlers that store its own configuration; putting state in the viewInputs would lose it across renders.

A common pattern is to put a slot callback (often called `toView`) in `viewInputs` so the child hands the parent attribute bundles and lets the parent shape the markup. Functions at the top level of `viewInputs` get auto-wrapped to execute in the parent’s boundary, so any handlers the parent builds inside them (e.g. `h.OnClick(ParentMessage())`) dispatch through the parent’s wrapping chain, not the child’s. See the [childAttributes](#child-attributes) section below for the complementary mechanism: how the child publishes attribute bundles that route back through its own boundary.

:::Warning{label="Keep slot callbacks at the top level"}
Functions nested inside an object or array inside `viewInputs` (e.g. `viewInputs: { config: { onSubmit } }`) throw at view-build time with a path-based error like `viewInputs.config.onSubmit`. The auto-wrap only descends one level, so a nested function would otherwise dispatch through the child’s boundary instead of the parent’s. The check is runtime-only, so a misuse compiles cleanly and surfaces the first time the boundary renders. Lift slot callbacks to the top level of `viewInputs`.
:::

## Boundary Id and Model Identity

The `slotId` you pass to `h.submodel` is **DOM-slot identity, not model identity.** Each `h.submodel` call under the same parent boundary must use a distinct `slotId`, even when two call sites embed the same model.

If you render the same Submodel in two slots (desktop + mobile, master + detail, mirror layouts), give each slot its own id like `'desktop-sidebar'` and `'mobile-sidebar'`, not just `model.id`. For lists, the per-item id (`row.id`) is the right choice because each row IS a different slot.

Defaulting to `model.id` works for the common case of one model rendered in one slot, but silently collides as soon as the model appears twice. The runtime catches the collision with a duplicate-slotId throw at view-build time. The throw is the convention’s safety net; the prevention is naming slot ids by slot from the start.

## Multiple Instances

A parent often embeds several instances of the same Submodel, for example a list of form entries, an array of accordions, or repeated cards on a dashboard. There are two shapes.

For a fixed number of instances, embed each as a separate field on the parent Model with its own `slotId`. `h.submodel({ slotId: 'profile', ... })` and `h.submodel({ slotId: 'preferences', ... })` are two unrelated boundaries, each with its own wrap.

For a dynamic number, hold the instances in an array on the parent Model, iterate it in the view, and route updates back through a wrapper Message that carries a per-instance identifier:

::Snippet{name="submodelMultipleInstances" label="multiple instances snippet" class="mb-4"}

The `slotId` on each `h.submodel` is the per-instance identifier the runtime uses for boundary identity. The same identifier travels with the wrapper Message as `entryId` so the parent’s update can find the matching slice and delegate to `Applicant.update`. See the [job-application example](/example-apps/job-application) for a working version: per-entry education and work-history Submodels, each embedded with its own `entryId`.

## Memoization Across Submodel Boundaries {#memoization}

An `h.submodel` call re-runs the child’s view on every parent render. For a short list of Submodels this is cheap; for a long list (hundreds of rows) or expensive child views, memoize the embed site with `createKeyedLazy` from `foldkit/html`. The keyed lazy compares its deps tuple by `===` and reuses the cached VNode when nothing changed.

Why this works across the Submodel boundary: `h.submodel` is designed so the per-render-fresh `toParentMessage` closure stays out of the cached VNode. The boundary’s wrap is stored in a runtime registry keyed by id, not captured by the VNode itself, so a cache hit preserves the wrap from the previous render. The differ’s destroy hook deregisters the wrap when the DOM node is actually removed, so memoization across boundaries doesn’t leak.

Default: don’t memoize. Reach for `createKeyedLazy` when a profile shows the parent re-renders are doing measurable work.

## Reading Parent State

Decomposition Submodels (Settings, Dashboard, Profile) often share state with their siblings: the current user, the active locale, the session token. Forcing every such child to be fully encapsulated pushes you to duplicate that state into the child Model and keep both copies in sync, which is worse on every axis. Foldkit gives you two precise seams for parent state to reach the child instead:

- When a child view needs to render state that lives in the parent Model, thread it through `viewInputs` on `h.submodel`.
- When a child update needs context from the parent, add a third `context` argument to the child’s update.

Both are typed contracts the child declares and the parent honors.

### Passing Parent State to a Child Submodel’s view {#parent-state-in-view}

Slice the parent state out of the parent Model and pass it through `viewInputs` on `h.submodel`. Because `viewInputs` is rebuilt every render, the child always sees the current value without storing a copy:

::Snippet{name="submodelParentStateInView" label="snippet" class="mb-4"}

The mechanism is the same one [Per-render View Inputs](#per-render-view-inputs) describes; parent state is just one of the things `viewInputs` can carry.

### Providing Parent State to a Child Submodel’s update {#parent-state-in-update}

The child’s update signature grows a third argument: `(model, message, context) => result`. The child declares a `Context` type alongside its other types; the parent assembles the context inline when delegating in its own update handler:

::Snippet{name="submodelParentStateInUpdate" label="snippet" class="mb-4"}

The update stays pure. Same `(model, message, context)` always produces the same result; no hidden state, no time-dependent behavior. The child reads `context.currentUser` at the moment the message is being processed, and because the parent assembles the context fresh on every dispatch, the next call automatically sees any parent changes. Single source of truth, no sync obligation.

A context argument gives the child the current value when update runs. It does not notify the child when that value changes. If the child needs to respond to `currentUser` changing (for example to clear caches or reset a form), the canonical move is for the parent to dispatch a child Message through `GotChildMessage` carrying the new value. Context-arg is for reading current parent state inside an update tick, not for observing parent state over time.

## Surfacing Facts to the Parent {#surfacing-facts}

So far the child only sends its own Messages back through the parent’s wrapper. That covers internal state changes, but it doesn’t tell the parent that something the parent cares about happened: a date was committed, a tab was selected, a menu item was picked. For that, the child’s `update` returns a third element: `Option<OutMessage>` (Effect’s `Option` type for representing a value that may or may not be present). The parent pattern-matches the third element inside `GotChildMessage` and lifts the fact into a domain Message of its own.

Your login Submodel has authenticated the user. Now what? The child can’t transition the root Model to a logged-in state because it only knows about its own Model. And it shouldn’t know about the root Model. That would break the encapsulation that makes Submodels useful in the first place.

The OutMessage shape solves this. The child emits a semantic event: “login succeeded, here’s the session.” The parent decides what to do with it. The child describes what happened; the parent decides the consequences.

:::Info{label="Compare to React"}
In React, you’d pass an `onLoginSuccess` callback as a prop. This works but couples the child to the parent’s interface. In Foldkit, OutMessage keeps the boundary clean: the child emits facts, the parent interprets them.
:::

### Defining OutMessages {#defining-out-messages}

OutMessages live alongside the child’s Message and follow the same naming conventions: past-tense facts describing what happened. `SucceededLogin`, not `TransitionToLoggedIn`. `RequestedLogout`, not `DoLogout`. The child doesn’t know or care what the parent does with the information.

::Snippet{name="outMessageDefinition" label="OutMessage definition"}

### Emitting from the Child

The child’s update function returns a 3-tuple instead of the usual 2-tuple: Model, Commands, and an `Option<OutMessage>`. Most Messages return `Option.none()`. Only the significant “I need to tell the parent something” moments return `Option.some(...)`:

::Snippet{name="outMessageChildUpdate" label="child update"}

The `Option` makes the boundary explicit. `SubmittedLoginForm` fires a Command and returns `Option.none()`: nothing for the parent to act on yet. But when login succeeds, the `SucceededAuthenticate` arm emits `Option.some(SucceededLogin({ sessionId }))`, the signal the parent needs.

### Handling in the Parent

The parent uses `Option.match` on the OutMessage. `onNone` means the child handled it internally: just update the child’s slice of the Model. `onSome` means the child is surfacing something the parent needs to act on:

::Snippet{name="outMessageParentHandle" label="parent handling"}

This is where the power of the boundary shows. When `SucceededLogin` arrives, the parent can do things the child has no knowledge of: transition to a completely different Model state, save the session, redirect the URL. The child stays focused on its domain; the parent handles cross-cutting concerns.

See the [Auth example](/example-apps/auth) for a complete implementation: a login module emits `SucceededLogin` when authentication completes, and the parent transitions to the logged-in state, saves the session, and updates the URL, all triggered by a single OutMessage.

## Reflecting External State

OutMessage is outbound: the user interacts with the child, the child changes, and it surfaces a fact so the parent can act. The child is the source. `reflect*` is the inbound direction. Something outside the child changes (a URL or route, a server push, restored storage, parent state, or a sibling Submodel), and the parent conforms the child to that external value. The external thing is the source.

A `reflect*` helper returns `Model` directly, not the `[Model, Commands, Option<OutMessage>]` tuple the choice-based setters return. The narrower return type makes the contract visible at the call site: a `reflect*` write cannot emit. It is silent on purpose. The external value is already the source of truth, so emitting an OutMessage would echo it back to whatever just set it and risk a write loop.

The helpers are `Function.dual`, so they read point-free inside an [evo](/best-practices/immutability#immutable-updates) callback. The parent reflects URL-owned price bounds onto a Slider from the handler that processes the route change:

::Snippet{name="submodelReflectExternalState" label="reflect handler"}

The child never calls its own `reflect*`. It is the sanctioned way for the owner to write into the child, the complement to the [never-bypass](#never-bypass-the-update) rule: the parent conforms the child to an external value through a helper instead of reaching into the child’s slice with `evo`. The child’s own user interactions still go through its `update` and emit its OutMessage along the choice path.

“Outside” is relative to the child’s boundary, not the app’s. A sibling field changing is outside the child it feeds. A start-date field that updates an end-date picker’s minimum is the canonical case: the parent handles the start-date Message and reflects the new minimum onto the end-date Submodel, which had no part in the change. The [Calendar](/ui/calendar#programmatic-helpers) config setters (`reflectMinDate`, `reflectMaxDate`, `reflectDisabledDates`, `reflectDisabledDaysOfWeek`) are reflect helpers for exactly this.

Across the stateful Foldkit UI components the choice-based setters keep domain verbs (`selectItem`, `selectDate`), and they emit. The `reflect*` family is the uniform name for the silent inbound setter: the `reflectMinDate` / `reflectMaxDate` / `reflectDisabledDates` / `reflectDisabledDaysOfWeek` constraint setters (Calendar, DatePicker), and `reflectRange` (Slider). It is a framework convention any Submodel can adopt; the stateful Foldkit UI components are the canonical adopters.

## Which Boundary a Handler Dispatches Through {#which-boundary}

A handler’s dispatcher is chosen by **where the element is built**, not by the Message it carries. The element constructor reads the boundary off the current render frame. This is why views receive their builder rather than constructing one: `h` arrives typed by the Message universe of the frame that will dispatch its handlers, so where the element is built and what its handlers may carry cannot quietly disagree.

Inside a Submodel there are two frames, with opposite defaults:

| Where you build the element                       | Dispatches through        | To change it                                                            |
| ------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- |
| The child’s own view body                         | the **child’s** boundary  | have the parent supply the element through a `viewInputs` slot callback |
| A slot callback the parent passed in `viewInputs` | the **parent’s** boundary | [`childAttributes`](#child-attributes) binds it back to the child       |

Both defaults are usually what you want. The child’s view body is full of the child’s own Messages, and a parent’s slot callback is full of the parent’s.

The case that bites is a **shared view helper** rendered inside a Submodel: a copy button, an analytics hook, a toast trigger. It builds an app-level Message, so its `h` parameter is typed `HtmlBuilder<AppMessage>`, and the only builder in scope inside the child’s view body is the child’s own. Passing the child’s builder to the helper is a type error at the call site. The fix is structural. Let the parent build it and pass it down:

::Snippet{name="submodelSharedRenderers" label="shared renderers"}

Because the renderer is a function at the top level of `viewInputs`, it runs in the parent’s boundary, so the Message it builds reaches `update` unwrapped no matter how deep the child renders it.

The type tracks where a builder came from, not where it is used. A builder stashed in module state and called from another frame’s render still compiles, and the mismatch surfaces at click time as a boundary error naming the boundary and the Message. Treat `h` as a per-render parameter: thread it, never store it.

## childAttributes {#child-attributes}

Some Submodels (Tooltip, Dialog, Popover, the selection family) hand the consumer **attribute bundles** rather than rendering their own DOM. The consumer spreads those attributes onto their own elements, deciding markup and styling, while the Submodel keeps owning the wiring. The snippets below evolve the CommandMenu from [Per-render View Inputs](#per-render-view-inputs): instead of rendering its own DOM, it publishes attribute bundles plus slot data, and the parent renders the button and the items.

The wiring problem this creates: an attribute like `h.OnClick(OpenedMenu())` is built inside the Submodel’s view (the Submodel’s own boundary) but ends up on an element inside the consumer’s view (the parent’s boundary). The dispatch needs to route through the Submodel’s `toParentMessage`, not the parent’s. `childAttributes` solves this by branding each attribute with the Submodel’s dispatcher at publish time, so element constructors use the right one regardless of where the attribute is spread.

### The Problem {#child-attributes-the-problem}

The CommandMenu’s view builds attributes like `h.OnClick(OpenedMenu())`, where `OpenedMenu` is the Submodel’s own Message. When the click fires, the dispatch must route through the Submodel’s `toParentMessage` wrap so the parent receives `GotCommandMenuMessage({ message: OpenedMenu() })` and delegates back to the child’s update.

But the Submodel doesn’t render its own DOM. It hands attributes to a consumer’s `toView` slot, and the consumer composes them into their own elements. The consumer’s slot runs in the parent’s boundary, not the child’s. If the OnClick attribute were processed at the moment the consumer spread it onto a button, the click would dispatch through the parent’s boundary, bypassing the Submodel’s wrap entirely. The parent would receive a raw `OpenedMenu()` it doesn’t know how to handle.

### How It Works {#child-attributes-how-it-works}

`childAttributes` snapshots the Submodel’s dispatcher at the moment of publishing. Each attribute in the returned array carries that captured dispatcher with it. When the consumer’s element constructor (`h.button`, `h.input`, etc.) sees a branded `ChildAttribute`, it uses the carried dispatcher instead of the current one. The handler ends up wired to the Submodel’s boundary even though the element lives in the parent’s view.

In code, the Submodel’s view publishes branded attribute groups plus the slot data the parent should use: open state and item render data.

::Snippet{name="submodelChildAttributesPublish" label="snippet" class="mb-4"}

And the consumer’s `toView` callback, running in the parent’s boundary, uses that child-provided slot payload without reading inside the child Model:

::Snippet{name="submodelChildAttributesConsume" label="snippet" class="mb-4"}

When the button is clicked, the `OnClick` attribute’s branded dispatcher routes the `OpenedMenu()` message through the Submodel’s `toParentMessage` wrap, producing `GotCommandMenuMessage({ message: OpenedMenu() })` for the parent. The consumer’s own `h.Class` attribute is untouched: it’s a styling attribute with no message wiring.

### When to Reach For It {#child-attributes-when-to-reach}

If you’re consuming a stateful Foldkit UI Submodel, you don’t call `childAttributes` yourself. The Submodel’s view publishes branded attributes; you just spread them.

If you’re authoring your own Submodel and publishing attribute bundles to a consumer’s slot callback, every published attribute group must be wrapped in `childAttributes`. Forgetting this is a quiet bug: handlers can route through the parent’s boundary and the Submodel’s update will never see its own events. Read the published Submodels in `packages/ui/src/` for the canonical pattern.

:::Info{label="Render helpers don’t need this"}
Stateless render helpers like `Button` and `Input`, plus controlled render helpers like `Checkbox`, `Switch`, and `Disclosure` don’t publish via `childAttributes`. They’re not Submodels; their `onClick` or `onInput` or `onToggle` values flow into element constructors in the consumer’s own boundary, which is correct. The boundary wiring only matters when there’s a Submodel boundary to wire through.
:::

## Testing Submodels

A Submodel tests the same way as a top-level program. A two-argument child `update` is a pure function from `(model, message)` to `[Model, Commands]` or `[Model, Commands, Option<OutMessage>]`, so it slots straight into `story`. The child’s view is a pure function too; assert against the rendered VNode through `scene`.

For Submodels that emit OutMessages, assert the third tuple element via `expectOutMessage`. For Submodels with a context-arg `update`, close the context over the two-argument function you pass to `story`: `(model, message) => Settings.update(model, message, { currentUser })`. Each message step carries only a Message, so the context stays fixed for the story run.

The [counters example](/example-apps/counters) has a Story test for the parent’s wrapper-Message routing (`GotCounterMessage` delivers to the right row by `id`, unknown ids are a no-op) and a Scene test for the rendered list. See the [Testing page](/testing) for the full Story and Scene reference.

## Debugging Submodels in DevTools {#debugging-in-devtools}

The `Got*Message` wrapper convention powers the Submodel filter in [Foldkit DevTools](/core/devtools). Pick a Submodel from the filter dropdown and the Message timeline scopes to dispatches that crossed that Submodel’s boundary. Model diffs show only the child’s slice.

If your wrapper Messages don’t follow the `Got*` naming, the filter can’t discover them; the Messages still flow correctly but they won’t appear in the Submodel dropdown. The warning callout under [Wrapping Messages](#wrapping-messages) is the same rule from the DevTools side.

When a Submodel emits an OutMessage, the parent’s `GotChildMessage` handler shows both the wrapper and any domain Message the parent dispatched in response. The full causal chain is visible in the timeline.

## Common Pitfalls

Issues new Submodel users hit, and where to read about the fix:

- **Duplicate slotId thrown at view-build time.** Two `h.submodel` calls under the same parent share a `slotId`. See [Boundary Id and Model Identity](#boundary-id-and-model-identity).
- **Child events not reaching the parent’s update.** The wrapper Message isn’t named `Got*Message`, or the wrapper variant hasn’t been added to the parent’s update. See [Wrapping Messages](#wrapping-messages) and [Delegating in update](#delegating-in-update).
- **Child’s view sees stale parent state.** Parent state was copied into the child Model and forgotten on update. Thread it through `viewInputs` (rebuilt every render) instead. See [Passing Parent State to a Child Submodel’s view](#parent-state-in-view).
- **Handlers dispatched from a slot callback fire in the wrong boundary.** The Submodel published an attribute group without wrapping it in `childAttributes`. See [childAttributes](#child-attributes).
- **View-build error like** `viewInputs.config.onSubmit`. A slot callback was nested inside an object or array in `viewInputs`. Lift it to the top level. See the warning callout under [Per-render View Inputs](#per-render-view-inputs).
- **Long list of Submodels feels slow.** Default is to re-render each row every parent render. See [Memoization Across Submodel Boundaries](#memoization).

These are the mechanical ones. For the boundary itself weakening, where the wiring compiles and the parent still ends up owning state or vocabulary it should not, see [Anti-patterns](/patterns/anti-patterns).

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
