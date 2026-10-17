import { Context, Effect, Layer, Option } from 'effect'
import { FetchHttpClient } from 'effect/http'
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc'

import { RoomRpcs } from '@typing-game/shared'

const getNullableOrThrow = <T>(
  value: T | null | undefined,
  errorMessage: string,
): T =>
  Option.fromNullishOr(value).pipe(
    Option.getOrThrowWith(() => new Error(errorMessage)),
  )

interface ViteEnvConfigShape {
  readonly VITE_SERVER_URL: string
}

class ViteEnvConfig extends Context.Service<
  ViteEnvConfig,
  ViteEnvConfigShape
>()('ViteEnvConfig') {}

const ViteEnvConfigLayer = Layer.effect(
  ViteEnvConfig,
  Effect.sync(() =>
    ViteEnvConfig.of({
      VITE_SERVER_URL: getNullableOrThrow(
        import.meta.env.VITE_SERVER_URL,
        'VITE_SERVER_URL environment variable is not set',
      ),
    }),
  ),
)

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
