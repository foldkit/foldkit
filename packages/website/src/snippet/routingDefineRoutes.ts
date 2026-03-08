import { Schema as S } from 'effect'
import { r } from 'foldkit/route'

const HomeRoute = r('Home')
const PeopleRoute = r('People', { searchText: S.Option(S.String) })
const PersonRoute = r('Person', { personId: S.Number })
const NotFoundRoute = r('NotFound', { path: S.String })

const AppRoute = S.Union(HomeRoute, PeopleRoute, PersonRoute, NotFoundRoute)

type AppRoute = typeof AppRoute.Type
