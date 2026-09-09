# Typing Terminal

Typing Terminal is a production multiplayer typing game built with Foldkit and Effect. Create a room, share its code, and race against friends on the same passage. The deployed application runs at [typingterminal.com](https://typingterminal.com).

Most examples in this section isolate one framework feature. Typing Terminal combines a Foldkit client, an Effect-based RPC server, and a shared Schema package imported by both.

:::Cta
[Race your friends →](https://typingterminal.com)

[View source on GitHub →](https://github.com/foldkit/foldkit/tree/main/packages/typing-game)
:::

## Full-Stack Architecture

The repo splits into three packages.

- `shared/` declares the `Room`, `Player`, `GameStatus`, and `PlayerProgress` Schemas and the `RoomRpcs` group from `effect/unstable/rpc`. Client and server import the same definitions. The RPC protocol derives its payload and result codecs from those Schemas without a code-generation step.
- `server/` is a Node HTTP server built with `effect/unstable/http` and `effect/unstable/rpc`. Room and progress state live in `SubscriptionRef<HashMap>` stores provided as Effect services. A streaming RPC sends room and player-progress updates over NDJSON. A separate `Ref<HashSet>` tracks players awaiting delayed disconnect cleanup.
- `client/` is a Foldkit application with Home and Room routes. The [Room Submodel](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room) consumes the streaming RPC through a Subscription, sends player-progress updates through Commands, and renders the scoreboard from the synchronized room state.

The application uses the same Foldkit architecture as the [Counter](/example-apps/counter). The larger example shows how shared Schemas define an RPC boundary, how a streaming [Subscription](/core/subscriptions) follows a room session, and how [Commands](/core/commands) map user actions to RPC calls. The server delays disconnect cleanup for two seconds, allowing a reconnect to cancel the pending removal.

## Features

- Multiplayer rooms with hosts and joiners, joined by a short room code
- A `Waiting | GetReady | Countdown | Playing | Finished` state machine modelled as a discriminated union on the server, mirrored on the client
- Live progress streaming: keystrokes update player progress through RPC, and the room stream broadcasts the latest scoreboard state
- Per-player WPM and accuracy scoring computed on the server
- Reconnect-tolerant subscriptions with pending-cleanup tracking so a brief disconnect does not drop you from the room
