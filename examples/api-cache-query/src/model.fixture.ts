import { Option, Result } from 'effect'
import { modifyFields } from 'foldkit/struct'

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

const loadingPostsQueryModel = postsQuery.requestRevalidationOrLoad(
  postsQuery.init().model,
).model

export const loadingPostsModel = Model.make({
  tabs: AppTabsBlock.init({ id: TABS_ID }).model,
  activeTab: 'Posts',
  posts: loadingPostsQueryModel,
  postDetails: postQuery.init().model,
  maybeSelectedPostId: Option.none(),
  stats: statsQuery.init().model,
})

const loadedPostsQueryModel = postsQuery.update(
  loadingPostsQueryModel,
  postsQuery.Message.CompletedFetch({
    generation: loadingPostsQueryModel.generation,
    result: Result.succeed({ posts: fixturePosts, fetchedAt: FETCHED_AT }),
  }),
).model

export const loadedPostsModel = modifyFields(loadingPostsModel, {
  posts: () => loadedPostsQueryModel,
})

const failedPostsQueryModel = postsQuery.update(
  loadingPostsQueryModel,
  postsQuery.Message.CompletedFetch({
    generation: loadingPostsQueryModel.generation,
    result: Result.fail('The server is down.'),
  }),
).model

export const failedPostsModel = modifyFields(loadingPostsModel, {
  posts: () => failedPostsQueryModel,
})

const firstPostArgs = { postId: 'first-post' }
const loadingFirstPostQueryModel = postQuery.requestLoadIfMissing(
  postQuery.init().model,
  firstPostArgs,
).model
const loadedFirstPostQueryModel = postQuery.update(
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

export const cachedFirstPostModel = modifyFields(loadedPostsModel, {
  postDetails: () => loadedFirstPostQueryModel,
})

const failedFirstPostQueryModel = postQuery.update(
  loadingFirstPostQueryModel,
  postQuery.Message.CompletedFetch({
    args: firstPostArgs,
    generation: loadingFirstPostQueryModel.generation,
    requestKey: FIRST_POST_REQUEST_KEY,
    result: Result.fail('The connection dropped.'),
  }),
).model

export const failedFirstPostModel = modifyFields(loadedPostsModel, {
  postDetails: () => failedFirstPostQueryModel,
})

const loadingStatsQueryModel = statsQuery.requestRevalidationOrLoad(
  statsQuery.init().model,
).model

export const loadingStatsModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  stats: () => loadingStatsQueryModel,
})

const loadedStatsQueryModel = statsQuery.update(
  loadingStatsQueryModel,
  statsQuery.Message.CompletedFetch({
    generation: loadingStatsQueryModel.generation,
    result: Result.succeed({ stats: fixtureStats, fetchedAt: FETCHED_AT }),
  }),
).model

export const loadedStatsModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  stats: () => loadedStatsQueryModel,
})

const refreshingStatsQueryModel = statsQuery.requestRevalidation(
  loadedStatsQueryModel,
).model

export const refreshingStatsModel = modifyFields(loadedStatsModel, {
  stats: () => refreshingStatsQueryModel,
})
