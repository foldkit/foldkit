import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const ApplicationRoute = defineRouteUnion({
  Home: {},
  Posts: {},
  Post: { slug: Schema.String },
  NotFound: { path: Schema.String },
})
export type ApplicationRoute = typeof ApplicationRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(ApplicationRoute.Home))

export const postsRouter = pipe(
  literal('posts'),
  Route.mapTo(ApplicationRoute.Posts),
)

export const postRouter = pipe(
  literal('posts'),
  slash(string('slug')),
  Route.mapTo(ApplicationRoute.Post),
)

const routeParser = Route.oneOf(postRouter, postsRouter, homeRouter)

export const urlToApplicationRoute = Route.parseUrlWithFallback(
  routeParser,
  ApplicationRoute.NotFound,
)

export const isPostOrPosts = ApplicationRoute.isAnyOf(['Posts', 'Post'])
