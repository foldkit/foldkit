import { Array, Number, Option, String } from 'effect'
import { Update } from 'foldkit'

import { domainTlds, queryToMaybeDomainLabel } from '../../shared/domain'
import { ReplaceSearchUrl } from '../command'
import { DomainsQueryBinding } from '../composition'
import {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from '../definition'
import { TOP_RESULT_COUNT, isCompleteCatalogRequired } from '../domain'
import { DomainsQuery } from '../domainsQuery'
import { routeToQuery } from '../route'
import { searchViewState } from '../searchViewState'
import { requestDomainRange } from './domainRequests'
import { informResultsList, resetResultsList } from './resultsList'

export const cancelSearch = makeStep(model =>
  Update.combineSteps(
    Array.map(DomainsQuery.pendingArgs(model.domainsQuery), args =>
      DomainsQueryBinding.requestCancel(args),
    ),
  ),
)

const invalidateSearch = (query: string) =>
  Update.combineSteps([
    cancelSearch,
    makeFieldsStep(() => ({
      searchGeneration: Number.increment,
      searchLayout: currentLayout =>
        String.isNonEmpty(query) ? 'Search' : currentLayout,
    })),
  ])

export const searchQuery = (query: string, isRefreshRequested = false) =>
  Update.combineSteps([
    invalidateSearch(query),
    makeFieldsStep(() => ({ selectedDomainRanges: () => [] })),
    makeStep(model =>
      Option.isSome(queryToMaybeDomainLabel(query))
        ? requestDomainRange(
            { offset: 0, limit: TOP_RESULT_COUNT },
            isRefreshRequested,
          )
        : { model },
    ),
    String.isEmpty(query) ? resetResultsList : informResultsList,
  ])

export const changeSearchQuery = (query: string) =>
  makeStep(model => {
    const isQueryChanged = query !== routeToQuery(model.route)

    return Update.combineSteps([
      isQueryChanged ? invalidateSearch(query) : makeNoopStep(),
      makeCommandsStep(() => [
        ReplaceSearchUrl({ q: Option.liftPredicate(query, String.isNonEmpty) }),
      ]),
    ])
  })

export const clearSearch = changeSearchQuery('')

export const retrySearch = makeStep(model => {
  const search = searchViewState(model)

  if (search._tag === 'Ready' && search.domainRequest._tag === 'Failed') {
    const range = isCompleteCatalogRequired(
      model.availabilityFilter,
      model.sortOrder,
    )
      ? { offset: 0, limit: domainTlds.length }
      : search.domainRequest

    return requestDomainRange(range, true)
  } else {
    return searchQuery(routeToQuery(model.route), true)
  }
})
