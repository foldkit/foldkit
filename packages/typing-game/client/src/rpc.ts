// @ts-nocheck
import { RoomRpcs } from '@typing-game/shared'
import { Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import { RpcClient, RpcSerialization } from 'effect/unstable/rpc'

import { ViteEnvConfig } from './config'

const ProtocolLive = Effect.gen(function* () {
  const { VITE_SERVER_URL } = yield* ViteEnvConfig
  const url = `${VITE_SERVER_URL}/rpc`
  return RpcClient.layerProtocolHttp({ url })
}).pipe(
  Effect.provide(ViteEnvConfig.Default),
  Layer.unwrapEffect,
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
)

export class RoomsClient extends Effect.Service<RoomsClient>()('RoomsClient', {
  scoped: RpcClient.make(RoomRpcs),
  dependencies: [ProtocolLive],
}) {}
