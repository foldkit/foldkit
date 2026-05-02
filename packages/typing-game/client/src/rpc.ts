import { RoomRpcs } from '@typing-game/shared'
import { Context, Effect, Layer } from 'effect'
import { FetchHttpClient } from 'effect/unstable/http'
import {
  RpcClient,
  RpcClientError,
  RpcSerialization,
} from 'effect/unstable/rpc'

import { ViteEnvConfig, ViteEnvConfigLive } from './config.js'

type RoomsRpcClient = RpcClient.FromGroup<
  typeof RoomRpcs,
  RpcClientError.RpcClientError
>

export class RoomsClient extends Context.Service<RoomsClient, RoomsRpcClient>()(
  'RoomsClient',
) {}

const ProtocolLive = Layer.unwrap(
  Effect.gen(function* () {
    const { VITE_SERVER_URL } = yield* ViteEnvConfig
    const url = `${VITE_SERVER_URL}/rpc`
    return RpcClient.layerProtocolHttp({ url })
  }),
).pipe(
  Layer.provide(ViteEnvConfigLive),
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
)

export const RoomsClientLive = Layer.effect(
  RoomsClient,
  RpcClient.make(RoomRpcs),
).pipe(Layer.provide(ProtocolLive))
