import { Array, Effect, Option, Schema, String, pipe } from 'effect'
import { AsyncData } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  Domain,
  DomainCandidateRange,
  queryToMaybeDomainLabel,
} from '../shared/domain'
import { mergeDomainsByName } from './domain'
import { DomainsQuery } from './domainsQuery'
import type { Model } from './model'
import { routeToQuery } from './route'

export const DomainRequestPresentation = defineTaggedUnion({
  Idle: {},
  Loading: DomainCandidateRange.fields,
  Failed: { ...DomainCandidateRange.fields, error: Schema.String },
})
export type DomainRequestPresentation = typeof DomainRequestPresentation.Type

export const SearchViewState = defineTaggedUnion({
  Idle: {},
  Loading: {},
  Ready: {
    domains: Schema.Array(Domain),
    domainRequest: DomainRequestPresentation.pipe(
      Schema.withConstructorDefault(
        Effect.succeed(DomainRequestPresentation.Idle()),
      ),
    ),
  },
  Failed: { error: Schema.String },
})
export type SearchViewState = typeof SearchViewState.Type

export const searchViewState = (model: Model): SearchViewState => {
  const query = routeToQuery(model.route)

  if (String.isEmpty(query)) {
    return SearchViewState.Idle()
  }

  const maybeLabel = queryToMaybeDomainLabel(query)

  if (Option.isNone(maybeLabel)) {
    return SearchViewState.Failed({
      error:
        'Enter a domain name using letters, numbers, and hyphens (up to 63 characters).',
    })
  }

  const rangeQueries = Array.map(model.selectedDomainRanges, range => ({
    range,
    data: DomainsQuery.read(model.domainsQuery, {
      label: maybeLabel.value,
      ...range,
    }),
  }))
  const domains = Array.reduce(
    rangeQueries,
    Array.empty<Domain>(),
    (checkedDomains, { data }) =>
      AsyncData.isPending(data)
        ? checkedDomains
        : Option.match(AsyncData.getData(data), {
            onNone: () => checkedDomains,
            onSome: incoming => mergeDomainsByName(checkedDomains, incoming),
          }),
  )
  const maybePendingRangeQuery = Array.findFirst(rangeQueries, ({ data }) =>
    AsyncData.isPending(data),
  )
  const maybeFailure = pipe(
    rangeQueries,
    Array.findLast(({ data }) => AsyncData.hasError(data)),
    Option.flatMap(({ range, data }) =>
      Option.map(AsyncData.getError(data), failure => ({
        ...range,
        error: failure.error,
      })),
    ),
  )
  const isAnyRangeChecked = Array.some(
    rangeQueries,
    ({ data }) => AsyncData.hasData(data) && !AsyncData.isPending(data),
  )

  if (!isAnyRangeChecked) {
    return Option.match(maybeFailure, {
      onNone: SearchViewState.Loading,
      onSome: ({ error }) => SearchViewState.Failed({ error }),
    })
  }

  const domainRequest = Option.match(maybePendingRangeQuery, {
    onSome: ({ range }) => DomainRequestPresentation.Loading(range),
    onNone: () =>
      Option.match(maybeFailure, {
        onNone: DomainRequestPresentation.Idle,
        onSome: failure => DomainRequestPresentation.Failed(failure),
      }),
  })

  return SearchViewState.Ready({ domains, domainRequest })
}
