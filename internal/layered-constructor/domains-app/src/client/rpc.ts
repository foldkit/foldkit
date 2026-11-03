import { Context, Layer } from 'effect'
import { RpcClient, RpcClientError, RpcSerialization } from 'effect/rpc'
import { Http } from 'foldkit'

import { DOMAINS_RPC_PATH, DomainsRpcs } from '../shared/domainsRpc'

type DomainsRpcClient = RpcClient.FromGroup<
  typeof DomainsRpcs,
  RpcClientError.RpcClientError
>

export class DomainsClient extends Context.Service<
  DomainsClient,
  DomainsRpcClient
>()('domains/DomainsClient') {}

export const makeDomainsClientLayer = (url: string) =>
  Layer.effect(DomainsClient, RpcClient.make(DomainsRpcs)).pipe(
    Layer.provide(RpcClient.layerProtocolHttp({ url })),
    Layer.provide([Http.layer, RpcSerialization.layerJson]),
  )

export const DomainsClientLayer = makeDomainsClientLayer(DOMAINS_RPC_PATH)
