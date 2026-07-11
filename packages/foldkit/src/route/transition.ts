import { Option } from 'effect'

/** A route change: where the application was and where it is now.
 *  `maybePreviousRoute` is `None` on the first render (a cold load), which
 *  {@link isEntering} treats as an entry. Build one with {@link coldLoad}
 *  in `init` and with {@link make} wherever the application handles its
 *  ChangedUrl Message, then hand it to per-cache step functions so `init`
 *  and navigation share one loading policy. */
export type Transition<Route> = Readonly<{
  maybePreviousRoute: Option.Option<Route>
  nextRoute: Route
}>

/** Builds the {@link Transition} for an in-app navigation, from the route
 *  the Model still holds to the route the new URL parsed to. Arguments
 *  read in travel order: previous first, next second. */
export const make = <Route>(
  previousRoute: Route,
  nextRoute: Route,
): Transition<Route> => ({
  maybePreviousRoute: Option.some(previousRoute),
  nextRoute,
})

/** Builds the {@link Transition} for a cold load (a direct visit, a
 *  bookmark, a reload). There is no previous route, so {@link isEntering}
 *  counts the transition as an entry. */
export const coldLoad = <Route>(nextRoute: Route): Transition<Route> => ({
  maybePreviousRoute: Option.none(),
  nextRoute,
})

/** The route a transition entered, if it entered one: `Some(nextRoute)`
 *  when the next route's tag differs from the previous route's (a cold
 *  load counts as an entry), `None` when the transition stayed within one
 *  route, for example between two ids of one detail route. Match on the
 *  result to dispatch entry Commands for many routes in one place; for a
 *  single route, {@link isEntering} is the plain predicate form. */
export const entered = <Route extends Readonly<{ _tag: string }>>({
  maybePreviousRoute,
  nextRoute,
}: Transition<Route>): Option.Option<Route> =>
  Option.match(maybePreviousRoute, {
    onNone: () => Option.some(nextRoute),
    onSome: previous =>
      previous._tag === nextRoute._tag ? Option.none() : Option.some(nextRoute),
  })

/** Predicate for "this transition entered the given route": the next
 *  route carries the tag and the previous route did not (a cold load
 *  counts as an entry). Navigating within the same route, for example
 *  between two ids of one detail route, is not an entry.
 *
 *  Pin the application's route union once and alias it:
 *
 *  ```ts
 *  export const isEntering = Transition.isEntering<AppRoute>
 *  ``` */
export const isEntering =
  <Route extends Readonly<{ _tag: string }>>(routeTag: Route['_tag']) =>
  (transition: Transition<Route>): boolean =>
    Option.exists(entered(transition), route => route._tag === routeTag)
