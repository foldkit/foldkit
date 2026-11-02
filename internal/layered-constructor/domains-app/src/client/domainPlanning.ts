import { Option, pipe } from 'effect'
import { AsyncData } from 'foldkit'

import {
  DomainCandidateRange,
  domainTlds,
  queryToMaybeDomainLabel,
} from '../shared/domain'
import { findDomainRangeForTld, isCompleteCatalogRequired } from './domain'
import { DomainsQuery } from './domainsQuery'
import type { Model } from './model'
import { resultListings } from './resultListings'
import { findFirstPendingListingInViewport } from './resultsList'
import { routeToQuery } from './route'
import { searchViewState } from './searchViewState'

export const findNextDomainRangeToLoad = (
  model: Model,
): Option.Option<DomainCandidateRange> => {
  const search = searchViewState(model)

  if (search._tag !== 'Ready' || search.domainRequest._tag === 'Loading') {
    return Option.none()
  }

  const isCatalogFullyChecked = search.domains.length === domainTlds.length

  if (isCatalogFullyChecked) {
    return Option.none()
  }

  if (isCompleteCatalogRequired(model.availabilityFilter, model.sortOrder)) {
    const hasCompleteCatalogRequestFailed = Option.exists(
      queryToMaybeDomainLabel(routeToQuery(model.route)),
      label =>
        AsyncData.hasError(
          DomainsQuery.read(model.domainsQuery, {
            label,
            offset: 0,
            limit: domainTlds.length,
          }),
        ),
    )

    if (hasCompleteCatalogRequestFailed) {
      return Option.none()
    }

    return Option.some({ offset: 0, limit: domainTlds.length })
  }

  if (search.domainRequest._tag === 'Failed') {
    return Option.none()
  }

  return pipe(
    findFirstPendingListingInViewport(resultListings(model), model.resultsList),
    Option.flatMap(listing => findDomainRangeForTld(listing.tld)),
  )
}
