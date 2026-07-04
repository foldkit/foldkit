import { Schema as S } from 'effect'
import { mapTo, oneOf, parseUrlWithFallback, r } from 'foldkit/route'

const HomeRoute = r('HomeRoute')
const TaskRoute = r('TaskRoute')
const NotFoundRoute = r('NotFoundRoute')

const AppRoute = S.Union([HomeRoute, TaskRoute, NotFoundRoute])

const homeRouter = mapTo(HomeRoute)

// ❌ Bad
// TaskRoute is in the union but no Router parses it, and it is not the
// fallback, so /task/... silently resolves to NotFound.
const routeParser = oneOf(homeRouter)
parseUrlWithFallback(routeParser, NotFoundRoute)

// ✅ Good
const taskRouter = mapTo(TaskRoute)
const routeParserFixed = oneOf(homeRouter, taskRouter)
parseUrlWithFallback(routeParserFixed, NotFoundRoute)
