import { NodeHttpServer, NodeRuntime } from '@effect/platform-node'
import * as Shared from '@typing-game/shared'
import { Effect, Layer, pipe } from 'effect'
import { HttpMiddleware, HttpRouter, HttpServer } from 'effect/unstable/http'
import { RpcSerialization, RpcServer } from 'effect/unstable/rpc'
import { createServer } from 'node:http'

import {
  createRoom,
  getRoomById,
  joinRoom,
  startGame,
  subscribeToRoom,
  updatePlayerProgress,
} from './handler/index.js'
import {
  PendingCleanupPlayerIdsStore,
  PendingCleanupPlayerIdsStoreLive,
  ProgressByGamePlayerStore,
  ProgressByGamePlayerStoreLive,
  RoomByIdStore,
  RoomByIdStoreLive,
} from './store.js'

const RoomLive = Shared.RoomRpcs.toLayer(
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

const RpcAppLayer = RpcServer.layerHttp({
  group: Shared.RoomRpcs,
  path: '/rpc',
}).pipe(
  Layer.provide(RoomLive),
  Layer.provide(RpcSerialization.layerNdjson),
  Layer.provide(RoomByIdStoreLive),
  Layer.provide(ProgressByGamePlayerStoreLive),
  Layer.provide(PendingCleanupPlayerIdsStoreLive),
)

const HttpAppLive = Layer.unwrap(
  pipe(
    HttpRouter.toHttpEffect(RpcAppLayer),
    Effect.map(httpEffect =>
      HttpServer.serve(HttpMiddleware.cors())(httpEffect),
    ),
  ),
)

const Main = HttpAppLive.pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: 3001 })),
)

NodeRuntime.runMain(Layer.launch(Main))
