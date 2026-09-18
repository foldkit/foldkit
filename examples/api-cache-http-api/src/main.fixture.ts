import { HashMap, Option, Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'

import type { Post, PostDetail, Stats } from './data'
import type { Model } from './main'
import { TABS_ID, postDetailQuery, statsQuery } from './main'

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
  posts: AsyncData.Loading(),
  postDetailById: postDetailQuery.init(),
  maybeSelectedPostId: Option.none(),
  stats: statsQuery.init(),
}

export const loadedPostsModel: Model = modifyFields(loadingPostsModel, {
  posts: () =>
    AsyncData.Success({
      data: { posts: fixturePosts, fetchedAt: FETCHED_AT },
    }),
})

const encodeKey = Schema.Struct({
  params: Schema.Struct({ postId: Schema.String }),
}).pipe(Schema.toCodecJson, Schema.fromJsonString, Schema.encodeUnknownSync)

const firstPostArgs = { params: { postId: 'first-post' } }

export const cachedFirstPostModel: Model = modifyFields(loadedPostsModel, {
  postDetailById: () =>
    HashMap.set(postDetailQuery.init(), encodeKey(firstPostArgs), {
      args: firstPostArgs,
      data: AsyncData.Success({
        data: { detail: firstPostDetail, fetchedAt: FETCHED_AT },
      }),
    }),
})

export const loadedStatsModel: Model = modifyFields(loadedPostsModel, {
  activeTab: () => 'Stats',
  stats: () =>
    AsyncData.Success({
      data: { stats: fixtureStats, fetchedAt: FETCHED_AT },
    }),
})
