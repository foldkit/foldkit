import { Schema } from 'effect'
import { Rpc, RpcGroup } from 'effect/rpc'
import { defineTaggedUnion } from 'foldkit/schema'

import { Domain, DomainCandidateRange, DomainLabel } from './domain'

export const DOMAINS_RPC_PATH = '/rpc'

export const SearchError = defineTaggedUnion({ Unavailable: {} })
export type SearchError = typeof SearchError.Type

export const DomainsRpcs = RpcGroup.make(
  Rpc.make('SearchDomains', {
    payload: {
      label: DomainLabel,
      offset: Schema.optionalKey(DomainCandidateRange.fields.offset),
      limit: Schema.optionalKey(DomainCandidateRange.fields.limit),
    },
    success: Schema.Array(Domain),
    error: SearchError,
  }),
)
