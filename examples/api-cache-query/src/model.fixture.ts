import { Effect, Result } from 'effect'
import { Command, given, init, message, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import { makeMethods } from '@effect/vitest'

import type { Post, PostDetail, Stats } from './data'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
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
  const application = { block: ApplicationBlock, layer }

  const loadedPostsModel = yield* story(
    application,
    init(),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
      }),
    ),
  )

  const failedPostsModel = yield* story(
    application,
    init(),
    Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.fail('The server is down.'),
      }),
    ),
  )

  const firstPostArgs = { postId: 'first-post' }

  const cachedFirstPostModel = yield* story(
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
  )

  const failedFirstPostModel = yield* story(
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
  )

  const loadedStatsModel = yield* story(
    application,
    given(modifyFields(loadedPostsModel, { activeTab: () => 'Stats' })),
    message(Message.ClickedRefreshStats()),
    Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
      }),
    ),
  )

  return {
    loadedPostsModel,
    failedPostsModel,
    cachedFirstPostModel,
    failedFirstPostModel,
    loadedStatsModel,
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
