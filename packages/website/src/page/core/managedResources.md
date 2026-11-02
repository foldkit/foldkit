# Resources

## Overview

Services in the program's Layer live for the whole run. Some stateful handles should exist only while part of the Model exists: a `WebSocket` while a chat room is open, an `EventSource` while a match page is showing, or a Web Worker pool during a computation.

In Foldkit, the Model decides when such a handle exists. A Block instance that needs the handle opens it from a [Subscription](/core/subscriptions). Foldkit starts the instance's Subscriptions when the instance appears in a Model and stops them when it leaves, so the handle lives exactly as long as the instance does. Nothing about the handle is stored in the Model; the Model holds only the data that identifies it, such as a room id.

Choose between two forms by asking who uses the handle:

- Only the Subscription's Stream reads from it. Acquire the handle inside the Stream with `Effect.acquireRelease`. The Stream holds it until the Subscription stops.
- Commands also use it, for example to send on a socket. Put the handles in an Effect `RcMap`, a map of reference-counted resources, which the Block's Layer creates once. The Subscription holds the entry for the instance's key while the instance is in the Model, and Command handlers borrow the same handle by key.

A Block's Layer constructor runs once per Block, not once per instance, so it never holds one instance's handle. Per-instance data lives in the Model and reaches Command handlers through Command args.

:::Info{label="The restaurant analogy"}
Services are the kitchen equipment available all night. A keyed resource is a specialty station: the Subscription sets it up when an order for that table arrives and breaks it down when the table leaves. Commands for that table use the station by table number.
:::

## Hold a Resource in a Subscription

This LiveScore Block opens an `EventSource` for its match and records each score it receives:

::Snippet{name="resourceScoreFeed" label="A LiveScore Block that holds an EventSource"}

`init` stores the `matchId` from the instance's args in its Model. The `scoreEvents` entry returns that id from `dependencies`, so each LiveScore instance gets its own `EventSource`, and the id stays the same for the instance's lifetime.

`Effect.acquireRelease` registers the cleanup as part of acquisition. Construct the resource inside the acquire Effect, never before it, so the release is registered even if construction is interrupted. `Stream.unwrap` runs the acquisition in the Stream's scope, so the `EventSource` closes when the Stream stops.

The lifecycle follows the Model:

| Model change                               | What Foldkit does                                                  |
| ------------------------------------------ | ------------------------------------------------------------------ |
| A LiveScore instance appears               | Starts `scoreEvents`, which opens the `EventSource`                |
| The instance leaves the Model              | Stops `scoreEvents`; its scope closes and the `EventSource` closes |
| A new instance with a new id appears later | Starts a fresh Stream with a fresh `EventSource`                   |

Acquisition can take time. A Stream may wait for a Promise, such as `getUserMedia`, before it emits anything, and report readiness or failure as Messages.

## Share a Resource with Commands {#accessing-managed-resources}

When Commands need the handle too, the Stream cannot keep it to itself. This Socket Block keeps one `WebSocket` per room in an `RcMap`:

::Snippet{name="resourceSocket" label="A Socket Block that keys its connections by room"}

The Layer constructor creates the `RcMap` once. `lookup` describes how to open the connection for a key and how to close it. Nothing opens until something asks for a key.

Two parts of the Block use the map:

- The `receivedData` Subscription calls `RcMap.get(connections, roomId)` inside `Stream.unwrap`. The Stream holds a reference to the room's socket for as long as it runs, which is as long as the instance is in the Model. When the Stream stops, the reference is released and the `RcMap` closes the socket.
- The `SendData` handler gets the same socket with `RcMap.get` and releases its reference with `Effect.scoped` when the send completes. Update returns `SendData({ roomId: model.roomId, data })`, so the handler finds the room through its Command args.

Two instances for the same room share one connection. A socket that closes before a send fails the send, and `FailedSendData` reports the reason to the parent as `FailedToSend`.

### Hold the Resource Block in the Parent

Chat decides when the connection exists by holding a Socket instance in `maybeSocket`:

::Snippet{name="resourceChat" label="A Chat that connects and disconnects a Socket"}

`ClickedConnect` puts `new Socket('socket', { roomId: 'general' })` in the Model, which starts its Subscription and opens the socket. `ClickedDisconnect` sets the field to `Option.none()`: the Subscription stops, any `SendData` still running is interrupted, and the socket closes.

To send, Chat sends the Socket instance a `RequestedSend` Message. The Socket's update returns the `SendData` Command, so the Command belongs to the instance and stops with it. While disconnected, `maybeSocket` is `None` and **Say hello** sends nothing.

## Test a Resource Block's Parent

Stories and scenes never run Subscriptions or Command handlers, so the real `SocketLive` opens nothing in a test: the `RcMap` is created, but no key is ever requested. Deliver the Messages the Subscription would produce with `Block.deliver`, and assert on the Commands update returns:

::Snippet{name="resourceChatStory" label="Testing Chat with its Socket"}

`Command.at('socket', ...)` selects the `SendData` returned by the instance whose id is `socket`.

## Several Resources and Nested Resources

Each instance holds its own reference. A parent that needs one socket per room holds one Socket instance per room, each created with the room's id as its instance id and args, in an array or Record. Removing one room's instance releases only that room's socket.

A Block that holds a resource can hold child Blocks of its own. Removing the outer instance stops the Subscriptions and interrupts the Commands of every instance inside it.
