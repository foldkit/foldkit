import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r, slash, string } from 'foldkit/route'

export const HomeRoute = r('Home')
export const PostsRoute = r('Posts')
export const PostRoute = r('Post', { slug: S.String })
export const NotFoundRoute = r('NotFound', { path: S.String })

export const AppRoute = S.Union([
  HomeRoute,
  PostsRoute,
  PostRoute,
  NotFoundRoute,
])

export type HomeRoute = typeof HomeRoute.Type
export type PostsRoute = typeof PostsRoute.Type
export type PostRoute = typeof PostRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

export const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))

export const postsRouter = pipe(literal('posts'), Route.mapTo(PostsRoute))

export const postRouter = pipe(
  literal('posts'),
  slash(string('slug')),
  Route.mapTo(PostRoute),
)

const routeParser = Route.oneOf(postRouter, postsRouter, homeRouter)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  NotFoundRoute,
)

export const isPostOrPosts = (
  route: AppRoute,
): route is PostsRoute | PostRoute =>
  route._tag === 'Posts' || route._tag === 'Post'
