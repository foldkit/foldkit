import { Schema, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const AppRoute = defineRouteUnion({
  Home: {},
  Posts: {},
  Post: { slug: Schema.String },
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

export const postsRouter = pipe(literal('posts'), Route.mapTo(AppRoute.Posts))

export const postRouter = pipe(
  literal('posts'),
  slash(string('slug')),
  Route.mapTo(AppRoute.Post),
)

const routeParser = Route.oneOf(postRouter, postsRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)

export const isPostOrPosts = AppRoute.isAnyOf(['Posts', 'Post'])
