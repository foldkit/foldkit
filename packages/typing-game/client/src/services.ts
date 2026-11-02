import { Context, Effect, Layer, Option } from 'effect'
import { FetchHttpClient } from 'effect/http'
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { RoomRpcs } from '@typing-game/shared'

type RoomsRpcClient = RpcClient.FromGroup<
  typeof RoomRpcs,
  RpcClientError.RpcClientError
>

export class RoomsClient extends Context.Service<RoomsClient, RoomsRpcClient>()(
  'RoomsClient',
) {}

const ProtocolLayer = Layer.unwrap(
  Effect.sync(() => {
    const serverUrl = Option.getOrThrowWith(
      Option.fromNullishOr(import.meta.env.VITE_SERVER_URL),
      () => new Error('VITE_SERVER_URL environment variable is not set'),
    )

    return RpcClient.layerProtocolHttp({ url: `${serverUrl}/rpc` })
  }),
).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]))

const RoomsClientLayer = Layer.effect(
  RoomsClient,
  RpcClient.make(RoomRpcs),
).pipe(Layer.provide(ProtocolLayer))

export const ApplicationLayer = Layer.mergeAll(
  RoomsClientLayer,
  BrowserKeyValueStore.layerSessionStorage,
)
