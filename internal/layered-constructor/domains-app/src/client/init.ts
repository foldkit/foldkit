import { String } from 'effect'
import { Url } from 'foldkit'

import { ReleaseEarlySearchListeners } from './command'
import { ApplicationComposition } from './composition'
import { routeToQuery, urlToApplicationRoute } from './route'
import { searchQuery } from './steps'

export const init = ApplicationComposition.makeInit((url: Url.Url) => {
  const route = urlToApplicationRoute(url)
  const query = routeToQuery(route)

  return {
    model: {
      route,
      searchLayout: String.isNonEmpty(query) ? 'Search' : 'Landing',
      searchGeneration: 0,
      selectedDomainRanges: [],
      tldFilter: 'All',
      tldSearchQuery: '',
      availabilityFilter: 'All',
      sortOrder: 'Relevance',
      cart: [],
    },
    commands: [ReleaseEarlySearchListeners()],
    steps: [searchQuery(query)],
  }
})
