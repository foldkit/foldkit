import { Match, Option } from 'effect'
import type { Url } from 'foldkit/url'

import { ApplicationComposition } from './composition'
import { ApplicationRoute, urlToApplicationRoute } from './route'

export const init = ApplicationComposition.makeInit((url: Url) => {
  const route = urlToApplicationRoute(url)

  const initialPeopleRoute = Match.value(route).pipe(
    Match.tag('People', peopleRoute => peopleRoute),
    Match.orElse(() => ApplicationRoute.People({ searchText: Option.none() })),
  )

  return {
    startup: initialPeopleRoute,
    model: { route },
  }
})
