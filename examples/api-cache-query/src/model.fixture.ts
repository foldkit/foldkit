import { Effect, Result } from 'effect'
import { Story } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

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

const application = { block: ApplicationBlock, layer }

const loadedPostsModel = Story.story(
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

const failedPostsModel = Story.story(
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

const cachedFirstPostModel = Effect.gen(function* () {
  const loadedPosts = yield* loadedPostsModel

  return yield* Story.story(
    application,
    Story.given(loadedPosts),
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
})

const failedFirstPostModel = Effect.gen(function* () {
  const loadedPosts = yield* loadedPostsModel

  return yield* Story.story(
    application,
    Story.given(loadedPosts),
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
})

const loadedStatsModel = Effect.gen(function* () {
  const loadedPosts = yield* loadedPostsModel

  return yield* Story.story(
    application,
    Story.given(modifyFields(loadedPosts, { activeTab: () => 'Stats' })),
    Story.message(Message.ClickedRefreshStats()),
    Story.Command.resolve(
      statsQuery.Fetch,
      statsQuery.Message.CompletedFetch({
        generation: 1,
        result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
      }),
    ),
  )
})

export const fixtureEffects = {
  loadedPostsModel,
  failedPostsModel,
  cachedFirstPostModel,
  failedFirstPostModel,
  loadedStatsModel,
}
