import { Effect, Result } from 'effect'
import { Story } from 'foldkit'
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

  const loadedPostsModel = yield* Story.story(
    application,
    Story.init(),
    Story.Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
      }),
    ),
  )

  const failedPostsModel = yield* Story.story(
    application,
    Story.init(),
    Story.Command.resolve(
      postsQuery.Fetch,
      postsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.fail('The server is down.'),
      }),
    ),
  )

  const firstPostArgs = { postId: 'first-post' }

  const cachedFirstPostModel = yield* Story.story(
    application,
    Story.given(loadedPostsModel),
    Story.message(Message.ClickedPost(firstPostArgs)),
    Story.Command.resolve(
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
    Story.message(Message.ClickedBackToPosts()),
  )

  const failedFirstPostModel = yield* Story.story(
    application,
    Story.given(loadedPostsModel),
    Story.message(Message.ClickedPost(firstPostArgs)),
    Story.Command.resolve(
      postQuery.Fetch,
      postQuery.Message.CompletedFetch({
        args: firstPostArgs,
        generation: 1,
        requestKey: FIRST_POST_REQUEST_KEY,
        result: Result.fail('The connection dropped.'),
      }),
    ),
    Story.message(Message.ClickedBackToPosts()),
  )

  const loadedStatsModel = yield* Story.story(
    application,
    Story.given(modifyFields(loadedPostsModel, { activeTab: () => 'Stats' })),
    Story.message(Message.ClickedRefreshStats()),
    Story.Command.resolve(
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
