import { Match } from 'effect'

import { DomainListing, filterAndSortDomainListings } from './domain'
import { Model } from './model'
import { routeToQuery } from './route'
import { searchViewState } from './searchViewState'

export const resultListings = (model: Model): ReadonlyArray<DomainListing> =>
  Match.value(searchViewState(model)).pipe(
    Match.tag('Idle', 'Loading', () =>
      filterAndSortDomainListings(
        routeToQuery(model.route),
        [],
        model.tldFilter,
        model.availabilityFilter,
        model.sortOrder,
      ),
    ),
    Match.tag('Ready', ({ domains }) =>
      filterAndSortDomainListings(
        routeToQuery(model.route),
        domains,
        model.tldFilter,
        model.availabilityFilter,
        model.sortOrder,
      ),
    ),
    Match.tag('Failed', () => []),
    Match.exhaustive,
  )
