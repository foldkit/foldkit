# Subscriptions

## Overview

A Subscription binds a slice of your Model to a scoped Stream that may emit Messages. You name a slice of the Model via `modelToDependencies`, and Foldkit runs the body of work in `dependenciesToStream` as a scoped Effect for exactly as long as that slice holds its dependency-equivalent value. When the slice changes, the scope closes (running any registered `Effect.acquireRelease` finalizers), and a fresh scope opens with the new dependencies.

```diagram
               Model
                 |
                 | modelToDependencies(model)
                 ↓
            Dependencies
                 |
                 | equivalence check vs. previous
                 ↓
            +----------+
            | changed? |
            +----+-----+
                 |
           +-----+------+
           |            |
          yes           no
           |            |
           ↓            ↓
    close current   scope continues
        scope        (no restart)
   (finalizers run)
           |
           ↓
   open fresh scope
           |
           ↓
   +----------------------------+
   |    dependenciesToStream    |
   |  (deps, readDependencies)  |
   +-------------+--------------+
                 |
                 ↓
          Stream<Message>
                 |
                 ↓
               update
```

This inverts the usual "subscribe to an event source" framing. The thing you are subscribed to is the Model, not the `WebSocket`, not the timer, not the document event. External event sources are what your Effect happens to USE during the subscription’s lifetime; they are not the thing being subscribed to. The common shape plugs an external source into the Stream’s queue so events flow back into `update` as Messages (timer ticks, document keydowns, `WebSocket` frames, system theme changes). Some Subscriptions emit no Messages and just maintain DOM state for the subscription’s lifetime (setting `user-select: none` while a drag is active, applying `aria-hidden` to the document root while a modal is open). Both are valid uses of the same primitive because both are scoped Effect activity gated by a Model condition. See [documentDragStyles](https://github.com/foldkit/foldkit/blob/477db0e12f9599e80e6c9970366281963acd1fd2/packages/ui/src/dragAndDrop/index.ts#L663-L689) for the DOM-state-only shape in production.

For events tied to a specific element’s existence (scroll listeners, IntersectionObservers, ResizeObservers on a particular element), use [Mount](/core/mount). Mount provides the element handle directly and binds the scope to element lifetime. For stateful long-lived handles your Commands consume (the `WebSocket` connection itself, a camera stream, a third-party library instance), use [ManagedResource](/core/managed-resources). ManagedResource is Subscription’s sibling: same Model-gated lifetime, both dispatch Messages. The discriminator is whether other parts of the program need a typed handle to the underlying resource. Subscription’s Messages flow from inside the body of work during the subscribed lifetime (timer ticks, document keydowns, `WebSocket` frames as they arrive). ManagedResource dispatches Messages at lifecycle transitions (`onAcquired`, `onReleased`, `onAcquireError`) AND exposes the acquired value as a typed handle Commands access via `yield*`.

Because the Stream factory is an Effect, it can do DOM side effects directly when the work must be synchronous with the event itself. Calling `preventDefault` on a keydown listener is the canonical case: routing the event through `update` would arrive after the browser had committed the default. Do the DOM mutation in a synchronous Effect that runs in the same call stack as the browser’s event dispatch. `Stream.mapEffect` with `Effect.sync` is the typical shape when you also want to transform the event into a Message; `Stream.tap` is the typical shape when the mutation is the entire point and no Message follows.

## Auto-Counter Example

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), a Subscription is a standing order: “keep the coffee coming for table 5.” The waiter doesn’t keep walking back to repeat the order. The kitchen knows to keep pouring until the table says stop.

Commands handle one-off side effects: a slip to the kitchen that comes back with a single result. Subscriptions handle the ongoing kind. Here’s how we add auto-counting to the counter: when `isAutoCounting` is `true`, a stream ticks every second, and when it flips to `false`, the stream stops.

::Snippet{name="counterAutoCount" label="subscription example"}

Each entry is built by calling `entry` with two arguments. The first is a field map describing the dependency shape (the same shape you would pass to `S.Struct`). The second is an object with two callbacks:

- `modelToDependencies` extracts the dependencies from the Model.
- `dependenciesToStream` creates a Stream of Messages from those dependencies.

Foldkit structurally compares the dependencies between Model updates. The stream is only restarted when the dependencies actually change, not on every Model update.

When `isAutoCounting` changes from `false` to `true`, the stream starts ticking. When it changes back to `false`, the stream stops. Foldkit handles all the lifecycle management for you.

Defining `subscriptions` is only half of it. The value does nothing until you pass it to `makeApplication`. The field is optional, so leaving it out is not a type error: the streams simply never start, and the app runs as though the Subscription were not there.

::Snippet{name="counterEntryWithSubscriptions" label="subscription wiring"}

For a more complex example consuming a `WebSocket` message stream, see the [websocket-chat example](/example-apps/websocket-chat). For a full real-world application, check out [Typing Terminal](https://typingterminal.com) ([source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game)).

## Animation Frames

For Subscriptions tied to the browser’s paint clock, `Subscription.animationFrame` is a ready-made helper. It emits a Message every `requestAnimationFrame` tick with the inter-frame delta in milliseconds, and tears the loop down when its `isActive` gate returns `false`. The helper returns a complete Subscription entry (its dependencies are `{ isActive: boolean }`), so it slots into `Subscription.make` as a single line alongside any other entries.

Reach for it whenever you want smooth, time-based motion driven by Model updates: physics simulations, generative art, parallax scrolling, custom interpolations. The `deltaTime` payload makes simulation speed independent of frame rate. Multiply per-second velocities by it and motion stays consistent on 60Hz, 120Hz, or after a tab regains focus.

::Snippet{name="subscriptionAnimationFrame" label="animation frame example"}

For discrete game ticks (where the simulation steps once every N ms regardless of refresh rate), reach for `Stream.tick` instead. Wall-clock cadence and display-coupled cadence are different problems: `Stream.tick` suits the first, `Subscription.animationFrame` the second. The [snake example](/example-apps/snake) uses `Stream.tick` for its game cadence; the [canvas-art example](/example-apps/canvas-art) uses `Subscription.animationFrame` for per-frame physics.

## DOM Events

For DOM events that are not tied to a specific element in your rendered tree (global keyboard shortcuts on `window`, media-query changes, `document` visibility), `Subscription.fromEvent` builds the `addEventListener` and `removeEventListener` lifecycle for you. It returns a Stream that registers the listener when the scope opens and removes it when the scope closes, so you never hand-roll the `Effect.acquireRelease` yourself.

Because `fromEvent` is a Stream rather than a complete entry, you gate it the same way as any other Stream. Wrap it in `Stream.when` inside an `entry` to bind it to a Model condition, or pass it to `Subscription.persistent` for a listener that runs for the whole Subscriptions record. Here is a global keyboard shortcut gated on `isListening`:

::Snippet{name="subscriptionFromEvent" label="DOM event subscription example"}

The `toMessage` mapper runs synchronously in the same call stack as the browser’s event dispatch, so calling `event.preventDefault()` inside it works. Pass the `target` as a thunk when it may not exist until the scope opens, or directly for always-present globals like `window` and `document`. For events tied to a specific rendered element, reach for [Mount](/core/mount) instead, which hands you the element directly.

When only some events should become Messages, use `Subscription.fromEventFilterMap`. Its `toMessage` returns `Option.some(message)` to emit a Message or `Option.none()` to ignore the event.

## Advanced

Consider an auto-scroll Subscription for a drag-and-drop interface. It depends on both `isDragging` (should the scroll loop run?) and `clientY` (where is the pointer?). The stream should start when dragging begins and stop when it ends, but `clientY` changes on every pixel of mouse movement, and by default every change restarts the stream, destroying the `requestAnimationFrame` loop each time.

::Snippet{name="subscriptionEquivalence" label="advanced subscription example"}

### Custom Equivalence

The `keepAliveEquivalence` field overrides the default structural comparison with an `Equivalence` from Effect, letting you choose which fields are allowed to change without restarting the stream. `Equivalence.Struct({ isDragging: Equivalence.Boolean })` means two snapshots are equal if they have the same `isDragging` value, regardless of `clientY`. The stream starts once when dragging begins and stops when it ends. It never restarts in between.

### Reading Live Dependencies

If the stream doesn’t restart when `clientY` changes, how does the rAF loop read the latest pointer position? The second argument to `dependenciesToStream` is `readDependencies`: a function that returns the current dependencies synchronously, reflecting the latest Model state without restarting the stream.

Inside the `requestAnimationFrame` loop, `readDependencies()` returns the latest snapshot every frame. This is the bridge between the stream lifecycle (which gates on the dependencies that trigger restarts) and browser callbacks (which need synchronous access to the latest state).

In most Subscriptions, use the dependencies passed as the first argument directly. The stream restarts whenever they change, so they’re always current. `readDependencies` is for the case where `keepAliveEquivalence` has excluded fast-changing fields from the restart decision, and you need to read those fields inside a long-lived callback. For a real-world example, see the [Drag and Drop](/ui/drag-and-drop) component and the [Kanban example](/example-apps/kanban).

When a parent Submodel embeds children that emit Subscriptions, the parent owns the wrap into its own Message type. `Subscription.lift` handles this composition in one call, and its optional `when` lets the parent gate on a parent fact the child cannot see, such as the route a page sits behind. `when` is written by the parent and reads the parent Model, as one predicate for the whole record or as a map naming the entries to gate. See [Subscription Organization](/patterns/subscription-organization) for the full pattern.

You’ve now seen how state changes flow through update, how one-off side effects work as Commands, how view code reaches the live DOM with Mount, and how ongoing streams are managed with Subscriptions. But where do the first Model and Commands come from? That’s `init`.
