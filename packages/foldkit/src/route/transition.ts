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

const hasTag =
  <Tag extends string>(routeTag: Tag) =>
  <Route extends Readonly<{ _tag: string }>>(
    route: Route,
  ): route is Extract<Route, { _tag: Tag }> =>
    route._tag === routeTag

/** The single-route, payload-carrying form of {@link entered}: `Some` of
 *  the entered route, narrowed to the given tag, when this transition
 *  entered it, and `None` otherwise. The entry Command for a detail route
 *  usually needs the route's payload, and this returns it typed. */
export const enteredRoute = <
  Route extends Readonly<{ _tag: string }>,
  Tag extends Route['_tag'],
>(
  transition: Transition<Route>,
  routeTag: Tag,
): Option.Option<Extract<Route, { _tag: Tag }>> =>
  Option.filter(entered(transition), hasTag(routeTag))

/** The route a transition left, if it left one: `Some(previousRoute)`
 *  when the previous route's tag differs from the next route's, `None` on
 *  a cold load or when the transition stayed within one route. For
 *  one-shot Commands on the way out, saving a draft, recording that a
 *  visit ended. Things that live while a route is active, listeners,
 *  timers, handles, belong to a Subscription or ManagedResource condition
 *  on the Model instead, which also ends them when the route state
 *  disappears for reasons other than navigation. */
export const exited = <Route extends Readonly<{ _tag: string }>>({
  maybePreviousRoute,
  nextRoute,
}: Transition<Route>): Option.Option<Route> =>
  Option.filter(
    maybePreviousRoute,
    previousRoute => previousRoute._tag !== nextRoute._tag,
  )

/** The single-route, payload-carrying form of {@link exited}: `Some` of
 *  the exited route, narrowed to the given tag, when this transition left
 *  it, and `None` otherwise. */
export const exitedRoute = <
  Route extends Readonly<{ _tag: string }>,
  Tag extends Route['_tag'],
>(
  transition: Transition<Route>,
  routeTag: Tag,
): Option.Option<Extract<Route, { _tag: Tag }>> =>
  Option.filter(exited(transition), hasTag(routeTag))

/** Both sides of a within-route navigation: `Some` of the previous and
 *  next routes, narrowed to the given tag, when the transition stayed on
 *  that route, and `None` when it entered it, left it, or never touched
 *  it. A cold load stays nowhere. For reacting to payload changes within
 *  one route, a detail id, a search text, when the previous value
 *  matters; when it does not, the ChangedUrl handler already has the next
 *  route. */
export const stayed = <
  Route extends Readonly<{ _tag: string }>,
  Tag extends Route['_tag'],
>(
  transition: Transition<Route>,
  routeTag: Tag,
): Option.Option<
  Readonly<{
    previousRoute: Extract<Route, { _tag: Tag }>
    nextRoute: Extract<Route, { _tag: Tag }>
  }>
> => {
  const { maybePreviousRoute, nextRoute } = transition
  const isTagged = hasTag(routeTag)
  return Option.flatMap(maybePreviousRoute, previousRoute =>
    isTagged(previousRoute) && isTagged(nextRoute)
      ? Option.some({ previousRoute, nextRoute })
      : Option.none(),
  )
}

/** Predicate for "this transition entered the given route": the next
 *  route carries the tag and the previous route did not (a cold load
 *  counts as an entry). Navigating within the same route, for example
 *  between two ids of one detail route, is not an entry. The boolean
 *  view of {@link enteredRoute}: when the entry Command needs the
 *  route's payload, use that instead. The route union is inferred from
 *  the transition argument, so the tag is checked against the union's
 *  tags. */
export const isEntering = <
  Route extends Readonly<{ _tag: string }>,
  Tag extends Route['_tag'],
>(
  transition: Transition<Route>,
  routeTag: Tag,
): boolean => Option.isSome(enteredRoute(transition, routeTag))
