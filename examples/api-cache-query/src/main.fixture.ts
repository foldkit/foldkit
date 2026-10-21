import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'

import type { Post, PostDetail, Stats } from './data'
import { Model, TABS_ID, postQuery, postsQuery, statsQuery } from './main'

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

const fetchedPosts = { posts: fixturePosts, fetchedAt: FETCHED_AT }
const fetchedStats = { stats: fixtureStats, fetchedAt: FETCHED_AT }
const firstPostArgs = { postId: 'first-post' }

export const loadingPostsModel = Model.make({
  tabs: Tabs.init({ id: TABS_ID }),
  activeTab: 'Posts',
  posts: postsQuery.seed(AsyncData.Loading()),
  postDetails: postQuery.init(),
  maybeSelectedPostId: Option.none(),
  stats: statsQuery.init(),
})

export const loadedPostsModel = modifyFields(loadingPostsModel, {
  posts: () => postsQuery.seed(AsyncData.Success({ data: fetchedPosts })),
})

export const failedPostsModel = modifyFields(loadingPostsModel, {
  posts: () =>
    postsQuery.seed(AsyncData.Failure({ error: 'The server is down.' })),
})

export const cachedFirstPostModel = modifyFields(loadedPostsModel, {
  postDetails: () =>
    postQuery.seed([
      {
        args: firstPostArgs,
        data: AsyncData.Success({
          data: { post: firstPostDetail, fetchedAt: FETCHED_AT },
        }),
      },
    ]),
})

export const failedFirstPostModel = modifyFields(loadedPostsModel, {
  postDetails: () =>
    postQuery.seed([
      {
        args: firstPostArgs,
        data: AsyncData.Failure({ error: 'The connection dropped.' }),
      },
    ]),
})

export const loadingStatsModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  stats: () => statsQuery.seed(AsyncData.Loading()),
})

export const loadedStatsModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  stats: () => statsQuery.seed(AsyncData.Success({ data: fetchedStats })),
})

export const refreshingStatsModel = modifyFields(loadedStatsModel, {
  stats: () => statsQuery.seed(AsyncData.Refreshing({ data: fetchedStats })),
})
