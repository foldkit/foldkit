import { Cause, Effect, Schema } from 'effect'
import { Query } from 'foldkit/experimental'

import { Domain, DomainCandidateRange, DomainLabel } from '../shared/domain'
import { DomainsClient } from './rpc'

const SEARCH_DEBOUNCE = '150 millis'
const SEARCH_TIMEOUT = '20 seconds'

export const DomainsQueryArgs = Schema.Struct({
  label: DomainLabel,
  ...DomainCandidateRange.fields,
})
export type DomainsQueryArgs = typeof DomainsQueryArgs.Type

export const DomainsQueryFailure = Schema.Struct({ error: Schema.String })
export type DomainsQueryFailure = typeof DomainsQueryFailure.Type

export const fetchDomains = (args: DomainsQueryArgs) => {
  const unavailable = () =>
    Effect.fail(
      DomainsQueryFailure.make({
        error: 'Could not load sample domains. Please try again.',
      }),
    )

  return Effect.gen(function* () {
    const client = yield* DomainsClient

    if (args.offset === 0) {
      yield* Effect.sleep(SEARCH_DEBOUNCE)
    }

    return yield* client.SearchDomains(args)
  }).pipe(
    Effect.timeout(SEARCH_TIMEOUT),
    Effect.catch(unavailable),
    Effect.catchDefect(defect =>
      Effect.logError(
        'Domain lookup failed unexpectedly',
        Cause.die(defect),
      ).pipe(Effect.andThen(unavailable())),
    ),
  )
}

export const DomainsQuery = Query.define({
  name: 'DomainsQuery',
  args: DomainsQueryArgs.fields,
  data: Schema.Array(Domain),
  error: DomainsQueryFailure,
  staleTime: '1 minute',
  maxSettledEntries: 100,
  notifyOnCompletion: true,
  handler: function* () {
    return fetchDomains
  },
})

export type DomainsQueryCompletedFetch =
  typeof DomainsQuery.OutMessage.CompletedFetch.Type
