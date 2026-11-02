import { Effect, HashMap, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import type { Post, PostDetail, Stats } from './data'
import { AppLayer } from './layer'
import {
  ApplicationTabsBlock,
  type Model,
  PostDetailData,
  PostsData,
  StatsData,
  TABS_ID,
} from './model'

export const FETCHED_AT = 1_750_000_000_000

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
  const tabs = yield* ApplicationTabsBlock.get

  const loadingPostsModel: Model = {
    tabs: tabs.init({ id: TABS_ID }).model,
    activeTab: 'Posts',
    posts: PostsData.Loading(),
    postDetailById: HashMap.empty(),
    maybeSelectedPostId: Option.none(),
    stats: StatsData.Idle(),
  }

  const loadedPostsModel: Model = modifyFields(loadingPostsModel, {
    posts: () =>
      PostsData.Success({
        data: { posts: fixturePosts, fetchedAt: FETCHED_AT },
      }),
  })

  const cachedFirstPostModel: Model = modifyFields(loadedPostsModel, {
    postDetailById: () =>
      HashMap.set(
        HashMap.empty(),
        'first-post',
        PostDetailData.Success({
          data: { detail: firstPostDetail, fetchedAt: FETCHED_AT },
        }),
      ),
  })

  const loadedStatsModel: Model = modifyFields(loadedPostsModel, {
    activeTab: () => 'Stats',
    stats: () =>
      StatsData.Success({
        data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
      }),
  })

  return {
    loadingPostsModel,
    loadedPostsModel,
    cachedFirstPostModel,
    loadedStatsModel,
  }
}).pipe(Effect.scoped, Effect.provide(AppLayer))

export const test = baseTest.extend<{ models: Effect.Success<typeof models> }>({
  models: async ({}, use) => {
    await Effect.runPromise(
      models.pipe(Effect.flatMap(models => Effect.promise(() => use(models)))),
    )
  },
})
