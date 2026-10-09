import { Context, Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/http'
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc'

import { RoomRpcs } from '@typing-game/shared'

import { ViteEnvConfig, ViteEnvConfigLayer } from './config.js'

type RoomsRpcClient = RpcClient.FromGroup<
  typeof RoomRpcs,
  RpcClientError.RpcClientError
>

export class RoomsClient extends Context.Service<RoomsClient, RoomsRpcClient>()(
  'RoomsClient',
) {}

const ProtocolLayer = Layer.unwrap(
  Effect.gen(function* () {
    const { VITE_SERVER_URL } = yield* ViteEnvConfig
    const url = `${VITE_SERVER_URL}/rpc`
    return RpcClient.layerProtocolHttp({ url })
  }),
).pipe(
  Layer.provide(ViteEnvConfigLayer),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
)

export const RoomsClientLayer = Layer.effect(
  RoomsClient,
  RpcClient.make(RoomRpcs),
).pipe(Layer.provide(ProtocolLayer))
