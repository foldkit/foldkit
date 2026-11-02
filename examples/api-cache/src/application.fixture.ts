import { HashMap, Option } from 'effect'
import type { Resolved } from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import { type Application, TABS_ID } from './application'
import type { Post, PostDetail, Stats } from './domain/data'
import { PostDetailData, PostsData, type PostsTab } from './postsTab'
import { StatsData, type StatsTab } from './statsTab'

export type ResolvedModel = Resolved<typeof Application.Model.Type>
export type ResolvedPostsTabModel = Resolved<typeof PostsTab.Model.Type>
export type ResolvedStatsTabModel = Resolved<typeof StatsTab.Model.Type>

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

export const loadingPostsTabModel: ResolvedPostsTabModel = {
  posts: PostsData.Loading(),
  postDetailById: HashMap.empty(),
  maybeSelectedPostId: Option.none(),
}

export const loadedPostsTabModel: ResolvedPostsTabModel = modifyFields(
  loadingPostsTabModel,
  {
    posts: () =>
      PostsData.Success({
        data: { posts: fixturePosts, fetchedAt: FETCHED_AT },
      }),
  },
)

export const idleStatsTabModel: ResolvedStatsTabModel = {
  stats: StatsData.Idle(),
}

export const loadedStatsTabModel: ResolvedStatsTabModel = {
  stats: StatsData.Success({
    data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
  }),
}

export const loadingPostsModel: ResolvedModel = {
  tabs: {
    id: TABS_ID,
    maybeFocusedIndex: Option.none(),
    activationMode: 'Automatic',
  },
  activeTab: 'Posts',
  postsTab: loadingPostsTabModel,
  statsTab: idleStatsTabModel,
}

export const loadedPostsModel: ResolvedModel = modifyFields(loadingPostsModel, {
  postsTab: () => loadedPostsTabModel,
})

export const cachedFirstPostModel: ResolvedModel = modifyFields(
  loadedPostsModel,
  {
    postsTab: () =>
      modifyFields(loadedPostsTabModel, {
        postDetailById: () =>
          HashMap.set(
            HashMap.empty(),
            'first-post',
            PostDetailData.Success({
              data: { detail: firstPostDetail, fetchedAt: FETCHED_AT },
            }),
          ),
      }),
  },
)

export const loadedStatsModel: ResolvedModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  statsTab: () => loadedStatsTabModel,
})
