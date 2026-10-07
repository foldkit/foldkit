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

`Subscription.make<Model, Message>()` receives a function that builds a named record of entries. Each call to `entry` takes two arguments:

- A field map defining the dependency Schema, in the same shape passed to `Schema.Struct`.
- An object containing `modelToDependencies` and `dependenciesToStream`.

`modelToDependencies` extracts the values that control the entry. `dependenciesToStream` creates its Stream. Foldkit compares the extracted record structurally by default, so unrelated Model updates do not restart the timer.

When `isAutoCounting` changes to `true`, the new Stream starts ticking. When it changes back to `false`, the active scope closes and the timer stops.

Defining `subscriptions` is only half of the setup. Pass the record to `makeApplication` or no streams start. The field is optional, so omitting it still produces a valid application without Subscription behavior.

::Snippet{name="counterEntryWithSubscriptions" label="Subscription wiring"}

The [websocket-chat example](/example-apps/websocket-chat) shows a more involved event stream. [Typing Terminal](https://typingterminal.com) and its [source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game) show Subscriptions inside a complete application.

## Animation Frames

`Subscription.animationFrame` is a ready-made entry for work tied to the browser's paint clock. It emits a Message on each `requestAnimationFrame` tick while its `isActive` function returns `true`, and supplies the inter-frame delta in milliseconds.

The helper returns a complete entry with `{ isActive: boolean }` dependencies. Its `toMessage` maps frame deltas to the entry's Message type. Place it directly in the record passed to `Subscription.make`:

::Snippet{name="subscriptionAnimationFrame" label="Animation frame"}

Use the delta to make motion independent of refresh rate. Convert the milliseconds to seconds before multiplying a per-second velocity, so the simulation behaves consistently at 60Hz, 120Hz, and after a background tab regains focus.

Use `Stream.tick` for discrete wall-clock steps that should occur every N milliseconds. It emits once when its scope opens, so add `Stream.drop(1)` when the first step should wait for the interval to elapse. `Subscription.animationFrame` follows the display; `Stream.tick` follows elapsed time. The [canvas-art example](/example-apps/canvas-art) uses animation frames for per-frame physics, while the [snake example](/example-apps/snake) uses `Stream.tick` for game cadence.

## Streams Without Local Model Dependencies

`Subscription.persistent` wraps a Stream in an entry with no dependencies on its own Model. Local Model changes leave the Stream running. A parent can still gate the entry when lifting it.

::Snippet{name="subscriptionPersistent" label="Heartbeat without Model dependencies"}

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

The second argument to `dependenciesToStream` is `readDependencies`. It synchronously returns the latest dependency record, including fields that `keepAliveEquivalence` excluded from the restart decision. The animation callback can therefore read the newest `clientY` on every frame without restarting its Stream.

Most entries should use the first `dependencies` argument directly. Reach for `readDependencies` only when a long-lived callback needs current values that should not control its lifetime. The [Drag and Drop](/ui/drag-and-drop) component and [Kanban example](/example-apps/kanban) show this pattern in context.

## Lifting Subscriptions

When a parent embeds a Submodel with Subscriptions, the parent must lift the child's Messages into its own Message type. `Subscription.lift` composes the entire record in one call. Its `read` returns an `Option` of the child Model, matching `Update.foldChild` and `ManagedResource.lift`. Returning `None` stops every child Stream without reading child dependencies. Wrap an always-present child in `Option.some`.

The optional `when` field lets the parent add a condition the child cannot see, such as whether the child's page is the active route. One predicate can gate the whole record, or a map can gate selected entries. The child continues to own its own dependencies. See [Subscription Organization](/patterns/subscription-organization) for the complete composition pattern.

The application now has state transitions, one-shot Commands, element-scoped Mounts, and ongoing Subscriptions. The remaining question is where the first Model and startup Commands come from. [Init & Flags](/core/init-and-flags) defines that boundary.
