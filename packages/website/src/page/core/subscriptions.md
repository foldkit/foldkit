# Subscriptions

## Ongoing Work with a Model-Driven Lifetime {#overview}

A Subscription describes ongoing work whose lifetime comes from the Model. Each entry maps the Model to a dependency record, then maps those dependencies to a scoped `Stream<Message>`.

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

The Subscription is attached to the Model condition, not to the external source used inside its Stream. A timer, document listener, system theme observer, or `WebSocket` supplies events during that lifetime. Those events flow back into update as Messages.

A Subscription may also maintain scoped DOM state without emitting Messages. During a drag, the production [documentDragStyles](https://github.com/foldkit/foldkit/blob/main/packages/ui/src/internal/documentDragStyles.ts) Stream installs temporary selection and cursor rules in its own `<style>` element and removes that element when the drag ends. Existing document styles are untouched.

Choose the lifecycle primitive by what owns the work:

| Primitive                                  | Lifetime owner                                      | Use it for                                                                                    |
| ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Subscription                               | A dependency record derived from the Model          | Ongoing event streams or scoped work that does not expose a handle                            |
| [Mount](/core/mount)                       | One rendered element                                | Listeners, observers, or imperative work that needs that element                              |
| [ManagedResource](/core/managed-resources) | A Model condition, with a typed handle for Commands | A `WebSocket`, camera stream, or third-party instance that other parts of the program consume |

## Auto-Counter Example

Commands describe one-shot work that produces one result. Subscriptions describe ongoing work. In the counter, a Subscription emits `Ticked` once per second while `isAutoCounting` is `true` and stops when it becomes `false`.

::Snippet{name="counterAutoCount" label="Auto-counting Subscription"}

`Subscription.make<Model, Message>()` receives a function that builds a named record of entries. When a Layer-backed entry depends on the Model, `entry` takes three arguments:

- A stable handler name for the Layer requirement.
- A field map defining the dependency Schema, in the same shape passed to `Schema.Struct`.
- An object containing `modelToDependencies`.

`modelToDependencies` extracts the values that control the entry. `subscriptions.tick.toLayer` supplies the Stream factory. Foldkit compares the extracted record structurally by default, so unrelated Model updates do not restart the timer.

The inline form takes the dependency fields and an object with both `modelToDependencies` and `dependenciesToStream`. Each Layer-backed entry, such as `subscriptions.tick`, is an individual definition with `toLayer(handler)` and `toLayer(Effect<handler>)`. Its record key identifies the running Subscription, while its handler name identifies the Layer requirement. `Application.provide` supplies that Layer; `Subscription.lift` and `Subscription.aggregate` preserve the handler identity and Model-driven restart behavior.

Distinct Subscription definitions within one application need distinct handler names. The same definition can be lifted into multiple registration keys and share one handler Layer. `Application.make` rejects duplicate names from different definitions.

When `isAutoCounting` changes to `true`, the new Stream starts ticking. When it changes back to `false`, the active scope closes and the timer stops.

Defining `subscriptions` is only half of the setup. Pass the record to `Application.make` or no streams start. The field is optional, so omitting it still produces a valid application without Subscription behavior.

::Snippet{name="counterEntryWithSubscriptions" label="Subscription wiring"}

The [websocket-chat example](/example-apps/websocket-chat) shows a more involved event stream. [Typing Terminal](https://typingterminal.com) and its [source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game) show Subscriptions inside a complete application.

### Naming a Subscription

A Subscription definition describes a scoped Stream. Its record key identifies the registration that Foldkit starts and stops; its handler name identifies the Stream or scoped behavior a Layer supplies. In the counter example, `tick` is the record key, `AutoCountTicks` is the handler name, and `AutoCountTicksLive` is one implementation Layer. A feature can export a composed `Live` Layer containing several such handlers.

Name the events or scoped behavior the definition supplies, such as `KeyboardPresses`, `SystemThemeChanges`, `GameClockTicks`, or `DragSelectionStyles`. `KeyboardPresses` identifies the events produced from keyboard input; `GameClockTicks` identifies the events produced by a timer. The Model dependencies determine when the Stream is active and when its scope restarts; they do not need to appear in the handler name.

Unlike a Command, a Subscription may emit many Messages or maintain scoped work without emitting any. Its handler name does not need to mirror a single result Message or follow the Command imperative naming convention. Name an individual Layer from its handler identity, such as `AutoCountTicksLive`; reserve a bare `Live` for a feature-level composition or re-export.

## Animation Frames

`Subscription.animationFrameEntry` is a ready-made entry for work tied to the browser's paint clock. It emits a Message on each `requestAnimationFrame` tick while its `isActive` function returns `true`, and supplies the inter-frame delta in milliseconds.

The helper returns a complete entry with `{ isActive: boolean }` dependencies. Its `toMessage` maps frame deltas to the entry's Message type. Place it directly in the record passed to `Subscription.make`:

::Snippet{name="subscriptionAnimationFrame" label="Animation frame"}

Use the delta to make motion independent of refresh rate. Convert the milliseconds to seconds before multiplying a per-second velocity, so the simulation behaves consistently at 60Hz, 120Hz, and after a background tab regains focus.

Use `Stream.tick` for discrete wall-clock steps that should occur every N milliseconds. It emits once when its scope opens, so add `Stream.drop(1)` when the first step should wait for the interval to elapse. `Subscription.animationFrameEntry` follows the display; `Stream.tick` follows elapsed time. The [canvas-art example](/example-apps/canvas-art) uses animation frames for per-frame physics, while the [snake example](/example-apps/snake) uses `Stream.tick` for game cadence.

## Streams Without Local Model Dependencies

For a Layer-backed Subscription with no local Model dependencies, pass only its stable handler name to `entry`. Local Model changes leave the Stream running. A parent can still gate the entry when lifting it.

::Snippet{name="subscriptionPersistent" label="Heartbeat without Model dependencies"}

Use `Subscription.persistentEntry(stream)` for a self-contained inline Stream that does not need a handler Layer.

For work whose lifetime depends on the Model, define an entry with `Subscription.make` and derive its dependencies from the Model.

## Dom Streams

[Dom Stream helpers](/core/dom#using-dom-streams) turn browser events, media queries, and key bindings into composable Streams. A Subscription owns a Stream whose lifetime follows the Model. A Mount owns one while its rendered element exists.

## Keep a Stream Alive Across Dependency Changes {#advanced}

The default structural comparison restarts an entry whenever any dependency changes. That is usually the right behavior. It becomes wasteful when one field controls the lifetime while another changes frequently and must remain available to a long-running callback.

Auto-scroll during drag and drop is one example. `isDragging` should start and stop the animation loop. `clientY` changes with every pointer movement, but restarting the loop for every pixel would destroy and recreate it continuously.

::Snippet{name="subscriptionEquivalence" label="Auto-scroll with live dependencies"}

### Custom Equivalence

`keepAliveEquivalence` replaces the default structural comparison with an Effect `Equivalence`. In the example, `Equivalence.Struct({ isDragging: Equivalence.Boolean })` compares only `isDragging`. The Stream starts when dragging begins, stays alive while `clientY` changes, and stops when dragging ends.

### Reading Live Dependencies

The second argument to the `toLayer` handler is `readDependencies`. It synchronously returns the latest dependency record, including fields that `keepAliveEquivalence` excluded from the restart decision. The animation callback can therefore read the newest `clientY` on every frame without restarting its Stream.

Most entries should use the first `dependencies` argument directly. Reach for `readDependencies` only when a long-lived callback needs current values that should not control its lifetime. The [Drag and Drop](/ui/drag-and-drop) component and [Kanban example](/example-apps/kanban) show this pattern in context.

## Lifting Subscriptions

When a parent embeds a Submodel with Subscriptions, the parent must lift the child's Messages into its own Message type. `Subscription.lift` composes the entire record in one call. Its `read` returns an `Option` of the child Model, matching `Update.foldChild` and `ManagedResource.lift`. Returning `None` stops every child Stream without reading child dependencies. Wrap an always-present child in `Option.some`.

The optional `when` field lets the parent add a condition the child cannot see, such as whether the child's page is the active route. One predicate can gate the whole record, or a map can gate selected entries. The child continues to own its own dependencies. See [Subscription Organization](/patterns/subscription-organization) for the complete composition pattern.

The application now has state transitions, one-shot Commands, element-scoped Mounts, and ongoing Subscriptions. The remaining question is where the first Model and startup Commands come from. [Init & Flags](/core/init-and-flags) defines that boundary.
