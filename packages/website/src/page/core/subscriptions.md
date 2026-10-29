# Subscriptions

## Ongoing Work with a Model-Driven Lifetime {#overview}

A Subscription describes ongoing work whose lifetime comes from the Model. Each entry maps the Model to a dependency record, then maps those dependencies to a scoped `Stream<Message>`.

### Dependency Changes

#### Restarting the Scope

The first dependency value opens the Stream's initial scope. After every Model update, Foldkit compares the latest dependencies with the previous value. Equivalent dependencies keep the current Stream alive. A change closes its scope, runs any registered `Effect.acquireRelease` finalizers, and opens a fresh scope with the new dependencies.

```diagram
                  Model
                    | modelToDependencies(model)
                    v
               Dependencies
                    |
     +--------------+---------------+
     |                              |
first value                   later value
     |                              |
     |                              v
     |                   compare with previous
     |                              |
     |                 +------------+-----------+
     |                 |                        |
     |              changed                equivalent
     |                 |                        |
     |                 v                        v
     |         close old scope         keep current scope
     |          run finalizers                  |
     |                 |                        |
     +-----------------+                        |
                       v                        |
                open fresh scope                |
                       |                        |
                       +------------+-----------+
                                    v
                         active Stream<Message>
                                    |
                                    v
                                  update
```

#### Event Sources and Scoped DOM State

The Subscription is attached to the Model condition, not to the external source used inside its Stream. A timer, document listener, system theme observer, or `WebSocket` supplies events during that lifetime. Those events flow back into update as Messages.

A Subscription may also maintain scoped DOM state without emitting Messages. During a drag, the production [documentDragStyles](https://github.com/foldkit/foldkit/blob/main/packages/ui/src/internal/documentDragStyles.ts) Stream installs temporary selection and cursor rules in its own `<style>` element and removes that element when the drag ends. Existing document styles are untouched.

### Lifecycle Ownership

Choose the lifecycle primitive by what owns the work:

| Primitive                                  | Lifetime owner                                      | Use it for                                                                                    |
| ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Subscription                               | A dependency record derived from the Model          | Ongoing event streams or scoped work that does not expose a handle                            |
| [Mount](/core/mount)                       | One rendered element                                | Listeners, observers, or imperative work that needs that element                              |
| [ManagedResource](/core/managed-resources) | A Model condition, with a typed handle for Commands | A `WebSocket`, camera stream, or third-party instance that other parts of the program consume |

Before choosing a ManagedResource, ask: which Command or other consumer needs to read its handle? Cleanup alone does not require a ManagedResource. A Subscription Scope can install a listener and remove it when the Model no longer needs it. Use `messages: []` and a `Stream<never>` when that work emits no Messages.

For example, an unsaved-draft warning can use a Subscription that installs a `beforeunload` listener while drafts exist. Cancel the event synchronously in the listener; a Message followed by a Command would run too late. This warns before leaving and does not save the draft. There is no shared handle to expose or acquisition result to report.

## Auto-Counter Example

Commands describe one-shot work that produces one result. Subscriptions describe ongoing work. In the counter, a Subscription emits `Ticked` once per second while `isAutoCounting` is `true` and stops when it becomes `false`.

::Snippet{name="counterAutoCount" label="Auto-counting Subscription"}

### Defining Entries

`FeatureDefinition.makeSubscriptions` receives a function that builds a named record of entries for the Block. The counter uses a `when` predicate to run its timer only while `isAutoCounting` is `true`. An entry whose Stream also needs Model values takes three arguments:

- A stable handler name for the Layer requirement.
- A field map defining the dependency Schema, in the same shape passed to `Schema.Struct`.
- A config containing `messages`, `modelToDependencies`, and the `handler` generator that returns the Stream function. `messages` lists the Message Schemas that the handler Stream may emit. Use `messages: []` for scoped work that emits no Messages.

Create one registry for all Subscriptions owned by the Block. Add entries to that registry as the feature grows. When a handler implementation becomes substantial, extract its Stream construction into a focused helper while keeping the entry in the owning registry. A child Block is a distinct owner and keeps its own registry.

If an adapter already exposes a dependency Struct, pass its `.fields` as the second argument: `dependenciesSchema.fields`. Passing the Struct itself produces a field-map error, often wrapped in `No overload matches this call`.

`modelToDependencies` extracts the values the Stream needs. The `handler` generator constructs the Stream factory, and the owned registry’s `subscriptions.layer` supplies its attached handlers to the application. Foldkit compares the extracted record structurally by default, so unrelated Model updates do not restart the Stream.

When `isAutoCounting` changes to `true`, the new Stream starts ticking. When it changes back to `false`, the active scope closes and the timer stops.

### Gating an Entry on the Model

The optional `when` predicate decides whether the entry runs for the current Model. While it returns `false`, Foldkit runs no Stream and skips `modelToDependencies`. Opening the gate starts the Stream with current dependencies. Closing it interrupts the Stream and closes its scope, even when `keepAliveEquivalence` would otherwise retain it.

The gate controls Stream lifetime. Attached handler Layers still build at Runtime startup, so their constructor errors and Service requirements remain part of the Block's contract while the gate is closed.

Use `when` for conditions on the owning Model and Binding `subscriptions.when` for parent policy. [`Subscription.expectActive`](/testing/scene#subscription-activity) and `expectInactive` can inspect these gates. Conditions inside the Stream, such as `Stream.when` or a branch returning `Stream.empty`, remain valid for Stream-local decisions but are not visible to activity assertions.

### Completing the Block

Include the record when completing its owning Block. The completed value carries the Subscription registrations and their handler recipes through parent Bindings to the root. Assemble `ApplicationBlock` with the same Block API; the entry supplies it and the container to `Program.make`, calls `program.provide(layer)` when shared Services remain, and then starts the Program:

::Snippet{name="counterEntryWithSubscriptions" label="Subscription application entry"}

The [websocket-chat example](/example-apps/websocket-chat) shows a more involved event stream. [Typing Terminal](https://typingterminal.com) and its [source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game) show Subscriptions inside a complete application.

## Subscription Handler Contracts

### Declared Messages

The declared Message Schemas constrain the Stream returned by both the attached handler and an external `toLayer` implementation. Emitting an undeclared Message is a type error. Scene uses these Schemas to validate `Subscription.emit(entry, message)` against the composed source, including its generated delivery through parents. An empty declaration requires a `Stream<never>` for work that emits no Messages.

An external generic Stream helper can infer its result Message from one callback and then reject a different, valid variant returned by another callback. If the error compares two declared Message variants, inspect the helper's callback inference. Give the callback that determines the generic result an explicit return type for the union this entry declares. Use the `Message` alias when the entry declares the full Message union. The entry's `messages` declaration still checks every variant the resulting Stream may emit.

### Handler Construction and Layers

Each entry, such as `subscriptions.gameClockTicks`, is an individual owned definition. Its record key identifies the local runtime entry, while its handler name becomes part of the owned Layer requirement that assembly must satisfy. Several child Bindings can carry one definition into different placements while retaining separate Stream scopes. Naming also gives tools a declared identity to display; Subscription lifecycle events in DevTools are follow-up work. An entry with `handler` exposes `.layer`; include that recipe in the local `EffectsLayer` passed to `FeatureComposition.prepareBlock`.

When every entry has an attached handler, the owned registry also exposes `subscriptions.layer`. When Subscription declarations are split from Block assembly, that module exports the Block's one registry. Compose `Feature.subscriptions.layer` with other local providers in `EffectsLayer`. When the registry supplies every local handler, pass `EffectsLayer: subscriptions.layer` directly to `FeatureComposition.prepareBlock`. The registry Layer merges the recipes passively; the Runtime constructs them later. An empty record supplies an empty Layer. The registry Layer preserves each handler's Service requirements and constructor errors.

The registry Layer is unavailable if any entry leaves its handler to the host. Supply those contracts explicitly through `hostHandlers` and `provideHandlers`. Individual `subscriptions.entry.layer` recipes remain available for intentionally selective assembly. The entry key `layer` is reserved; the registry recipe is metadata and never becomes a running Subscription or a Scene emission source.

`Subscription.aggregate` remains available at graph, adapter, and test boundaries that need to join independent Subscription records. Do not use it to recombine several registries for one Block; declare those entries together in that Block's registry.

The Runtime runs the attached handler generator once while building the application Layer and obtains a `dependencies => Stream` function. Return that function directly when construction needs no services. The constructor must not capture the current dependency record; Foldkit passes that record when starting each Stream. A dependency change restarts the Stream scope without reconstructing the handler or its provider. Scoped resources owned by the application Layer release when the runtime stops.

### External Host Handlers

Omit `handler` for a Subscription contract whose Stream belongs to an external host. Such an entry has no `.layer`. List it in the completed Block's `hostHandlers`, then let the host call `block.provideHandlers(entry.toLayer(...))` before connecting the feature. A focused orchestration test can use the same seam, though ordinary execution tests keep the attached handler and replace its underlying service Layers.

### Execution Testing

In a whole-application execution test, retain that real Stream handler and replace its upstream capabilities. A fake clock, event source, RPC transport, or browser service can make emissions deterministic while the real Subscription still transforms them and Foldkit still applies its Model-driven start, restart, and stop behavior.

### Handler Requirements and Identity

Subscription names are local to their named Block. Two features can both declare `GameClockTicks`; their owners keep the definitions distinct. Names must be unique within one owner. Composition derives a path for each Binding placement, so repeated uses of one completed child share its handler recipe while retaining separate Stream scopes.

A Subscription handler requirement contains its owned name, decoded dependency record, and declared Message union. `FeatureComposition.prepareBlock` checks that each local requirement is supplied by `EffectsLayer` or declared in `hostHandlers`; `block.provideHandlers` checks an external provider against those declared contracts. Use `Subscription.HandlerOf<typeof subscriptions.gameClockTicks>` for an explicit requirement; the expanded form is `Subscription.Handler<Name, Dependencies, DeclaredMessage>`, with all three arguments required.

Definitions created by different named Blocks receive different owned names even when their local names and protocols match. Each definition also retains a private runtime identity. An external implementation should use the declared entry's `toLayer` so it keeps that identity.

### Naming a Subscription

A Subscription definition describes a scoped Stream. Its record key identifies the registration that Foldkit starts and stops; its handler name identifies the Stream or scoped behavior a Layer supplies. Keep them parallel: in the counter example, `gameClockTicks` is the record key, `GameClockTicks` is the handler name, and `subscriptions.gameClockTicks.layer` is its attached Layer recipe. A leaf Subscription module exports its owned `subscriptions` registry. The owning Block or layer module uses that registry when it assembles the feature's handlers.

Name the events or scoped behavior the definition supplies, such as `KeyboardPresses`, `SystemThemeChanges`, `GameClockTicks`, or `DragSelectionStyles`. `KeyboardPresses` identifies the events produced from keyboard input; `GameClockTicks` identifies the events produced by a timer. The Model dependencies determine when the Stream is active and when its scope restarts; they do not need to appear in the handler name.

Unlike a Command, a Subscription may emit many Messages or maintain scoped work without emitting any. Its handler name does not need to mirror a single result Message or follow the Command imperative naming convention. Compose the owned registry’s `subscriptions.layer` in `EffectsLayer` when every entry has an attached handler. Use an individual entry’s `.layer` for selective assembly. Create a named individual provider only when it is intentionally public or independently reused outside that bundle's assembly.

## Animation Frames

`Dom.animationFrameTicks` is a Stream tied to the browser's paint clock. It emits the inter-frame delta in milliseconds on each `requestAnimationFrame` tick. The Stream is cold: every subscriber owns its animation loop, and closing that subscriber's scope cancels the pending frame request. The browser source belongs to `Dom`; the named Subscription controls its activation and maps elapsed time to Messages.

Define a named entry with the dependencies and Messages your feature needs, then map the frame deltas in its handler. The example uses an `isActive` dependency so the handler can return `Stream.empty` while the animation is paused. Foldkit restarts the Subscription when that dependency changes:

::Snippet{name="subscriptionAnimationFrame" label="Animation frame"}

### Frame Deltas

Use the animation frame delta to make motion independent of refresh rate. Convert the milliseconds to seconds before multiplying a per-second velocity, so the simulation behaves consistently at 60Hz, 120Hz, and after a background tab regains focus.

### Animation Frames and Timers

Use `Stream.tick` for discrete wall-clock steps that should occur every N milliseconds. It emits once when its scope opens, so add `Stream.drop(1)` when the first step should wait for the interval to elapse. `Dom.animationFrameTicks` follows the display; `Stream.tick` follows elapsed time. The [canvas-art example](/example-apps/canvas-art) uses animation frames for per-frame physics, while the [snake example](/example-apps/snake) uses `Stream.tick` for game cadence.

## Streams Without Local Model Dependencies

For a Layer-backed Subscription with no local Model dependencies, pass its stable handler name and declared Messages to `entry`. Local Model changes leave the Stream running while its own `when` predicate and any parent gate remain open.

::Snippet{name="subscriptionPersistent" label="Heartbeat without Model dependencies"}

For work whose lifetime depends on the Model, define an entry with `FeatureDefinition.makeSubscriptions` and derive its dependencies from the Model.

## Dom Streams

[Dom Stream helpers](/core/dom#using-dom-streams) turn browser events, media queries, and key bindings into composable Streams. A Subscription owns a Stream whose lifetime follows the Model. A Mount owns one while its rendered element exists.

## Keep a Stream Alive Across Dependency Changes {#advanced}

The default structural comparison restarts an entry whenever any dependency changes. That is usually the right behavior. It becomes wasteful when one field controls the lifetime while another changes frequently and must remain available to a long-running callback.

Auto-scroll during drag and drop is one example. `isDragging` should start and stop the animation loop. `clientY` changes with every pointer movement, but restarting the loop for every pixel would destroy and recreate it continuously.

::Snippet{name="subscriptionEquivalence" label="Auto-scroll with live dependencies"}

### Custom Equivalence

`keepAliveEquivalence` replaces the default structural comparison with an Effect `Equivalence`. In the example, `Equivalence.Struct({ isDragging: Equivalence.Boolean })` compares only `isDragging`. The Stream starts when dragging begins, stays alive while `clientY` changes, and stops when dragging ends.

### Reading Live Dependencies

The second argument to the handler is `readDependencies`. It synchronously returns the latest dependency record, including fields that `keepAliveEquivalence` excluded from the restart decision. The animation callback can therefore read the newest `clientY` on every frame without restarting its Stream.

Most entries should use the first `dependencies` argument directly. Reach for `readDependencies` only when a long-lived callback needs current values that should not control its lifetime. The [Drag and Drop](/ui/drag-and-drop) component and [Kanban example](/example-apps/kanban) show this pattern in context.

## Lifting Subscriptions

When a parent embeds a Block with Subscriptions, its Binding lifts the child's Messages into the parent Message type and applies the same presence policy used by update. `None` in a direct Option field, `false` from `presentWhen`, or `None` from a custom `read` stops every child Stream without reading child dependencies.

`ParentDefinition.makeBinding(ChildBlock, { field, ... })` performs that lift once for a direct child field. Custom storage uses `read` and `write`. Include the Binding in the parent's `bindings` list, and the parent collects the lifted entries under placement-qualified keys. The same Composition routes the child's generated envelopes through its Binding and installs the collected graph through `prepareBlock({ init, update, view, ... })`.

### Gating Child Subscriptions

The optional `when` field lets the parent add a Stream condition the child cannot see. One predicate can gate the whole record, or a map can gate selected entries. Put the policy under `subscriptions.when` in the Binding. The child's own entry gate also applies. This gate controls Stream lifetime only: it does not make the child absent, stop ManagedResources or Mounts, or prevent `binding.fold` from running.

Use direct-field `presentWhen` when the condition governs the whole child rather than its Streams. That predicate makes the Binding absent for updates and every lifecycle channel. A custom accessor expresses the same policy by returning `None` from `read`.

The child continues to own its dependency projection. For a direct array of child Models with declared Struct key fields, use `makeBinding` with `field` and a string-valued `key`. An exact array of closed Struct wrappers adds a distinct required `childField`, leaving its key on the wrapper. Custom writes, opaque, union, or open/index-signature wrappers, and non-array enumeration retain general keyed accessors; Foldkit starts one independently scoped Stream set per active key. See [Subscription Organization](/patterns/subscription-organization) for the full composition pattern.

The application now has state transitions, one-shot Commands, element-scoped Mounts, and ongoing Subscriptions. The remaining question is where the first Model and startup Commands come from. [Init & Flags](/core/init-and-flags) defines that boundary.
