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

A Subscription may also maintain scoped DOM state without emitting Messages. For example: it can apply `user-select: none` while a drag is active, then restore the previous value when dragging ends. The production [documentDragStyles](https://github.com/foldkit/foldkit/blob/477db0e12f9599e80e6c9970366281963acd1fd2/packages/ui/src/dragAndDrop/index.ts#L663-L689) Subscription uses this shape.

Choose the lifecycle primitive by what owns the work:

| Primitive                                  | Lifetime owner                                      | Use it for                                                                                    |
| ------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Subscription                               | A dependency record derived from the Model          | Ongoing event streams or scoped work that does not expose a handle                            |
| [Mount](/core/mount)                       | One rendered element                                | Listeners, observers, or imperative work that needs that element                              |
| [ManagedResource](/core/managed-resources) | A Model condition, with a typed handle for Commands | A `WebSocket`, camera stream, or third-party instance that other parts of the program consume |

Subscription callbacks can perform synchronous browser work when the event requires it. `preventDefault()` is the common case. The mapper in `Subscription.fromEvent` runs inside the browser's event dispatch, so it can suppress the default action before returning a Message.

## Auto-Counter Example

Commands describe one-shot work that produces one result. Subscriptions describe ongoing work. In the counter, a Subscription emits `Ticked` once per second while `isAutoCounting` is `true` and stops when it becomes `false`.

::Snippet{name="counterAutoCount" label="subscription example"}

`Subscription.make<Model, Message>()` receives a function that builds a named record of entries. Each call to `entry` takes two arguments:

- A field map defining the dependency Schema, in the same shape passed to `Schema.Struct`.
- An object containing `modelToDependencies` and `dependenciesToStream`.

`modelToDependencies` extracts the values that control the entry. `dependenciesToStream` creates its Stream. Foldkit compares the extracted record structurally by default, so unrelated Model updates do not restart the timer.

When `isAutoCounting` changes to `true`, the new Stream starts ticking. When it changes back to `false`, the active scope closes and the timer stops.

Defining `subscriptions` is only half of the setup. Pass the record to `makeApplication` or no streams start. The field is optional, so omitting it still produces a valid application without Subscription behavior.

::Snippet{name="counterEntryWithSubscriptions" label="subscription wiring"}

The [websocket-chat example](/example-apps/websocket-chat) shows a more involved event stream. [Typing Terminal](https://typingterminal.com) and its [source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game) show Subscriptions inside a complete application.

## Animation Frames

`Subscription.animationFrame` is a ready-made entry for work tied to the browser's paint clock. It emits a Message on each `requestAnimationFrame` tick while its `isActive` function returns `true`, and supplies the inter-frame delta in milliseconds.

The helper returns a complete entry with `{ isActive: boolean }` dependencies. Place it directly in the record passed to `Subscription.make`:

::Snippet{name="subscriptionAnimationFrame" label="animation frame example"}

Use the delta to make motion independent of refresh rate. Convert the milliseconds to seconds before multiplying a per-second velocity, so the simulation behaves consistently at 60Hz, 120Hz, and after a background tab regains focus.

Use `Stream.tick` for discrete wall-clock steps that should occur every N milliseconds. `Subscription.animationFrame` follows the display; `Stream.tick` follows elapsed time. The [canvas-art example](/example-apps/canvas-art) uses animation frames for per-frame physics, while the [snake example](/example-apps/snake) uses `Stream.tick` for game cadence.

## DOM Events

`Subscription.fromEvent` handles DOM events that are not tied to one element in the rendered tree, such as window shortcuts, media-query changes, or document visibility. It registers the listener when the Stream scope opens and removes it when the scope closes.

The helper returns a Stream, not a complete entry. Wrap it in `Stream.when` inside an entry to gate it on the Model, or pass it to `Subscription.persistent` for a listener that lives with the whole Subscriptions record.

::Snippet{name="subscriptionFromEvent" label="DOM event subscription example"}

The `toMessage` mapper runs synchronously in the same call stack as the browser event, so it may call `event.preventDefault()`. Pass `target` as a thunk if the target may not exist until the scope opens. Pass always-present globals such as `window` and `document` directly.

Use `Subscription.fromEventFilterMap` when only some events should dispatch. Its mapper returns `Option.some(message)` to emit or `Option.none()` to ignore the event. For a listener attached to one rendered element, use [Mount](/core/mount) instead.

## Keep a Stream Alive Across Dependency Changes {#advanced}

The default structural comparison restarts an entry whenever any dependency changes. That is usually the right behavior. It becomes wasteful when one field controls the lifetime while another changes frequently and must remain available to a long-running callback.

Auto-scroll during drag and drop is one example. `isDragging` should start and stop the animation loop. `clientY` changes with every pointer movement, but restarting the loop for every pixel would destroy and recreate it continuously.

::Snippet{name="subscriptionEquivalence" label="advanced subscription example"}

### Custom Equivalence

`keepAliveEquivalence` replaces the default structural comparison with an Effect `Equivalence`. In the example, `Equivalence.Struct({ isDragging: Equivalence.Boolean })` compares only `isDragging`. The Stream starts when dragging begins, stays alive while `clientY` changes, and stops when dragging ends.

### Reading Live Dependencies

The second argument to `dependenciesToStream` is `readDependencies`. It synchronously returns the latest dependency record, including fields that `keepAliveEquivalence` excluded from the restart decision. The animation callback can therefore read the newest `clientY` on every frame without restarting its Stream.

Most entries should use the first `dependencies` argument directly. Reach for `readDependencies` only when a long-lived callback needs current values that should not control its lifetime. The [Drag and Drop](/ui/drag-and-drop) component and [Kanban example](/example-apps/kanban) show this pattern in context.

## Lifting Subscriptions

When a parent embeds a Submodel with Subscriptions, the parent must lift the child's Messages into its own Message type. `Subscription.lift` composes the entire record in one call.

The optional `when` field lets the parent add a condition the child cannot see, such as whether the child's page is the active route. One predicate can gate the whole record, or a map can gate selected entries. The child continues to own its own dependencies. See [Subscription Organization](/patterns/subscription-organization) for the complete composition pattern.

The application now has state transitions, one-shot Commands, element-scoped Mounts, and ongoing Subscriptions. The remaining question is where the first Model and startup Commands come from. [Init & Flags](/core/init-and-flags) defines that boundary.
