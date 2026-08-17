# Typing Terminal

A production real-time multiplayer typing speed game. Build a room, share the code, and race friends to type the same passage. It runs at [typingterminal.com](https://typingterminal.com).

The other entries in this section are single-process apps that show one feature at a time. Typing Terminal is the full picture: a Foldkit client, an Effect-based RPC server, and a shared schema package that both ends import directly.

:::Cta
[Race your friends →](https://typingterminal.com)

[View source on GitHub →](https://github.com/foldkit/foldkit/tree/main/packages/typing-game)
:::

## A full-stack Effect app

The repo splits into three packages.

- `shared/` declares Effect Schemas (`Room`, `Player`, `GameStatus`, `PlayerProgress`) and the `RoomRpcs` group built with `effect/unstable/rpc`. Both client and server import from here. There is no codegen step. Adding a field to a payload schema produces type errors on both sides at the same time.
- `server/` is a Node HTTP server built on `effect/unstable/http` and `effect/unstable/rpc`. Room state lives in `Ref<HashMap>` stores provided as Effect Services. The streaming subscription RPC pushes room updates and per-player progress to every connected client over NDJSON.
- `client/` is a Foldkit app with two routes (Home and Room) and the same Model / Message / update / view loop you have seen in the smaller examples, scaled up. The [Room Submodel](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room) coordinates the live game: it consumes the streaming RPC as a Subscription, dispatches keystroke updates as Commands, and renders the scoreboard from a derived view of the synced room state.

No new framework concepts are involved. The architecture is the same one [Counter](/example-apps/counter) uses. The interesting part is what falls out when that architecture meets a real backend: shared schemas across the wire, a typed RPC client without runtime decoders, a streaming [Subscription](/core/subscriptions) that owns reconnect logic, and [Commands](/core/commands) that map cleanly to RPC calls.

## What’s in it

- Multiplayer rooms with hosts and joiners, joined by a short room code
- A `Waiting | GetReady | Countdown | Playing | Finished` state machine modelled as a discriminated union on the server, mirrored on the client
- Live progress streaming: every keystroke from every player flows through the same RPC stream and updates the scoreboard in real time
- Per-player WPM and accuracy scoring computed on the server
- Reconnect-tolerant subscriptions with pending-cleanup tracking so a brief disconnect does not drop you from the room
