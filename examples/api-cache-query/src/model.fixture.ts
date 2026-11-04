import { Effect, Option, Result } from 'effect'
import { Query } from 'foldkit/experimental'
import { withBlock } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import { makeMethods } from '@effect/vitest'
import { layer as TabsLayer } from '@foldkit/ui/tabs'

import type { Post, PostDetail, Stats } from './data'
import { AppTabsBlock, Model, TABS_ID } from './model'
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

const models = withBlock({ block: AppTabsBlock, layer: TabsLayer }, tabs =>
  withBlock({ block: postsQuery, layer: Query.layer }, posts =>
    withBlock({ block: postQuery, layer: Query.layer }, postDetails =>
      withBlock({ block: statsQuery, layer: Query.layer }, stats => {
        const loadingPostsQueryModel =
          posts.operations.requestRevalidationOrLoad(posts.init().model).model

        const loadingPostsModel = Model.make({
          tabs: tabs.init({ id: TABS_ID }).model,
          activeTab: 'Posts',
          posts: loadingPostsQueryModel,
          postDetails: postDetails.init().model,
          maybeSelectedPostId: Option.none(),
          stats: stats.init().model,
        })

        const loadedPostsQueryModel = posts.update(
          loadingPostsQueryModel,
          postsQuery.Message.CompletedFetch({
            generation: loadingPostsQueryModel.generation,
            result: Result.succeed({
              posts: fixturePosts,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ).model

        const loadedPostsModel = modifyFields(loadingPostsModel, {
          posts: () => loadedPostsQueryModel,
        })

        const failedPostsQueryModel = posts.update(
          loadingPostsQueryModel,
          postsQuery.Message.CompletedFetch({
            generation: loadingPostsQueryModel.generation,
            result: Result.fail('The server is down.'),
          }),
        ).model

        const failedPostsModel = modifyFields(loadingPostsModel, {
          posts: () => failedPostsQueryModel,
        })

        const firstPostArgs = { postId: 'first-post' }
        const loadingFirstPostQueryModel =
          postDetails.operations.requestLoadIfMissing(
            postDetails.init().model,
            firstPostArgs,
          ).model
        const loadedFirstPostQueryModel = postDetails.update(
          loadingFirstPostQueryModel,
          postQuery.Message.CompletedFetch({
            args: firstPostArgs,
            generation: loadingFirstPostQueryModel.generation,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.succeed({
              post: firstPostDetail,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ).model

        const cachedFirstPostModel = modifyFields(loadedPostsModel, {
          postDetails: () => loadedFirstPostQueryModel,
        })

        const failedFirstPostQueryModel = postDetails.update(
          loadingFirstPostQueryModel,
          postQuery.Message.CompletedFetch({
            args: firstPostArgs,
            generation: loadingFirstPostQueryModel.generation,
            requestKey: FIRST_POST_REQUEST_KEY,
            result: Result.fail('The connection dropped.'),
          }),
        ).model

        const failedFirstPostModel = modifyFields(loadedPostsModel, {
          postDetails: () => failedFirstPostQueryModel,
        })

        const loadingStatsQueryModel =
          stats.operations.requestRevalidationOrLoad(stats.init().model).model

        const loadingStatsModel = modifyFields(loadedPostsModel, {
          activeTab: () => 'Stats',
          stats: () => loadingStatsQueryModel,
        })

        const loadedStatsQueryModel = stats.update(
          loadingStatsQueryModel,
          statsQuery.Message.CompletedFetch({
            generation: loadingStatsQueryModel.generation,
            result: Result.succeed({
              stats: fixtureStats,
              fetchedAt: FETCHED_AT,
            }),
          }),
        ).model

        const loadedStatsModel = modifyFields(loadedPostsModel, {
          activeTab: () => 'Stats',
          stats: () => loadedStatsQueryModel,
        })

        const refreshingStatsQueryModel = stats.operations.requestRevalidation(
          loadedStatsQueryModel,
        ).model

        const refreshingStatsModel = modifyFields(loadedStatsModel, {
          stats: () => refreshingStatsQueryModel,
        })

        return {
          loadingPostsModel,
          loadedPostsModel,
          failedPostsModel,
          cachedFirstPostModel,
          failedFirstPostModel,
          loadingStatsModel,
          loadedStatsModel,
          refreshingStatsModel,
        }
      }),
    ),
  ),
)

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
