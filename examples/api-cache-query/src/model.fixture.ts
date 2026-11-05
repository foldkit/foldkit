import { Effect, Option, Result } from 'effect'
import { Command, given, init, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import { makeMethods } from '@effect/vitest'

import type { Post, PostDetail, Stats } from './data'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { type Model } from './model'
import { postQuery, postsQuery, statsQuery } from './query'

export const FETCHED_AT = 1_750_000_000_000
export const FIRST_POST_REQUEST_KEY = JSON.stringify({
  postId: 'first-post',
})

export const fixturePosts: ReadonlyArray<Post> = [
  {
    id: 'first-post',
    title: 'First Post',
    excerpt: 'The first fixture post.',
  },
  {
    id: 'second-post',
    title: 'Second Post',
    excerpt: 'The second fixture post.',
  },
]

export const firstPostDetail: PostDetail = {
  id: 'first-post',
  title: 'First Post',
  author: 'Grace Hopper',
  body: 'The whole body of the first fixture post.',
}

export const fixtureStats: Stats = {
  activeUsers: 120,
  requestsPerSecond: 1234,
  cacheHitRatePercent: 97,
}

const models = Effect.gen(function* () {
  let maybeLoadingPostsModel = Option.none<Model>()
  let maybeLoadedPostsModel = Option.none<Model>()
  let maybeFailedPostsModel = Option.none<Model>()
  let maybeCachedFirstPostModel = Option.none<Model>()
  let maybeFailedFirstPostModel = Option.none<Model>()
  let maybeLoadingStatsModel = Option.none<Model>()
  let maybeLoadedStatsModel = Option.none<Model>()
  let maybeRefreshingStatsModel = Option.none<Model>()
  const application = { block: ApplicationBlock, layer }

  yield* story(
    application,
    init(),
    model(model => {
      maybeLoadingPostsModel = Option.some(model)
    }),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      maybeLoadedPostsModel = Option.some(model)
    }),
  )

  yield* story(
    application,
    init(),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.fail('The server is down.'),
      }),
    ),
    model(model => {
      maybeFailedPostsModel = Option.some(model)
    }),
  )

  const loadedPostsModel = Option.getOrThrow(maybeLoadedPostsModel)
  const firstPostArgs = { postId: 'first-post' }

  yield* story(
    application,
    given(loadedPostsModel),
    message(Message.ClickedPost(firstPostArgs)),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: firstPostArgs,
        generation: 1,
        requestKey: FIRST_POST_REQUEST_KEY,
        result: Result.succeed({
          post: firstPostDetail,
          fetchedAt: FETCHED_AT,
        }),
      }),
    ),
    message(Message.ClickedBackToPosts()),
    model(model => {
      maybeCachedFirstPostModel = Option.some(model)
    }),
  )

  yield* story(
    application,
    given(loadedPostsModel),
    message(Message.ClickedPost(firstPostArgs)),
    Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: firstPostArgs,
        generation: 1,
        requestKey: FIRST_POST_REQUEST_KEY,
        result: Result.fail('The connection dropped.'),
      }),
    ),
    message(Message.ClickedBackToPosts()),
    model(model => {
      maybeFailedFirstPostModel = Option.some(model)
    }),
  )

  yield* story(
    application,
    given(modifyFields(loadedPostsModel, { activeTab: () => 'Stats' })),
    message(Message.ClickedRefreshStats()),
    model(model => {
      maybeLoadingStatsModel = Option.some(model)
    }),
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
      }),
    ),
    model(model => {
      maybeLoadedStatsModel = Option.some(model)
    }),
    message(Message.TickedStatsRefreshInterval()),
    model(model => {
      maybeRefreshingStatsModel = Option.some(model)
    }),
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        generation: 2,
        result: Result.fail('The server is down.'),
      }),
    ),
  )

  return {
    loadingPostsModel: Option.getOrThrow(maybeLoadingPostsModel),
    loadedPostsModel,
    failedPostsModel: Option.getOrThrow(maybeFailedPostsModel),
    cachedFirstPostModel: Option.getOrThrow(maybeCachedFirstPostModel),
    failedFirstPostModel: Option.getOrThrow(maybeFailedFirstPostModel),
    loadingStatsModel: Option.getOrThrow(maybeLoadingStatsModel),
    loadedStatsModel: Option.getOrThrow(maybeLoadedStatsModel),
    refreshingStatsModel: Option.getOrThrow(maybeRefreshingStatsModel),
  }
})

export const it = makeMethods(
  baseTest.extend<{ models: Effect.Success<typeof models> }>({
    models: async ({}, use) => {
      await Effect.runPromise(
        models.pipe(
          Effect.flatMap(models => Effect.promise(() => use(models))),
        ),
      )
    },
  }),
)
