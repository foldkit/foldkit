import { Array, Effect, pipe } from 'effect'

import { makeDemoDomains } from '../shared/demoDomains'
import { domainTlds } from '../shared/domain'
import { DomainsRpcs } from '../shared/domainsRpc'

export const SearchHandlersLayer = DomainsRpcs.toLayer({
  SearchDomains: ({ label, offset = 0, limit = domainTlds.length }) =>
    Effect.sync(() =>
      pipe(makeDemoDomains(label), Array.drop(offset), Array.take(limit)),
    ),
})
