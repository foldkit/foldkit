import { HashMap, Option } from 'effect'
import { AsyncData } from 'foldkit'
import type { Resolved } from 'foldkit/block'
import { modifyFields } from 'foldkit/struct'

import { type Application, TABS_ID } from './application'
import type { Post, PostDetail, Stats } from './domain/data'
import type { PostsTab } from './postsTab'
import type { StatsTab } from './statsTab'

export type FixtureModel = Resolved<typeof Application.Model.Type>
export type PostsTabFixtureModel = Resolved<typeof PostsTab.Model.Type>
export type StatsTabFixtureModel = Resolved<typeof StatsTab.Model.Type>

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

const queryModel = <A, E>(
  data: AsyncData.AsyncData<A, E>,
  generation: number,
) => ({ data, generation, maybeCompletedAtMillis: Option.none() })

const firstPostArgs = { postId: 'first-post' }

const postDetailsModel = (
  data: AsyncData.AsyncData<
    Readonly<{ post: PostDetail; fetchedAt: number }>,
    string
  >,
): PostsTabFixtureModel['postDetails'] => ({
  generation: 1,
  access: 0,
  entries: HashMap.make([
    FIRST_POST_REQUEST_KEY,
    {
      args: firstPostArgs,
      data,
      generation: 1,
      maybeCompletedAtMillis: Option.none(),
      lastAccess: 0,
    },
  ]),
})

export const loadingPostsTabModel: PostsTabFixtureModel = {
  posts: queryModel(AsyncData.Loading(), 1),
  postDetails: { generation: 0, access: 0, entries: HashMap.empty() },
  maybeSelectedPostId: Option.none(),
}

export const loadedPostsTabModel: PostsTabFixtureModel = modifyFields(
  loadingPostsTabModel,
  {
    posts: () =>
      queryModel(
        AsyncData.Success({
          data: { posts: fixturePosts, fetchedAt: FETCHED_AT },
        }),
        1,
      ),
  },
)

export const failedPostsTabModel: PostsTabFixtureModel = modifyFields(
  loadingPostsTabModel,
  {
    posts: () =>
      queryModel(AsyncData.Failure({ error: 'The server is down.' }), 1),
  },
)

export const failedFirstPostTabModel: PostsTabFixtureModel = modifyFields(
  loadedPostsTabModel,
  {
    postDetails: () =>
      postDetailsModel(AsyncData.Failure({ error: 'The connection dropped.' })),
  },
)

const loadedStats = { stats: fixtureStats, fetchedAt: FETCHED_AT }

export const loadingStatsTabModel: StatsTabFixtureModel = {
  stats: queryModel(AsyncData.Loading(), 1),
}

const loadedStatsTabModel: StatsTabFixtureModel = {
  stats: queryModel(AsyncData.Success({ data: loadedStats }), 1),
}

export const loadingPostsModel: FixtureModel = {
  tabs: {
    id: TABS_ID,
    maybeFocusedIndex: Option.none(),
    activationMode: 'Automatic',
  },
  activeTab: 'Posts',
  postsTab: loadingPostsTabModel,
  statsTab: { stats: queryModel(AsyncData.Idle(), 0) },
}

export const loadedPostsModel: FixtureModel = modifyFields(loadingPostsModel, {
  postsTab: () => loadedPostsTabModel,
})

export const cachedFirstPostModel: FixtureModel = modifyFields(
  loadedPostsModel,
  {
    postsTab: () =>
      modifyFields(loadedPostsTabModel, {
        postDetails: () =>
          postDetailsModel(
            AsyncData.Success({
              data: { post: firstPostDetail, fetchedAt: FETCHED_AT },
            }),
          ),
      }),
  },
)

export const loadedStatsModel: FixtureModel = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  statsTab: () => loadedStatsTabModel,
})

export const refreshingStatsModel: FixtureModel = modifyFields(
  loadedStatsModel,
  {
    statsTab: () => ({
      stats: queryModel(AsyncData.Refreshing({ data: loadedStats }), 2),
    }),
  },
)
