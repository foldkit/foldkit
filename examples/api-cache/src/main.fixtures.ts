import { Tabs } from '@foldkit/ui'
import { HashMap, Option } from 'effect'

import type { Post, PostDetail, Stats } from './data'
import type { Model } from './main'
import { PostDetailData, PostsData, StatsData, TABS_ID } from './main'

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

export const loadingPostsModel: Model = {
  tabs: Tabs.init({ id: TABS_ID }),
  activeTab: 'Posts',
  posts: PostsData.Loading(),
  postDetailById: HashMap.empty(),
  maybeSelectedPostId: Option.none(),
  stats: StatsData.NotAsked(),
}

export const loadedPostsModel: Model = {
  ...loadingPostsModel,
  posts: PostsData.Ok({ data: fixturePosts, fetchedAt: FETCHED_AT }),
}

export const cachedFirstPostModel: Model = {
  ...loadedPostsModel,
  postDetailById: HashMap.set(
    HashMap.empty(),
    'first-post',
    PostDetailData.Ok({ data: firstPostDetail, fetchedAt: FETCHED_AT }),
  ),
}

export const loadedStatsModel: Model = {
  ...loadedPostsModel,
  tabs: Tabs.init({ id: TABS_ID, activeIndex: 1 }),
  activeTab: 'Stats',
  stats: StatsData.Ok({ data: fixtureStats, fetchedAt: FETCHED_AT }),
}
