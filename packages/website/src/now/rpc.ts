import { FetchHttpClient } from '@effect/platform'
import { RpcClient, RpcSerialization } from '@effect/rpc'
import { NowRpcs } from '@foldkit/now-shared'
import { Effect, Layer } from 'effect'

import { NowEnvConfig } from './config'

const ProtocolLive = Effect.gen(function* () {
  const { VITE_NOW_SERVER_URL } = yield* NowEnvConfig
  const url = `${VITE_NOW_SERVER_URL}/rpc`
  return RpcClient.layerProtocolHttp({ url })
}).pipe(
  Effect.provide(NowEnvConfig.Default),
  Layer.unwrapEffect,
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]),
)

export class NowClient extends Effect.Service<NowClient>()('NowClient', {
  scoped: RpcClient.make(NowRpcs),
  dependencies: [ProtocolLive],
}) {}
