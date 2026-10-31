# Resources

## Overview

Services in the program's Layer live for the whole run. Some stateful handles should exist only while the application is in a particular state: a `WebSocket` while the user is on a chat page, a camera stream during a video call, or a Web Worker pool during a computation.

A resource like that is a child Block. The child acquires the handle in its constructor and releases it when the instance leaves the Model. The parent decides when the handle exists by holding the instance in an `Option` field: `Option.some(socket)` opens the connection, and `Option.none()` closes it.

A resource Block uses three parts of the Block API:

- `Effect.acquireRelease` in the constructor ties cleanup to the instance's scope. The Runtime closes that scope when the instance leaves the Model.
- `stream` turns the handle's events into the Block's Messages, which it reports to the parent as OutMessages.
- `expose` hands the parent's Commands a value to call, read with `instance.use`.

Choose a resource Block when Commands need the handle. Listeners and scoped work that no Command calls belong in a [Subscription](/core/subscriptions), which can install and remove a listener without exposing anything. Check [lifecycle ownership](/core/subscriptions#lifecycle-ownership) before writing one.

:::Info{label="The restaurant analogy"}
Services are the kitchen equipment available all night. A resource Block is a specialty station set up only while the menu needs it. Taking the special off the menu breaks the station down. A Command that asks for a station that isn't set up receives `NotConnected`.
:::

## Define a Resource Block

This Socket Block opens a `WebSocket` in its constructor, reports every received message to its parent, and exposes `send`:

::Snippet{name="resourceSocket" label="A Socket resource Block"}

The fourth type parameter, `SocketHandle`, is the type of `expose`. The compiler requires `expose` to match it.

`Effect.acquireRelease` registers the cleanup as part of acquisition. Construct the resource inside the acquire Effect, never before it, so the release is registered even if construction is interrupted.

The constructor runs synchronously, and `new WebSocket(url)` returns immediately. The socket opens in the background and its events arrive through `stream`.

## Hold the Resource in the Parent {#accessing-managed-resources}

Chat declares one Socket instance and holds it in `maybeSocket`. Its `SendChat` handler reads the exposed `send` through `socket.use`:

::Snippet{name="resourceChat" label="A Chat that connects and disconnects a Socket"}

The lifecycle follows the Model:

| Model change                             | What the Runtime does                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `Option.none()` to `Option.some(socket)` | Runs the Socket constructor, which opens the connection, and starts its `stream` |
| `Option.some(socket)` to `Option.none()` | Closes the instance's scope: the `stream` stops and the socket closes            |
| `Option.some(socket)` back again later   | Constructs a fresh Socket with a new connection                                  |

### Operations Using a Handle

`socket.use` is an Effect that succeeds with the exposed value while the instance is in the Model. It fails with `NotConnected` while it is not. The `SendChat` handler catches `NotConnected` and returns `FailedSendChat`, so a click on **Say hello** while disconnected becomes a Message instead of a crash.

Call `use` when the Command runs, as `SendChat` does. A value read once in the constructor would outlive the connection it came from.

## Resources That Take Time to Acquire

Some handles arrive asynchronously, such as a camera stream from `getUserMedia`. The constructor cannot wait for them. Acquire them inside `stream` instead, and report readiness as a Message:

::Snippet{name="resourceCamera" label="A Camera that acquires its stream asynchronously"}

`Stream.scoped` keeps the acquired stream alive until the instance's scope closes, then stops its tracks. `Stream.never` holds the Stream open after the first Message. The constructor creates a `Ref` synchronously and the acquisition fills it, so `maybeMediaStream` returns `None` until the camera is ready. The parent learns readiness through `BecameReady` or `FailedToStart` and can record it in its own Model.

## Test a Resource Block's Parent

Stories and scenes never run Streams or Command handlers, but they do construct instances. To test the parent without opening a real connection, provide a stub for the resource class:

::Snippet{name="resourceChatStory" label="Testing Chat against a stub Socket"}

The stub has no constructor work and exposes a `send` that does nothing. Deliver the Messages the real `stream` would produce with `Block.deliver`.

## Several Resources and Nested Resources

Each instance owns its own handle. A parent that needs one socket per room uses `Socket.each('sockets', ...)` and keeps the instances in an array or Record. Removing one room's instance closes only that room's socket.

A resource Block can hold child resource Blocks of its own. Removing the outer instance closes its scope and the scopes of every instance inside it.
