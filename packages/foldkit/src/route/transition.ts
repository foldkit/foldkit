import { Option } from 'effect'

/** A route change: where the application was and where it is now.
 *  `maybePreviousRoute` is `None` on the first render (a cold load), which
 *  {@link isEntering} treats as an entry. Build one wherever the
 *  application handles its ChangedUrl Message and hand it to per-cache
 *  step functions so `init` and navigation share one loading policy. */
export type RouteTransition<Route> = Readonly<{
  maybePreviousRoute: Option.Option<Route>
  nextRoute: Route
}>

/** Predicate for "this transition entered the given route": the next
 *  route carries the tag and the previous route did not (a cold load
 *  counts as an entry). Navigating within the same route, for example
 *  between two ids of one detail route, is not an entry.
 *
 *  Pin the application's route union once and alias it:
 *
 *  ```ts
 *  export const isEntering = Route.isEntering<AppRoute>
 *  ``` */
export const isEntering =
  <Route extends Readonly<{ _tag: string }>>(routeTag: Route['_tag']) =>
  ({ maybePreviousRoute, nextRoute }: RouteTransition<Route>): boolean =>
    nextRoute._tag === routeTag &&
    Option.match(maybePreviousRoute, {
      onNone: () => true,
      onSome: previous => previous._tag !== routeTag,
    })
