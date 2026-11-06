import { Effect, Layer, pipe } from 'effect'
import { HttpMiddleware, HttpRouter, HttpServer } from 'effect/http'
import { RpcSerialization, RpcServer } from 'effect/rpc'
import { createServer } from 'node:http'

import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import * as Shared from '@typing-game/shared'

import {
  createRoom,
  getRoomById,
  joinRoom,
  startGame,
  subscribeToRoom,
  updatePlayerProgress,
} from './handler/index.ts'
import {
  PendingCleanupPlayerIdsStore,
  PendingCleanupPlayerIdsStoreLayer,
  ProgressByGamePlayerStore,
  ProgressByGamePlayerStoreLayer,
  RoomByIdStore,
  RoomByIdStoreLayer,
} from './store.ts'

const RoomHandlersLayer = Shared.RoomRpcs.toLayer(
  Effect.gen(function* () {
    const roomByIdRef = yield* RoomByIdStore
    const progressByGamePlayerRef = yield* ProgressByGamePlayerStore
    const pendingCleanupPlayerIdsRef = yield* PendingCleanupPlayerIdsStore

    return {
      createRoom: createRoom(roomByIdRef),
      joinRoom: joinRoom(roomByIdRef),
      getRoomById: getRoomById(roomByIdRef),
      subscribeToRoom: subscribeToRoom(
        roomByIdRef,
        progressByGamePlayerRef,
        pendingCleanupPlayerIdsRef,
      ),
      startGame: startGame(roomByIdRef, progressByGamePlayerRef),
      updatePlayerProgress: updatePlayerProgress(progressByGamePlayerRef),
    }
  }),
)

const RpcApplicationLayer = RpcServer.layerHttp({
  group: Shared.RoomRpcs,
  path: '/rpc',
  protocol: 'http',
}).pipe(
  Layer.provide(RoomHandlersLayer),
  Layer.provide(
    Layer.mergeAll(
      RpcSerialization.layerNdjson,
      RoomByIdStoreLayer,
      ProgressByGamePlayerStoreLayer,
      PendingCleanupPlayerIdsStoreLayer,
    ),
  ),
)

const HttpApplicationLayer = Layer.unwrap(
  pipe(
    HttpRouter.toHttpEffect(RpcApplicationLayer),
    Effect.map(HttpServer.serve(HttpMiddleware.cors())),
  ),
)

const Server = HttpApplicationLayer.pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)

NodeRuntime.runMain(Layer.launch(Server))
