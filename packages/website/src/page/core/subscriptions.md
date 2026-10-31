# Subscriptions

## Ongoing Work with an Instance Lifetime {#overview}

A Command describes one-shot work that produces one result. A Subscription describes ongoing work: a Stream that keeps producing Messages, such as timer ticks, keyboard events, or `WebSocket` frames. A Block declares its Subscriptions in the constructor's result, in one of two forms:

- `stream` is a Stream of the Block's Messages that runs for as long as the instance exists. It starts when the instance enters its parent's Model and stops when the instance leaves.
- `subscriptions` is a record of named entries. Each entry derives a value from the Model with `dependencies` and builds a Stream from that value. The Stream restarts when the value changes.

A Subscription never changes the Model itself. Each Message it emits goes through update like any other.

### Dependency Changes

After every update, the Runtime calls each entry's `dependencies` with the instance's Model and compares the result with the previous one. Equal values keep the current Stream running. A different value closes the Stream's scope, runs any `Effect.acquireRelease` finalizers it registered, and starts a fresh Stream with the new value.

```diagram
                  Model
                    | dependencies(model)
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

The Runtime compares dependencies with Effect's `Equal.equals`, and compares plain objects field by field. Returning `{ isActive: model.isPlaying }` from `dependencies` therefore restarts the Stream only when `isPlaying` changes, not on every update.

### Event Sources and Scoped DOM State

The Subscription is attached to the Model condition, not to the external source used inside its Stream. A timer, document listener, system theme observer, or `WebSocket` supplies events during that lifetime. Those events flow back into update as Messages.

A Subscription may also maintain scoped DOM state without emitting Messages. During a drag, the production [documentDragStyles](https://github.com/foldkit/foldkit/blob/main/packages/ui/src/internal/documentDragStyles.ts) Stream installs temporary selection and cursor rules in its own `<style>` element and removes that element when the drag ends. Existing document styles are untouched.

### Lifecycle Ownership

Choose the lifecycle primitive by what owns the work:

| Primitive                                 | Lifetime owner                              | Use it for                                                                    |
| ----------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `stream`                                  | The Block instance                          | Events the Block wants for as long as it exists                               |
| `subscriptions` entry                     | A value derived from the Model              | Events the Block wants only in some states, or with parameters from the Model |
| [Mount](/core/mount)                      | One rendered element                        | Listeners, observers, or imperative work that needs that element              |
| [Resource Block](/core/managed-resources) | A child instance held in the parent's Model | A `WebSocket`, camera stream, or third-party instance that Commands also use  |

Cleanup alone does not call for a resource Block. A Subscription's scope can install a listener and remove it when the Model no longer needs it, and a Stream that emits no Messages is fine.

For example, an unsaved-draft warning can use a Subscription that installs a `beforeunload` listener while drafts exist. Cancel the event synchronously in the listener; a Message followed by a Command would run too late. This warns before leaving and does not save the draft.

## Auto-Counter Example

In this counter, a Subscription emits `Ticked` once per second while `isAutoCounting` is `true` and stops when it becomes `false`:

::Snippet{name="counterAutoCount" label="Auto-counting Subscription"}

### Gating an Entry on the Model

The `gameClockTicks` entry depends on `model.isAutoCounting`. Its `stream` function receives that value and returns the tick Stream while it is `true` and `Stream.empty` while it is `false`. Each time the user toggles auto-counting, the dependency changes and the Runtime restarts the entry with the new value.

Annotate the parameter of `stream` with the type `dependencies` returns, as in `(isAutoCounting: boolean) => ...`. The record does not infer it.

Name an entry for the events it produces, such as `keyPresses`, `systemThemeChanges`, `gameClockTicks`, or `dragSelectionStyles`. The dependencies decide when the entry runs; they do not need to appear in its name.

## Always-On Streams {#streams-without-local-model-dependencies}

When a Block wants events for its whole life, return them as `stream`. This Heartbeat Block counts a tick every thirty seconds from the moment it appears:

::Snippet{name="subscriptionPersistent" label="Heartbeat with an always-on stream"}

`Stream.tick` emits once when it starts, so `Stream.drop(1)` makes the first tick wait for the interval.

## A Subscription as a Child Block

A parent can control when a Stream runs by holding the Block that owns it. This Ticker has no Model and no view. Its `stream` emits `Ticked`, and its update reports each one to the parent as an OutMessage:

::Snippet{name="subscriptionTickerBlock" label="A Ticker Block"}

AutoCounter holds the Ticker in an `Option` field. Putting the instance in the field starts its Stream, and taking it out stops it:

::Snippet{name="subscriptionTickerParent" label="Starting and stopping a Ticker"}

Use a child Block when the Stream is reusable across features, needs its own state, or should run in several instances at once. Use a `subscriptions` entry when the Stream belongs to one Block and depends on its Model.

## Testing Subscriptions

Stories and scenes never run Streams. A Subscription's emission is a Message, so a test delivers it. For a child Block's Stream, address the Message to the instance with `Block.deliver`:

::Snippet{name="subscriptionStory" label="Delivering Ticker Messages in a story"}

In a scene, deliver the same Message with the `deliver` step from `foldkit/scene`. To test the Stream itself, build it from its inputs and run it with Effect's Stream operators.

## Animation Frames

`Dom.animationFrameTicks` is a Stream tied to the browser's paint clock. It emits the time since the previous frame, in milliseconds, on each `requestAnimationFrame` tick. Every subscriber runs its own animation loop, and closing that subscriber's scope cancels the pending frame request.

This Spinner rotates while `isPlaying` is `true`. Its entry depends on `isPlaying`, so the loop starts when playback starts and stops when it stops:

::Snippet{name="subscriptionAnimationFrame" label="Animation frame"}

### Frame Deltas

Use the frame delta to make motion independent of refresh rate. Convert milliseconds to seconds before multiplying a per-second velocity, so the animation moves at the same speed at 60Hz, at 120Hz, and after a background tab regains focus.

### Animation Frames and Timers

Use `Stream.tick` for steps that should occur every N milliseconds of wall-clock time. `Dom.animationFrameTicks` follows the display; `Stream.tick` follows elapsed time. The [canvas-art example](/example-apps/canvas-art) uses animation frames for per-frame physics, while the [snake example](/example-apps/snake) uses `Stream.tick` for game cadence.

## Dom Streams

[Dom Stream helpers](/core/dom#using-dom-streams) turn browser events, media queries, and key bindings into composable Streams. Return one from `stream` or a `subscriptions` entry when the Model decides its lifetime, or from a Mount when a rendered element does.

## Keep a Stream Alive Across Dependency Changes {#advanced}

The default comparison restarts an entry whenever any dependency changes. That becomes wasteful when one field controls the lifetime while another changes often and must stay available to a long-running callback.

Auto-scroll during drag and drop is one example. `isDragging` should start and stop the animation loop. `clientY` changes with every pointer movement, and restarting the loop for every pixel would destroy and recreate it continuously:

::Snippet{name="subscriptionEquivalence" label="Auto-scroll with live dependencies"}

### Custom Equivalence

`keepAliveEquivalence` receives the previous and next dependencies and returns `true` to keep the Stream running. `Equivalence.Struct({ isDragging: Equivalence.Boolean })` compares only `isDragging`. The Stream starts when dragging begins, keeps running while `clientY` changes, and stops when dragging ends.

### Reading Live Dependencies

The second argument to `stream` is `readDependencies`. It returns the latest dependencies, including fields that `keepAliveEquivalence` ignores. The animation callback reads the newest `clientY` on every frame without restarting its Stream.

Most entries use the first argument directly. Reach for `readDependencies` only when a long-lived callback needs current values that should not control its lifetime. The [Drag and Drop](/ui/drag-and-drop) component and [Kanban example](/example-apps/kanban) show this pattern in context.

## Subscriptions in Child Blocks {#lifting-subscriptions}

Each instance runs its own `stream` and `subscriptions`, computed from its own Model. A parent does not collect or forward them. Two instances of one Block run two independent sets of Streams, and removing an instance from the parent's Model stops all of its Streams.

To pause a child's Streams without discarding the child, give the child a Message that changes the Model its `dependencies` read, and send it with `send`. To stop them and discard the child, take it out of the Model. [Subscription Organization](/patterns/subscription-organization) covers larger compositions.

The application now has state transitions, one-shot Commands, element-scoped Mounts, and ongoing Subscriptions. The remaining question is where the first Model and startup Commands come from. [Init & Flags](/core/init-and-flags) covers that boundary.
