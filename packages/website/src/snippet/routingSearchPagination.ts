import { Effect, Equal, Option, Schema, pipe } from 'effect'
import { Route, Update } from 'foldkit'
import { Transition, defineRouteUnion, literal } from 'foldkit/route'

const AppRoute = defineRouteUnion({
  Search: {
    q: Schema.Option(Schema.String),
    page: Schema.Number,
    sort: Schema.Option(Schema.Literals(['Relevance', 'Newest'])),
  },
})

const searchRouter = pipe(
  literal('search'),
  Route.query(
    Schema.Struct({
      q: Schema.OptionFromOptional(Schema.String),
      page: Schema.FiniteFromString.pipe(
        Schema.withDecodingDefaultKey(Effect.succeed('1')),
      ),
      sort: Schema.OptionFromOptional(Schema.Literals(['Relevance', 'Newest'])),
    }),
  ),
  Route.mapTo(AppRoute.Search),
)

type SearchRoute = typeof AppRoute.Search.Type
type SearchStep = Update.Step<Model, Message>

const haveSearchCriteriaChangedInline = (
  previousRoute: SearchRoute,
  nextRoute: SearchRoute,
): boolean =>
  !Equal.equals(previousRoute.q, nextRoute.q) ||
  previousRoute.page !== nextRoute.page

const loadSearch =
  (route: SearchRoute): SearchStep =>
  model => ({
    model,
    commands: [
      FetchSearch({
        q: Option.getOrElse(route.q, () => ''),
        page: route.page,
      }),
    ],
  })

const keepModel: SearchStep = model => ({ model })

const reconcileSearchRoute = (
  transition: Transition.Transition<typeof AppRoute.Type>,
): SearchStep =>
  Transition.matchOrElse<SearchStep>()(
    transition,
    'Search',
    {
      Entered: loadSearch,
      Stayed: ({ previousRoute, nextRoute }) =>
        haveSearchCriteriaChangedInline(previousRoute, nextRoute)
          ? loadSearch(nextRoute)
          : keepModel,
    },
    () => keepModel,
  )
